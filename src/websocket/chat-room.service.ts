import { Injectable, Logger } from '@nestjs/common';
import { WebSocket } from 'ws';

export interface ChatClientMeta {
  nickname: string;
  roomId: string;
}

/**
 * 内存 Mock：房间 / 在线列表 / 广播。进程重启或横向多实例时数据会丢，生产需 Redis 等。
 */
@Injectable()
export class ChatRoomService {
  private readonly logger = new Logger(ChatRoomService.name);
  private readonly meta = new Map<WebSocket, ChatClientMeta>();
  private readonly rooms = new Map<string, Set<WebSocket>>();

  join(ws: WebSocket, roomId: string, nickname: string) {
    const rid = roomId.trim() || 'lobby';
    this.leave(ws); // 先离开之前的房间（如果有），确保一个连接只在一个房间内
    if (!this.rooms.has(rid)) {
      this.rooms.set(rid, new Set());
    }
    this.rooms.get(rid)!.add(ws);
    this.meta.set(ws, { roomId: rid, nickname: nickname.trim() || '匿名' });
    this.logger.debug(`join room=${rid} clients=${this.rooms.get(rid)!.size}`);
  }

  leave(ws: WebSocket) {
    const m = this.meta.get(ws);
    if (!m) return;
    this.meta.delete(ws);
    const set = this.rooms.get(m.roomId);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) {
      this.rooms.delete(m.roomId);
    }
  }

  getMeta(ws: WebSocket): ChatClientMeta | undefined {
    return this.meta.get(ws);
  }

  /** 向房间内除 optional 排除外的所有连接推送一条 JSON */
  broadcast(
    roomId: string,
    payload: Record<string, unknown>,
    except?: WebSocket,
  ) {
    const set = this.rooms.get(roomId);
    if (!set) return;
    const body = JSON.stringify(payload);
    for (const ws of set) {
      if (except && ws === except) continue;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(body);
      }
    }
  }

  roomSize(roomId: string): number {
    return this.rooms.get(roomId)?.size ?? 0;
  }
}
