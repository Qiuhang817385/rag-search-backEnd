import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmbeddingModule } from './embedding/embedding.module';
import { DocumentsModule } from './documents/documents.module';
import { RagModule } from './rag/rag.module';
import { PrismaModule } from './prisma/prisma.module';
import { WebsocketModule } from './websocket/websocket.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    EmbeddingModule,
    DocumentsModule,
    RagModule,
    WebsocketModule,
    StorageModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
