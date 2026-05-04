import { IsString, MaxLength, MinLength } from 'class-validator';

export class PresignUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  filename!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  contentType!: string;
}

export class PresignDownloadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  key!: string;
}
