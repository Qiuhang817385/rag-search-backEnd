import { MessageDto } from '../dto/chat.dto';
import { ChatStrategy } from './chat-strategy.interface';
import { RagService } from '../../rag/rag.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RagChatStrategy implements ChatStrategy {
  type = 'rag';

  constructor(private readonly ragService: RagService) {}

  async buildMessages(
    userMessage: string,
    history: MessageDto[],
  ): Promise<MessageDto[]> {
    const docs = await this.ragService.search({ query: userMessage });
    // const context = docs.join('\n\n');
    const context = '';

    // 这一步只负责拼装 ，稍等接入
    const systemPrompt = `基于以下知识库内容回答问题。\n\n${context}`;

    return [
      { role: 'system', content: systemPrompt },
      ...history.filter((m) => m.role !== 'system'),
    ];
  }
}
