import { ChatOllama } from '@langchain/ollama';
import type { AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import type { ILlmProvider } from '../interfaces/llm-provider.interface';
import type { LlmProviderConfig } from '../llm.types';

function contentToString(content: unknown): string {
  return typeof content === 'string' ? content : JSON.stringify(content);
}

/**
 * 本地 Ollama 对话模型（第 7 步）。
 * 需本机 `ollama serve`，并已 pull 对应 model。
 */
export class OllamaProvider implements ILlmProvider {
  readonly id = 'ollama' as const;

  private readonly model: ChatOllama;

  constructor(config: LlmProviderConfig = {}) {
    const baseUrl =
      config.baseURL?.trim() ||
      process.env.OLLAMA_BASE_URL?.trim() ||
      'http://127.0.0.1:11434';

    const model =
      config.model?.trim() ||
      process.env.OLLAMA_MODEL?.trim() ||
      'jaahas/qwen3.5-uncensored:9b';

    const temperature =
      config.temperature ??
      (process.env.OLLAMA_TEMPERATURE
        ? Number(process.env.OLLAMA_TEMPERATURE)
        : undefined);

    this.model = new ChatOllama({
      baseUrl,
      model,
      ...(temperature !== undefined && !Number.isNaN(temperature)
        ? { temperature }
        : {}),
      ...(config.topP !== undefined ? { topP: config.topP } : {}),
      ...(config.topK !== undefined ? { topK: config.topK } : {}),
      ...(config.presencePenalty !== undefined
        ? { presencePenalty: config.presencePenalty }
        : {}),
      ...(config.repeatPenalty !== undefined
        ? { repeatPenalty: config.repeatPenalty }
        : {}),
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
