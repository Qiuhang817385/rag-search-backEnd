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
import { ChatModule } from './chat/chat.module';
import { CacheModule } from './cache/cache.module';
import { LlmModule } from './llm/llm.module';

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
    ChatModule,
    CacheModule,
    LlmModule.forRoot({
      model: 'deepseek-v4-flash',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
