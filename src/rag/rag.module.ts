import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../embedding/embedding.module';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';

@Module({
  imports: [EmbeddingModule],
  providers: [RagService],
  controllers: [RagController],
})
export class RagModule {}
