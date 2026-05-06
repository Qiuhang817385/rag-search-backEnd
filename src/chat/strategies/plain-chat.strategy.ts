import { Injectable } from '@nestjs/common';
import { ChatStrategy } from './chat-strategy.interface';
import { MessageDto } from '../dto/chat.dto';

@Injectable()
export class PlainChatStrategy implements ChatStrategy {
  type = 'plain';

  async buildMessages(
    userMessage: string,
    history: MessageDto[],
  ): Promise<MessageDto[]> {
    return [
      history?.[0]?.role === 'system'
        ? history?.[0]
        : { role: 'system', content: '你是一个有帮助的AI助手。' },
      ...history.filter((m) => m.role !== 'system'),
    ];
  }
}
