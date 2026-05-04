import { IsString, MaxLength, MinLength } from 'class-validator';

export class EmbedRequestDto {
  /** 需要向量化的单段文本 */
  @IsString()
  @MinLength(1)
  @MaxLength(100_000)
  text!: string;
}
