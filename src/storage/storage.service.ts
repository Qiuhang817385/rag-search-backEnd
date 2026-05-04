import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private r2: S3Client;

  constructor() {
    this.r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      // 默认会为 PutObject 带上 CRC32 等校验参数；浏览器直传无法发送匹配校验，R2 易出现失败或长时间无响应
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
  }

  private getBucketName(type: 'doc' | 'image'): string {
    return type === 'doc'
      ? process.env.R2_BUCKET_NAME_DOC!
      : process.env.R2_BUCKET_NAME_IMAGE!;
  }

  private buildKey(type: 'doc' | 'image', filename: string): string {
    const timestamp = Date.now();
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const prefix = type === 'doc' ? 'documents' : 'images';
    return `${prefix}/${timestamp}-${sanitized}`;
  }

  async getUploadUrl(
    type: 'doc' | 'image',
    filename: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
    const key = this.buildKey(type, filename);
    const bucket = this.getBucketName(type);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.r2, command, { expiresIn });

    // R2 公开访问 URL 格式（需在 Cloudflare Dashboard 绑定自定义域名）
    const publicUrl = `https://${process.env.R2_PUBLIC_DOMAIN || `${bucket}.${process.env.CF_ACCOUNT_ID}.r2.dev`}/${key}`;

    return { uploadUrl, key, publicUrl };
  }

  async getDownloadUrl(
    type: 'doc' | 'image',
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    const bucket = this.getBucketName(type);

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return getSignedUrl(this.r2, command, { expiresIn });
  }

  async deleteObject(type: 'doc' | 'image', key: string): Promise<void> {
    const bucket = this.getBucketName(type);

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await this.r2.send(command);
  }

  async getObjectMetadata(
    type: 'doc' | 'image',
    key: string,
  ): Promise<{ contentType: string; contentLength: number } | null> {
    const bucket = this.getBucketName(type);

    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.r2.send(command);
      return {
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength || 0,
      };
    } catch {
      return null;
    }
  }
}
