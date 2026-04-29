import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { EmbedRequestDto } from './dto/embed-request.dto';
import { EmbeddingService } from './embedding.service';

/** 完整路径前缀：`/api`（见 main.ts `setGlobalPrefix`） */
@Controller('embedding')
export class EmbeddingController {
  constructor(private readonly embeddingService: EmbeddingService) {}

  /**
   * POST /api/embedding
   * body: { "text": "..." }
   * 返回: { "embedding": number[], "dimensions": number }
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() body: EmbedRequestDto) {
    const embedding = await this.embeddingService.embed(body.text);
    return {
      embedding,
      dimensions: embedding.length,
      model: process.env.EMBEDDING_MODEL ?? 'text-embedding-ada-002',
    };
  }
}
