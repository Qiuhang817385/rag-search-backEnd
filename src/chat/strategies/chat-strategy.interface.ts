import { MessageDto } from '../dto/chat.dto';

export interface ChatStrategy {
  readonly type: string; // 'rag' | 'roleplay' | 'plain'

  /**
   * 根据用户输入和历史，构建要发给 LLM 的完整消息列表
   * @param userMessage 用户当前输入
   * @param history 最近几轮历史（不含 system）
   * @returns 完整的消息数组（包括 system prompt）
   */
  buildMessages(
    userMessage: string,
    history: MessageDto[],
  ): Promise<MessageDto[]>;
}
