import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import { ChatRoomService } from './chat-room.service';

type JoinPayload = { roomId?: string; nickname?: string };
type ChatPayload = { roomId?: string; text?: string };

@WebSocketGateway({ path: '/ws' })
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(private readonly chatRoom: ChatRoomService) {}

  handleConnection(client: WebSocket) {
    this.logger.log(`connected`);
  }

  handleDisconnect(client: WebSocket) {
    const meta = this.chatRoom.getMeta(client);
    this.chatRoom.leave(client);
    if (meta) {
      this.chatRoom.broadcast(meta.roomId, {
        type: 'system',
        text: `${meta.nickname} 离开房间`,
        ts: Date.now(),
      });
    }
    this.logger.log(`disconnected`);
  }

  /** 加入房间（必须先 join，chat 才会带上昵称与房间） */
  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload: JoinPayload,
  ) {
    const roomId = payload?.roomId ?? 'lobby';
    const nickname =
      payload?.nickname?.trim() ||
      `访客-${Math.random().toString(36).slice(2, 8)}`;
    this.chatRoom.join(client, roomId, nickname);
    this.chatRoom.broadcast(roomId, {
      type: 'system',
      text: `${nickname} 进入房间`,
      ts: Date.now(),
    });
    return { ok: true, roomId, nickname };
  }

  /** 房间内广播聊天消息 */
  @SubscribeMessage('chat')
  handleChat(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload: ChatPayload,
  ) {
    const meta = this.chatRoom.getMeta(client);
    const roomId = payload?.roomId ?? meta?.roomId ?? 'lobby';
    const text = payload?.text?.trim();
    if (!text) {
      return { ok: false, error: 'empty' };
    }
    const nickname = meta?.nickname ?? '匿名';
    this.chatRoom.broadcast(roomId, {
      type: 'chat',
      nickname,
      text,
      ts: Date.now(),
    });
    return { ok: true };
  }

  /** Mock：心跳/探活，可按需扩展 */
  @SubscribeMessage('ping')
  handlePing() {
    return { type: 'pong', ts: Date.now() };
  }
}
