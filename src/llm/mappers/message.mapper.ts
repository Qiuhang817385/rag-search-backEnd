import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { MessageDto } from 'src/chat/dto/chat.dto';

/**
 * 将业务层 MessageDto 转为 LangChain BaseMessage（第 3 步）。
 * Provider / Adapter 统一调用，避免 invoke 与 stream 各写一遍 map。
 */
export function toLangChainMessages(messages: MessageDto[]): BaseMessage[] {
  return messages.map(toLangChainMessage);
}

export function toLangChainMessage(message: MessageDto): BaseMessage {
  switch (message.role) {
    case 'system':
      return new SystemMessage(message.content);
    case 'user':
      return new HumanMessage(message.content);
    case 'assistant':
      return new AIMessage(message.content);
    default: {
      const _exhaustive: never = message.role;
      return _exhaustive;
    }
  }
}
