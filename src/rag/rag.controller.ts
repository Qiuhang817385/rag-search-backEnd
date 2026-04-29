import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatRequestDto } from './dto/chat-request.dto';
import { SearchRequestDto } from './dto/search-request.dto';
import { RagService } from './rag.service';

/** 完整路径前缀：`/api`（main.ts `setGlobalPrefix`） */
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  /**
   * POST /api/rag/search
   * Body: { query: string, topK?: number, documentId?: string }
   */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  search(@Body() body: SearchRequestDto) {
    return this.ragService.search(body);
  }

  /**
   * POST /api/rag/chat
   * SSE：`text/event-stream`，各行 `data: {JSON}\n\n`
   * 首包 meta（检索摘要），随后 token，最后 done；错误为 `{type:"error",...}`
   */
  @Post('chat')
  async chat(
    @Body() body: ChatRequestDto,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      for await (const line of this.ragService.chatSseLines(body)) {
        res.write(`data: ${line}\n\n`);
      }
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) {
        res.status(500).json({ message });
        return;
      }
      res.write(
        `data: ${JSON.stringify({ type: 'error', message })}\n\n`,
      );
      res.end();
    }
  }
}
