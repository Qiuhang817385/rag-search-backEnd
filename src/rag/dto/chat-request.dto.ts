import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ChatRequestDto {
  /** 用户问题（同时用于向量检索与对话） */
  @IsString()
  @MinLength(1)
  @MaxLength(32000)
  message!: string;

  /** 检索 topK 片段，默认 5 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;

  /** 仅在该文档的切片中检索 */
  @IsOptional()
  @IsString()
  documentId?: string;
}
