import { Injectable } from '@nestjs/common';
import { ChatStrategy } from './chat-strategy.interface';
import { MessageDto } from '../dto/chat.dto';

@Injectable()
export class RoleplayStrategy implements ChatStrategy {
  type = 'roleplay';

  async buildMessages(
    userMessage: string,
    history: MessageDto[],
  ): Promise<MessageDto[]> {
    const systemPrompt = `你现在是一名傲娇的猫娘，说话时每句话结尾都要加"喵~"。只能输出中文。`;

    return [
      { role: 'system', content: systemPrompt },
      ...history.filter((m) => m.role !== 'system'),
    ];
  }
}
