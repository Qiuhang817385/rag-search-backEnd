import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';
import { MessageDto } from 'src/chat/dto/chat.dto';

@Injectable()
export class CacheService {
  private cache: LRUCache<string, MessageDto[]>;

  constructor() {
    this.cache = new LRUCache<string, MessageDto[]>({
      max: 500, // 最多 500 个会话
      maxSize: 50 * 1024 * 1024, // 总内存限制 50MB 左右
      sizeCalculation: (value) => {
        // 简单估算每个会话的内存占用
        return JSON.stringify(value).length * 2; // utf-16 字节数
      },
      ttl: 1000 * 60 * 60 * 24, // 24 小时过期
    });
  }

  get(sessionId: string): MessageDto[] | undefined {
    return this.cache.get(sessionId);
  }

  set(sessionId: string, history: MessageDto[]): void {
    this.cache.set(sessionId, history);
  }
}
