import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { readFile } from 'fs/promises';
import { spawn } from 'child_process';
import { pcm16leMonoToWav } from './whisper.service';

@Injectable()
export class AsrService {
  private readonly GRADIO_URL =
    process.env.GRADIO_URL || 'http://localhost:7861';

  private tmpDir: string;

  constructor() {
    this.tmpDir = path.join(os.tmpdir(), 'qwen-asr-ws');
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true });
    }
  }

  /**
   * 转写音频流
   * @param audioData PCM 16kHz 音频数据
   * @param options 转写选项
   * @param isEnd 是否是最后一段
   */
  async transcribeStream(
    audioData: Buffer,
    options: {
      modelType: string;
      hotWords: string;
    },
    isEnd: boolean,
  ): Promise<{ text: string }> {
    // 1. 将 PCM 保存为临时 WAV 文件
    const tempFile = path.join(this.tmpDir, `audio_${Date.now()}.wav`);
    await pcm16leMonoToWav(audioData, tempFile);

    try {
      // 2. 调用 Gradio HTTP 接口
      const result = await this.callGradioApi(tempFile, options);

      // 3. 删除临时文件
      fs.unlinkSync(tempFile);

      return { text: result.text };
    } catch (error) {
      // 确保清理临时文件
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      throw error;
    }
  }

  /**
   * Gradio 只允许「通过 /upload 进入缓存」的路径；不能直接传 Nest 本地临时路径。
   * @see https://www.gradio.app/guides/querying-gradio-apps-with-curl
   */
  private async uploadWavToGradio(localPath: string): Promise<{
    path: string;
    meta: { _type: string };
  }> {
    const buf = await readFile(localPath);
    const base = this.GRADIO_URL.replace(/\/$/, '');
    const buildForm = () => {
      const form = new FormData();
      form.append(
        'files',
        new Blob([buf], { type: 'audio/wav' }),
        path.basename(localPath),
      );
      return form;
    };

    let res = await fetch(`${base}/gradio_api/upload`, {
      method: 'POST',
      body: buildForm(),
    });
    if (res.status === 404) {
      res = await fetch(`${base}/upload`, {
        method: 'POST',
        body: buildForm(),
      });
    }

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Gradio upload failed: HTTP ${res.status} ${t}`);
    }

    const json = (await res.json()) as unknown;
    let fileRef: string | { path?: string; url?: string } | undefined;

    if (Array.isArray(json) && json.length > 0) {
      fileRef = json[0] as string | { path?: string; url?: string };
    }

    let uploadPath: string | undefined;
    if (typeof fileRef === 'string') {
      uploadPath = fileRef;
    } else if (fileRef && typeof fileRef === 'object') {
      uploadPath = fileRef.path ?? fileRef.url;
    }

    if (!uploadPath) {
      throw new Error(
        `Gradio upload unexpected response: ${JSON.stringify(json)}`,
      );
    }

    return {
      path: uploadPath,
      meta: { _type: 'gradio.FileData' },
    };
  }

  /**
   * 调用 Gradio HTTP API
   */
  private async callGradioApi(
    audioPath: string,
    options: { modelType: string; hotWords: string },
  ): Promise<{ text: string }> {
    const fileData = await this.uploadWavToGradio(audioPath);

    // 1. 发起转写请求（文件必须先 upload，否则会 InvalidPathError）
    const eventRes = await fetch(`${this.GRADIO_URL}/gradio_api/call/do_text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          fileData,
          null,
          '音频',
          '文本',
          options.hotWords,
          options.modelType,
        ],
      }),
    });

    if (!eventRes.ok) {
      throw new Error(`Gradio API error: ${eventRes.status}`);
    }

    const eventBody = (await eventRes.json()) as { event_id?: string };
    const event_id = eventBody.event_id;
    if (!event_id) {
      throw new Error(
        `Gradio API did not return event_id: ${JSON.stringify(eventBody)}`,
      );
    }

    // 2. 轮询获取结果（GET 返回 SSE，而非 application/json）
    const result = await this.pollResult(event_id, 30);

    return { text: result.text };
  }

  /**
   * Gradio 异步调用：GET /call/{fn}/{event_id} 返回 text/event-stream，
   * 形如 event: complete \\n data: [...] 或 event: error \\n data: {...}
   */
  private parseGradioPollResponse(raw: string): {
    text?: string;
    error?: string;
    pending: boolean;
  } {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { pending: true };
    }

    // 少数部署可能直接返回 JSON
    if (trimmed.startsWith('{')) {
      try {
        const data = JSON.parse(trimmed) as { data?: unknown[] };
        if (data?.data?.[0] != null) {
          const v = data.data[0];
          return {
            text: typeof v === 'string' ? v : String(v),
            pending: false,
          };
        }
      } catch {
        /* 按 SSE 处理 */
      }
    }

    if (trimmed.includes('event:')) {
      return this.parseGradioSse(trimmed);
    }

    return { pending: true };
  }

  private parseGradioSse(body: string): {
    text?: string;
    error?: string;
    pending: boolean;
  } {
    const blocks = body.split(/\r?\n\r?\n/).filter((b) => b.trim());
    for (const block of blocks) {
      let eventName = '';
      const dataLines: string[] = [];
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
      const dataStr = dataLines.join('\n');
      if (!dataStr) continue;

      if (eventName === 'error') {
        return { error: this.formatGradioErrorData(dataStr), pending: false };
      }

      if (eventName === 'complete') {
        try {
          const payload = JSON.parse(dataStr) as unknown;
          const text = this.extractTextFromGradioOutput(payload);
          if (text !== undefined) {
            return { text, pending: false };
          }
        } catch {
          /* 继续其他 block */
        }
      }
    }
    return { pending: true };
  }

  /** SSE data 可能是 null、字符串 traceback、或 { message } */
  private formatGradioErrorData(dataStr: string): string {
    const trimmed = dataStr.trim();
    if (trimmed === '' || trimmed === 'null') {
      return 'Gradio ASR error (empty response; see Gradio server stderr for traceback)';
    }
    try {
      const errPayload = JSON.parse(trimmed) as unknown;
      if (errPayload === null) {
        return 'Gradio ASR error (null); check Gradio logs';
      }
      if (typeof errPayload === 'string') {
        return errPayload;
      }
      if (typeof errPayload === 'object' && errPayload !== null) {
        const o = errPayload as { message?: unknown; error?: unknown };
        const m = o.message ?? o.error;
        if (m != null && String(m).length > 0) {
          return String(m);
        }
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }

  private extractTextFromGradioOutput(payload: unknown): string | undefined {
    if (typeof payload === 'string') {
      return payload;
    }
    if (Array.isArray(payload) && payload.length > 0) {
      const first = payload[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object' && 'value' in first) {
        return String((first as { value: unknown }).value);
      }
    }
    if (payload && typeof payload === 'object') {
      const o = payload as Record<string, unknown>;
      if (Array.isArray(o.data) && o.data[0] != null) {
        const v = o.data[0];
        return typeof v === 'string' ? v : String(v);
      }
      const output = o.output;
      if (output && typeof output === 'object') {
        const out = output as { data?: unknown[] };
        if (Array.isArray(out.data) && out.data[0] != null) {
          const v = out.data[0];
          return typeof v === 'string' ? v : String(v);
        }
      }
    }
    return undefined;
  }

  /**
   * 轮询 Gradio 结果
   */
  private async pollResult(
    eventId: string,
    maxAttempts: number,
  ): Promise<{ text: string }> {
    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(
        `${this.GRADIO_URL}/gradio_api/call/do_text/${eventId}`,
      );

      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      const raw = await res.text();
      const parsed = this.parseGradioPollResponse(raw);

      if (parsed.error != null && parsed.error !== '') {
        throw new Error(parsed.error);
      }
      if (parsed.text !== undefined) {
        return { text: parsed.text };
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    throw new Error('Timeout waiting for transcription result');
  }
}
