import { BadRequestException, Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { randomUUID } from 'node:crypto';
import { EmbeddingService } from '../embedding/embedding.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  RAG_DEMO_CHUNK_OVERLAP,
  RAG_DEMO_CHUNK_SIZE,
} from './rag-split.constants';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async ingest(text: string, filename?: string) {
    const trimmed = text?.trim();
    if (!trimmed) {
      throw new BadRequestException('text 不能为空');
    }

    const documentId = randomUUID();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: RAG_DEMO_CHUNK_SIZE,
      chunkOverlap: RAG_DEMO_CHUNK_OVERLAP,
    });
    const chunkTexts = await splitter.splitText(trimmed);

    /** 顺序请求 embedding，避免 burst 触发限流；全部成功后再入库 */
    const embeddings: number[][] = [];
    for (const content of chunkTexts) {
      const vector = await this.embeddingService.embed(content);
      embeddings.push(vector);
    }

    await this.prisma.document.create({
      data: {
        id: documentId,
        filename: filename ?? null,
        rawText: trimmed,
        chunks: {
          create: chunkTexts.map((content, chunkIndex) => ({
            chunkIndex,
            content,
            embedding: embeddings[chunkIndex],
          })),
        },
      },
    });

    const dim = embeddings[0]?.length ?? 0;

    return {
      documentId,
      textLength: trimmed.length,
      filename: filename ?? null,
      chunkCount: chunkTexts.length,
      embeddingDimensions: dim,
      embeddingModel: process.env.EMBEDDING_MODEL ?? 'text-embedding-ada-002',
      splitConfig: {
        splitter: 'RecursiveCharacterTextSplitter',
        chunkSize: RAG_DEMO_CHUNK_SIZE,
        chunkOverlap: RAG_DEMO_CHUNK_OVERLAP,
      },
      message:
        '文档、切片与向量已写入 OceanBase（rag_documents / rag_chunks.embedding）',
    };
  }
}
