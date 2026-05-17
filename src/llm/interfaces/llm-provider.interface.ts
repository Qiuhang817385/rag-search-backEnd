import type { AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import type { ProviderId } from '../llm.types';

/**
 * 单个 LLM 厂商的适配契约（第 2 步）。
 * DeepSeek / Ollama / OpenAI 兼容 等各自实现此接口；
 * LlmAdapterService 只依赖接口，不依赖具体 SDK 类。
 */
export interface ILlmProvider {
  /** 与 Factory 注册表、日志、调试一致 */
  readonly id: ProviderId;

  /**
   * 非流式：返回完整回复文本。
   * 各实现内部调用 LangChain ChatModel.invoke，并把 content 规整为 string。
   */
  invoke(messages: BaseMessage[]): Promise<string>;

  /**
   * 流式：返回 LangChain 的 chunk 异步序列。
   * Adapter 层继续用 parseStreamPartsFromChunk 转成 SSE，不在 Provider 里做。
   */
  stream(messages: BaseMessage[]): Promise<AsyncIterable<AIMessageChunk>>;
}
