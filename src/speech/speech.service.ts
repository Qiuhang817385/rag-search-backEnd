import { Injectable } from '@nestjs/common';
import { WebSocket } from 'ws';
import { WhisperCliService } from './whisper.service';
import { SubscribeMessage } from '@nestjs/websockets';
import { AsrService } from './asr.service';

/** Worklet 约 128 samples/帧 @16kHz → ~125 帧/秒；约每 160 帧触发一次 interim（~1.3s），避免每秒十几次 Whisper */
const INTERIM_EVERY_N_FRAMES = 160;

@Injectable()
export class SpeechService {
  private sessions = new Map<
    WebSocket,
    {
      frameCount: number;
      /** 从按住到松手的完整 PCM 累积，不在 interim 后清空；每次 Whisper 都对「整段」识别，避免分段拼接出现「你好呀」+「你好呀小姐姐」 */
      chunks: Buffer[];
      transcribing: boolean;
    }
  >();

  constructor(
    private readonly whisperService: WhisperCliService,
    private readonly asrService: AsrService,
  ) {}

  /** 连接建立时创建会话，否则 processAudio 会因无 session 直接丢弃数据 */
  ensureSession(client: WebSocket) {
    if (!this.sessions.has(client)) {
      this.sessions.set(client, {
        frameCount: 0,
        chunks: [],
        transcribing: false,
      });
    }
  }

  cleanup(client: WebSocket) {
    this.sessions.delete(client);
  }

  @SubscribeMessage('audio-chunk')
  async processAudio(client: WebSocket, data: Buffer) {
    let session = this.sessions.get(client);

    // console.log('session', session);

    if (!session) return;

    // if (!session) {
    //   // session 不存在，初始化
    //   session = { transcript: '你好，我是AI语音助手', frameCount: 0 };
    //   this.sessions.set(client, session);
    //   setTimeout(() => {
    //     if (client.readyState === WebSocket.OPEN) {
    //       client.send(
    //         JSON.stringify({ type: 'interim', text: '你好，我是AI语音助手' }),
    //       );
    //     }
    //   }, 200);
    //   return;
    // }

    session.chunks.push(data);
    session.frameCount++;

    if (session.frameCount % INTERIM_EVERY_N_FRAMES === 0) {
      void this.runFullBufferTranscribe(client, session, 'interim');
    }
  }

  /** 对当前会话已收到的全部 PCM 做一次识别；分段各自识别再拼接会在句边界重复（如「你好呀」+「你好呀小姐姐」） */
  private async runFullBufferTranscribe(
    client: WebSocket,
    session: {
      frameCount: number;
      chunks: Buffer[];
      transcribing: boolean;
    },
    mode: 'interim' | 'final',
  ): Promise<void> {
    if (session.transcribing) return;
    const mergedBuffer = Buffer.concat(session.chunks);
    if (mergedBuffer.length === 0) return;

    session.transcribing = true;

    // 此处是调用了 whisper 的 service
    try {
      // const text = (await this.whisperService.transcribe(mergedBuffer)).trim();
      const text = (
        await this.asrService.transcribeStream(
          mergedBuffer,
          {
            modelType: process.env.GRADIO_ASR_MODEL ?? 'Qwen3-ASR-1.7B',
            hotWords: process.env.GRADIO_ASR_HOTWORDS ?? '',
          },
          false,
        )
      ).text.trim();
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: mode, text }));
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
    } finally {
      session.transcribing = false;
    }
  }

  /** 松手：对整段录音再识别一次发 final（与 interim 同一策略，避免尾段再拼一层重复） */
  async finalize(client: WebSocket) {
    const session = this.sessions.get(client);
    if (!session) return;

    // 与正在进行的 interim Whisper 串行，避免 transcribing 时直接 return 导致不发 final
    const deadline = Date.now() + 60_000;
    while (session.transcribing && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 30));
    }

    if (Buffer.concat(session.chunks).length === 0) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'final', text: '' }));
      }
      this.sessions.delete(client);
      return;
    }

    await this.runFullBufferTranscribe(client, session, 'final');
    session.chunks = [];
    this.sessions.delete(client);
  }
}
