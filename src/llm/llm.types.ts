/**
 * LLM 多模型接入 — 类型定义（第 1 步）
 * 全模块统一使用这里的 ProviderId / 配置形状，避免魔法字符串。
 */

/** 已接入或计划接入的厂商标识 */
export type ProviderId = 'deepseek' | 'ollama' | 'openai-compatible';

/** 单个 Provider 的运行时配置（由 forRoot / env / 单次调用合并而来） */
export interface LlmProviderConfig {
  /** API Key；Ollama 等本地服务通常不需要 */
  apiKey?: string;
  /** OpenAI 兼容接口的 baseURL，或 Ollama 的地址 */
  baseURL?: string;
  /** 模型名，如 deepseek-v4-flash、llama3.1:8b */
  model?: string;
  temperature?: number;
  /** 请求超时（毫秒），可选 */
  timeoutMs?: number;
}

/**
 * Nest 模块 forRoot 入参。
 * 支持两种写法（可并存，Factory 里做合并）：
 * 1. 新：defaultProvider + providers 字典
 * 2. 旧：顶层 apiKey / model / temperature（等价于 deepseek 的默认配置）
 */
export interface LlmModuleOptions {
  defaultProvider?: ProviderId;
  providers?: Partial<Record<ProviderId, LlmProviderConfig>>;

  /** @deprecated 兼容旧 forRoot，映射到 providers.deepseek */
  apiKey?: string;
  /** @deprecated 兼容旧 forRoot，映射到 providers.deepseek */
  model?: string;
  /** @deprecated 兼容旧 forRoot，映射到 providers.deepseek */
  temperature?: number;
}

/** 单次 invoke / stream 可覆盖的配置（第 8 步 adapter 会用到） */
export interface LlmInvokeOptions {
  provider?: ProviderId;
  model?: string;
  temperature?: number;
}

/** Factory 内部使用的「已解析」配置（第 6 步实现合并逻辑） */
export interface ResolvedLlmModuleOptions {
  defaultProvider: ProviderId;
  providers: Record<ProviderId, LlmProviderConfig | undefined>;
}
