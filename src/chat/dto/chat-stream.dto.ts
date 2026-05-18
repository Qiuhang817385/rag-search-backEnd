import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageDto } from './chat.dto';
import type { ProviderId } from 'src/llm/llm.types';
import {
  CHAT_TYPES,
  type ChatStreamBody,
  type ChatType,
} from './chat-stream.types';

const PROVIDER_IDS: ProviderId[] = ['deepseek', 'ollama', 'openai-compatible'];

export class ChatStreamDto implements ChatStreamBody {
  @IsString()
  sessionId!: string;

  @IsIn(CHAT_TYPES)
  chatType!: ChatType;

  @IsString()
  userMessage!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  history!: MessageDto[];

  @IsOptional()
  @IsIn(PROVIDER_IDS)
  provider?: ProviderId;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  topP?: number;

  @IsOptional()
  @IsNumber()
  topK?: number;

  @IsOptional()
  @IsNumber()
  presencePenalty?: number;

  @IsOptional()
  @IsNumber()
  repeatPenalty?: number;
}
