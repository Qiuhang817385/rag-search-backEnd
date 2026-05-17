import { InternalServerErrorException } from '@nestjs/common';
import { ChatDeepSeek } from '@langchain/deepseek';
import type { AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import type { ILlmProvider } from '../interfaces/llm-provider.interface';
import type { LlmProviderConfig } from '../llm.types';

function contentToString(content: unknown): string {
  return typeof content === 'string' ? content : JSON.stringify(content);
}

/**
 * DeepSeek 对话模型（第 4 步）。
 * 从 LlmAdapterService 迁出的 ChatDeepSeek 封装，实现 ILlmProvider。
 */
export class DeepSeekProvider implements ILlmProvider {
  readonly id = 'deepseek' as const;

  private readonly model: ChatDeepSeek;

  constructor(config: LlmProviderConfig = {}) {
    const apiKey =
      config.apiKey?.trim() ||
      process.env.CHAT_API_KEY?.trim() ||
      process.env.DEEPSEEK_API_KEY?.trim();

    if (!apiKey) {
      throw new InternalServerErrorException(
        '未配置 CHAT_API_KEY 或 DEEPSEEK_API_KEY',
      );
    }

    const model =
      config.model?.trim() ||
      process.env.CHAT_MODEL?.trim() ||
      'deepseek-v4-flash';
    const temperature =
      config.temperature ?? Number(process.env.CHAT_TEMPERATURE ?? 0.3);

    this.model = new ChatDeepSeek({
      apiKey,
      model,
      temperature,
    });
  }

  async invoke(messages: BaseMessage[]): Promise<string> {
    const response = await this.model.invoke(messages);
    return contentToString(response.content);
  }

  async stream(messages: BaseMessage[]): Promise<AsyncIterable<AIMessageChunk>> {
    return this.model.stream(messages);
  }
}
