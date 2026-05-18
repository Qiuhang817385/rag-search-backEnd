import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import type { ILlmProvider } from '../interfaces/llm-provider.interface';
import { DeepSeekProvider } from '../providers/deepseek.provider';
import { OllamaProvider } from '../providers/ollama.provider';
import type {
  LlmInvokeOptions,
  LlmModuleOptions,
  LlmProviderConfig,
  ProviderId,
  ResolvedLlmModuleOptions,
} from '../llm.types';

function resolveLlmModuleOptions(
  options: LlmModuleOptions,
): ResolvedLlmModuleOptions {
  const envDefault = process.env.LLM_DEFAULT_PROVIDER?.trim() as
    | ProviderId
    | undefined;

  const defaultProvider =
    options.defaultProvider ?? envDefault ?? 'deepseek';

  const legacyDeepseek: LlmProviderConfig = {
    apiKey: options.apiKey,
    model: options.model,
    temperature: options.temperature,
  };

  return {
    defaultProvider,
    providers: {
      deepseek: { ...legacyDeepseek, ...options.providers?.deepseek },
      ollama: options.providers?.ollama,
      'openai-compatible': options.providers?.['openai-compatible'],
    },
  };
}

@Injectable()
export class LlmProviderFactory {
  private readonly resolved: ResolvedLlmModuleOptions;
  private readonly cache = new Map<ProviderId, ILlmProvider>();

  constructor(@Inject('LLM_OPTIONS') options: LlmModuleOptions) {
    this.resolved = resolveLlmModuleOptions(options);
  }

  getDefaultProviderId(): ProviderId {
    return this.resolved.defaultProvider;
  }

  /**
   * 按 providerId 取实现；单次调用可通过 options 覆盖 model / temperature（会新建实例，不缓存）。
   */
  getProvider(options?: LlmInvokeOptions): ILlmProvider {
    const providerId = options?.provider ?? this.resolved.defaultProvider;
    const baseConfig = this.configFor(providerId);
    const merged: LlmProviderConfig = {
      ...baseConfig,
      ...(options?.model !== undefined ? { model: options.model } : {}),
      ...(options?.temperature !== undefined
        ? { temperature: options.temperature }
        : {}),
      ...(options?.topP !== undefined ? { topP: options.topP } : {}),
      ...(options?.topK !== undefined ? { topK: options.topK } : {}),
      ...(options?.presencePenalty !== undefined
        ? { presencePenalty: options.presencePenalty }
        : {}),
      ...(options?.repeatPenalty !== undefined
        ? { repeatPenalty: options.repeatPenalty }
        : {}),
    };

    const hasRuntimeOverride =
      options?.model !== undefined ||
      options?.temperature !== undefined ||
      options?.topP !== undefined ||
      options?.topK !== undefined ||
      options?.presencePenalty !== undefined ||
      options?.repeatPenalty !== undefined;

    if (!hasRuntimeOverride) {
      const cached = this.cache.get(providerId);
      if (cached) return cached;
      const instance = this.createProvider(providerId, merged);
      this.cache.set(providerId, instance);
      return instance;
    }

    return this.createProvider(providerId, merged);
  }

  private configFor(providerId: ProviderId): LlmProviderConfig {
    return this.resolved.providers[providerId] ?? {};
  }

  private createProvider(
    providerId: ProviderId,
    config: LlmProviderConfig,
  ): ILlmProvider {
    switch (providerId) {
      case 'deepseek':
        return new DeepSeekProvider(config);
      case 'ollama':
        return new OllamaProvider(config);
      case 'openai-compatible':
        throw new InternalServerErrorException(
          'OpenAI 兼容 Provider 尚未接入，请在 factory 中注册 openai-compatible.provider',
        );
      default: {
        const _exhaustive: never = providerId;
        throw new InternalServerErrorException(
          `未知 LLM Provider: ${String(_exhaustive)}`,
        );
      }
    }
  }
}
