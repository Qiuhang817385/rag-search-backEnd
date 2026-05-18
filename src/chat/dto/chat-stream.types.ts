import type { LlmInvokeOptions, ProviderId } from 'src/llm/llm.types';
import type { MessageDto } from './chat.dto';

export const CHAT_TYPES = ['plain', 'rag', 'roleplay'] as const;
export type ChatType = (typeof CHAT_TYPES)[number];

/** 流式聊天请求体（领域类型，Controller DTO 与之对齐） */
export interface ChatStreamBody {
  sessionId: string;
  chatType: ChatType;
  userMessage: string;
  history: MessageDto[];
  provider?: ProviderId;
  model?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  repeatPenalty?: number;
}

const LLM_OPTION_KEYS = [
  'provider',
  'model',
  'temperature',
  'topP',
  'topK',
  'presencePenalty',
  'repeatPenalty',
] as const satisfies readonly (keyof ChatStreamBody)[];

export function toLlmInvokeOptions(
  body: Pick<ChatStreamBody, (typeof LLM_OPTION_KEYS)[number]>,
): LlmInvokeOptions | undefined {
  const options: LlmInvokeOptions = {
    provider: body.provider,
    model: body.model,
    temperature: body.temperature,
    topP: body.topP,
    topK: body.topK,
    presencePenalty: body.presencePenalty,
    repeatPenalty: body.repeatPenalty,
  };
  const hasAny = LLM_OPTION_KEYS.some((k) => body[k] !== undefined);
  return hasAny ? options : undefined;
}
