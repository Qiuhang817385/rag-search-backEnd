import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../embedding/embedding.module';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [EmbeddingModule],
  providers: [DocumentsService],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
