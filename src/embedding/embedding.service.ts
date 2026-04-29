import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import OpenAI from 'openai';

/**
 * 与前端 OpenAIModel 对齐：使用官方 OpenAI SDK，从环境变量读取模型与兼容网关。
 * 环境变量见项目根目录 `.env`（EMBEDDING_MODEL、BASE_URL、DIMENSIONS、EMBEDDING_APIKEY）。
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly dimensions?: number;

  constructor() {
    const apiKey =
      process.env.EMBEDDING_APIKEY ?? process.env.OPENAI_API_KEY ?? '';
    const baseURL = process.env.BASE_URL;

    this.client = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });

    this.model =
      process.env.EMBEDDING_MODEL ?? 'text-embedding-ada-002';

    const rawDim = process.env.DIMENSIONS;
    if (rawDim !== undefined && rawDim !== '') {
      const n = parseInt(rawDim, 10);
      if (!Number.isNaN(n)) {
        this.dimensions = n;
      }
    }
  }

  /**
   * 对单段文本生成 embedding 向量（与前端 `embed(string)` 行为一致）。
   */
  async embed(text: string): Promise<number[]> {
    const input = typeof text === 'string' ? text.trim() : '';
    if (!input) {
      throw new BadRequestException('text 不能为空');
    }

    const apiKey =
      process.env.EMBEDDING_APIKEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        '未配置 EMBEDDING_APIKEY 或 OPENAI_API_KEY',
      );
    }

    try {
      const params: OpenAI.Embeddings.EmbeddingCreateParams = {
        model: this.model,
        input,
      };
      if (this.dimensions !== undefined) {
        params.dimensions = this.dimensions;
      }

      const resp = await this.client.embeddings.create(params);
      const row = resp.data[0];
      if (!row?.embedding?.length) {
        throw new Error('embedding 响应为空');
      }
      return row.embedding;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`embeddings.create 失败: ${msg}`);
      throw new InternalServerErrorException(`Embedding 请求失败: ${msg}`);
    }
  }
}
