import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class IngestRequestDto {
  /** 文档全文（TXT / Markdown 纯文本） */
  @IsString()
  @MinLength(1)
  @MaxLength(2_000_000)
  text!: string;

  /** 可选，原始文件名，便于展示与追溯 */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  filename?: string;
}
