import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
import { Prisma } from '@prisma/client';
import { EmbeddingService } from '../embedding/embedding.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { SearchRequestDto } from './dto/search-request.dto';
import { buildContextFromHits, RAG_SYSTEM_INSTRUCTION } from './prompt';
import { cosineSimilarity, parseEmbeddingJson } from './similarity';
import { parseStreamPartsFromChunk } from './stream-utils';
import type { SearchHit } from './types';

export type { SearchHit } from './types';

const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 20;

export type RetrieveResult = {
  hits: SearchHit[];
  dimensions: number;
  totalChunksCompared: number;
};

@Injectable()
export class RagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * 检索核心：向量化 query → 全库或按 documentId 过滤 → 余弦相似度 topK
   * search / 流式 chat 共用。
   */
  async retrieveTopK(
    queryText: string,
    topK: number,
    documentId?: string | null,
  ): Promise<RetrieveResult> {
    const queryVector = await this.embeddingService.embed(queryText);

    const where: Prisma.ChunkWhereInput = {};
    if (documentId?.trim()) {
      where.documentId = documentId.trim();
    }

    const chunks = await this.prisma.chunk.findMany({
      where,
      select: {
        id: true,
        documentId: true,
        chunkIndex: true,
        content: true,
        embedding: true,
      },
    });

    const scored: SearchHit[] = [];

    for (const row of chunks) {
      const vec = parseEmbeddingJson(row.embedding);
      if (!vec || vec.length !== queryVector.length) {
        continue;
      }
      const score = cosineSimilarity(queryVector, vec);
      scored.push({
        chunkId: row.id,
        documentId: row.documentId,
        chunkIndex: row.chunkIndex,
        content: row.content,
        score,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    const hits = scored.slice(0, topK);

    return {
      hits,
      dimensions: queryVector.length,
      totalChunksCompared: chunks.length,
    };
  }

  /**
   * POST /api/rag/search
   */
  async search(dto: SearchRequestDto) {
    const q = dto.query?.trim();
    if (!q) {
      throw new BadRequestException('query 不能为空');
    }
    let topK = dto.topK ?? DEFAULT_TOP_K;
    if (!Number.isFinite(topK) || topK < 1) {
      topK = DEFAULT_TOP_K;
    }
    topK = Math.min(Math.floor(topK), MAX_TOP_K);

    const { hits, dimensions, totalChunksCompared } = await this.retrieveTopK(
      q,
      topK,
      dto.documentId?.trim() ?? null,
    );

    return {
      query: q,
      topK,
      filterDocumentId: dto.documentId?.trim() ?? null,
      dimensions,
      totalChunksCompared,
      results: hits,
    };
  }

  private getChatModel(): ChatDeepSeek {
    const apiKey =
      process.env.CHAT_API_KEY?.trim() || process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
      throw new InternalServerErrorException(
        '未配置 CHAT_API_KEY 或 DEEPSEEK_API_KEY',
      );
    }
    const baseURL =
      process.env.CHAT_BASE_URL?.trim() ||
      process.env.BASE_URL?.trim() ||
      undefined;
    const model = process.env.CHAT_MODEL?.trim() || 'deepseek-v4-flash';

    return new ChatDeepSeek({
      model,
      temperature: Number(process.env.CHAT_TEMPERATURE ?? 0.3),
    });
  }

  /**
   * 供 Controller 写入 SSE：先检索，再 LangChain stream，逐段 yield JSON 行
   */
  async *chatSseLines(
    dto: ChatRequestDto,
  ): AsyncGenerator<string, void, unknown> {
    const msg = dto.message?.trim();
    if (!msg) {
      yield JSON.stringify({
        type: 'error',
        message: 'message 不能为空',
      });
      return;
    }

    let topK = dto.topK ?? DEFAULT_TOP_K;
    if (!Number.isFinite(topK) || topK < 1) {
      topK = DEFAULT_TOP_K;
    }
    topK = Math.min(Math.floor(topK), MAX_TOP_K);

    const docFilter = dto.documentId?.trim() ?? null;
    const { hits, dimensions, totalChunksCompared } = await this.retrieveTopK(
      msg,
      topK,
      docFilter,
    );

    yield JSON.stringify({
      type: 'meta',
      filterDocumentId: docFilter,
      dimensions,
      totalChunksCompared,
      hitCount: hits.length,
      hits: hits.map((h) => ({
        chunkId: h.chunkId,
        documentId: h.documentId,
        chunkIndex: h.chunkIndex,
        score: h.score,
      })),
    });

    const contextBlock = buildContextFromHits(hits);
    const model = this.getChatModel();

    const messages = [
      new SystemMessage(
        `${RAG_SYSTEM_INSTRUCTION}\n\n以下是检索到的知识库片段：\n${contextBlock}`,
      ),
      new HumanMessage(msg),
    ];

    try {
      const stream = await model.stream(messages);
      for await (const chunk of stream) {
        const parts = parseStreamPartsFromChunk(chunk);
        for (const part of parts) {
          yield JSON.stringify(part);
        }
      }
      yield JSON.stringify({ type: 'done' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      yield JSON.stringify({ type: 'error', message });
    }
  }
}
