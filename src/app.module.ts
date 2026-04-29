import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmbeddingModule } from './embedding/embedding.module';
import { DocumentsModule } from './documents/documents.module';
import { RagModule } from './rag/rag.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, EmbeddingModule, DocumentsModule, RagModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
