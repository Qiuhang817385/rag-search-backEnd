import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { CacheModule } from 'src/cache/cache.module';
import { ChatRouterService } from './chat-router.service';
import { PlainChatStrategy } from './strategies/plain-chat.strategy';
import { RagChatStrategy } from './strategies/rag-chat.strategy';
import { RoleplayStrategy } from './strategies/roleplay.strategy';
import { RagModule } from 'src/rag/rag.module';

@Module({
  controllers: [ChatController],
  providers: [
    PlainChatStrategy,
    RagChatStrategy,
    RoleplayStrategy,
    ChatRouterService,
  ],
  imports: [CacheModule, RagModule],
})
export class ChatModule {}
