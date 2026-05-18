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
import { SpeechModule } from './speech/speech.module';

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
      defaultProvider: 'deepseek',
      providers: {
        deepseek: {
          model: 'deepseek-v4-flash',
          temperature: 0.3,
        },
        ollama: {
          baseURL: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
          model: process.env.OLLAMA_MODEL ?? 'jaahas/qwen3.5-uncensored:9b',
          temperature: Number(process.env.OLLAMA_TEMPERATURE ?? 0.3),
        },
      },
    }),
    SpeechModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
