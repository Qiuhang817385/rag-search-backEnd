import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
  WebSocketGateway,
  MessageBody,
} from '@nestjs/websockets';
import { SpeechService } from './speech.service';
import { Server, WebSocket } from 'ws';
import { WhisperCliService } from './whisper.service';

@WebSocketGateway({ path: '/speech' })
export class SpeechGateway {
  @WebSocketServer()
  server: Server;

  private clients = new Map<WebSocket, { lastChunk: number }>();

  constructor(private readonly speechService: SpeechService) {}

  handleConnection(client: WebSocket) {
    console.log('client');
    console.log('client connected');
    this.clients.set(client, { lastChunk: 0 });
    this.speechService.ensureSession(client);
    // 前端：文本帧发 JSON（如 end），二进制帧发 PCM；勿用首字节 0x7b 判断，音频样本可能恰好为 '{'
    client.on('message', (data: Buffer, isBinary: boolean) => {
      try {
        if (!isBinary) {
          const msg = JSON.parse(data.toString());
          // if(msg.type === 'start') {
          //   this.speechService.start(client);
          // } else if(msg.type === 'stop') {
          //   this.speechService.stop(client);
          // }

          // msg { type: 'end' }

          if (msg.type === 'end') {
            void this.speechService.finalize(client);
          }
          return;
        }

        // 音频二进制帧（实际应是 PCM）
        this.speechService.processAudio(client, data as Buffer);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
  }

  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
    this.speechService.cleanup(client);
  }
}
