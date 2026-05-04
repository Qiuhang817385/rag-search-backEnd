import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';

const redisOptions = {
  username: 'default',
  password: 'MxOPzVtdJUCrWeb2pri1yq7qAsGkHhlm',
  host: 'redis-19662.c295.ap-southeast-1-1.ec2.cloud.redislabs.com',
  port: 19662,
};

@Injectable()
export class SessionService {
  private redis = new Redis(redisOptions);

  async create(userId: string, userAgent?: string): Promise<string> {
    const sid = randomUUID();
    const payload = JSON.stringify({
      userId,
      userAgent,
      createdAt: Date.now(),
    });

    await this.redis.setex(`session:${sid}`, 7200, payload);

    return sid;
  }

  async get(sid: string): Promise<{ userId: string } | null> {
    const data = await this.redis.get(`session:${sid}`);
    return data ? JSON.parse(data) : null;
  }

  async destroy(sid: string): Promise<void> {
    await this.redis.del(`session:${sid}`);
  }

  /** 续期（活跃用户的 Session 刷新 TTL） */
  async touch(sid: string): Promise<void> {
    await this.redis.expire(`session:${sid}`, 7200);
  }
}
