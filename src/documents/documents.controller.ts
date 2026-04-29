import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { IngestRequestDto } from './dto/ingest-request.dto';

/** 完整路径前缀：`/api` */
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * POST /api/documents/ingest
   * Body: { text: string, filename?: string }
   */
  @Post('ingest')
  @HttpCode(200)
  ingest(@Body() body: IngestRequestDto) {
    return this.documentsService.ingest(body.text, body.filename);
  }
}

