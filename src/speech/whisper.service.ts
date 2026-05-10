import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { writeFile, readFile, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

/** 与前端 AudioContext({ sampleRate: 16000 }) / Int16 PCM 单声道一致 */
const SAMPLE_RATE = 16000;

/** 裸 s16le PCM 包一层最小 WAV 头，否则 ffmpeg 会把文件当损坏的 WAV（Invalid data found when processing input） */
export function pcm16leMonoToWav(pcm: Buffer, outputPath?: string): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = SAMPLE_RATE * blockAlign;
  const dataSize = pcm.length;
  const riffChunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(riffChunkSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  const wavFile = Buffer.concat([header, pcm]);
  if (outputPath) {
    fs.writeFileSync(outputPath, wavFile);
  }
  return wavFile;
}

@Injectable()
export class WhisperCliService {
  private readonly logger = new Logger(WhisperCliService.name);
  // 你的 Whisper 可执行文件路径，例如
  // const WHISPER_PATH = 'C:/Users/用户名/AppData/Local/Programs/Python/Python311/Scripts/whisper.exe';
  private readonly WHISPER_PATH: string;
  constructor() {
    this.WHISPER_PATH = 'C:/Python310/Scripts/whisper.exe';
  }

  async transcribe(pcmBuffer: Buffer): Promise<string> {
    const tempDir = await mkdtemp(join(tmpdir(), `whisper-${uuidv4()}-`));
    const audioPath = join(tempDir, 'audio.wav');
    await writeFile(audioPath, pcm16leMonoToWav(pcmBuffer));

    const args = [
      audioPath,
      '--model',
      'base', // 你可以替换为 small, medium 等你本地已下载的模型
      '--output_format',
      'txt',
      '--output_dir',
      tempDir,
      '--language',
      'zh',
    ];

    await new Promise<void>((resolve, reject) => {
      execFile(this.WHISPER_PATH, args, (error, stdout, stderr) => {
        if (error) {
          this.logger.error(`Whisper 执行错误: ${stderr || error.message}`);
          reject(error);
          return;
        }
        resolve();
      });
    });

    // CLI 把转写写到 output_dir 下，与输入文件同名 .txt，stdout 通常不是正文
    const txtPath = join(tempDir, 'audio.txt');
    const text = (await readFile(txtPath, 'utf8')).trim();
    return text;
  }
}
