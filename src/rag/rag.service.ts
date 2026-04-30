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
import type { SearchHit, SearchHitWithDocument } from './types';

export type { SearchHit, SearchHitWithDocument } from './types';

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
   * 按 chunk 上的 documentId 批量查 `rag_documents`，用 filename 作为展示名（空则回退 id）。
   */
  async attachDocumentDisplayNames(
    hits: SearchHit[],
  ): Promise<SearchHitWithDocument[]> {
    const ids = [...new Set(hits.map((h) => h.documentId))];
    if (ids.length === 0) {
      return [];
    }
    const docs = await this.prisma.document.findMany({
      where: { id: { in: ids } },
      select: { id: true, filename: true },
    });
    const nameById = new Map(
      docs.map((d) => [d.id, d.filename?.trim() || d.id] as const),
    );
    return hits.map((h) => ({
      ...h,
      documentName: nameById.get(h.documentId) ?? h.documentId,
    }));
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

    const results = await this.attachDocumentDisplayNames(hits);

    return {
      query: q,
      topK,
      filterDocumentId: dto.documentId?.trim() ?? null,
      dimensions,
      totalChunksCompared,
      results,
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

    const hitsWithDoc = await this.attachDocumentDisplayNames(hits);

    let filterDocumentName: string | null = null;
    if (docFilter) {
      const fromHit = hitsWithDoc.find((h) => h.documentId === docFilter);
      if (fromHit) {
        filterDocumentName = fromHit.documentName;
      } else {
        const docRow = await this.prisma.document.findUnique({
          where: { id: docFilter },
          select: { filename: true },
        });
        filterDocumentName = docRow?.filename?.trim() || docFilter;
      }
    }

    yield JSON.stringify({
      type: 'meta',
      filterDocumentId: docFilter,
      filterDocumentName,
      dimensions,
      totalChunksCompared,
      hitCount: hitsWithDoc.length,
      hits: hitsWithDoc.map((h) => ({
        chunkId: h.chunkId,
        documentId: h.documentId,
        chunkIndex: h.chunkIndex,
        score: h.score,
        documentName: h.documentName,
        /** 供前端流式阶段做引用重叠 / 哨兵匹配（与 prompt 中片段顺序一致） */
        content: h.content,
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
