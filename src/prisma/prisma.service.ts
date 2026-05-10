import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    // 本地仅跑语音/WebSocket 等、云端库不可达时可在 .env 设 PRISMA_SKIP_CONNECT=true（访问 DB 的接口仍会失败）
    if (process.env.PRISMA_SKIP_CONNECT === 'true') {
      this.logger.warn(
        '已跳过 Prisma $connect（PRISMA_SKIP_CONNECT=true）；需要数据库的接口不可用',
      );
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
