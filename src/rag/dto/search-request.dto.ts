import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SearchRequestDto {
  /** 用户问题（会做 embedding 再与库内向量比相似度） */
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  query!: string;

  /** 返回前几条，默认 5，最大 20 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;

  /** 若指定则只在该文档的切片里检索 */
  @IsOptional()
  @IsString()
  documentId?: string;
}
