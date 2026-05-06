import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';

export class ImageDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  base64?: string;
}

export class MessageDto {
  @IsString()
  role!: 'user' | 'assistant' | 'system';

  @IsString()
  content!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  images?: ImageDto[];
}

export class ChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  messages!: MessageDto[];
}
