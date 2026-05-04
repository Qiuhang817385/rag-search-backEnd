import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { StorageService } from './storage.service';

class PresignUploadDto {
  filename: string;
  contentType: string;
}

class PresignDownloadDto {
  key: string;
}

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * POST /api/storage/doc/presign-upload
   * 生成文档上传预签名 URL
   */
  @Post('doc/presign-upload')
  async getDocUploadUrl(
    @Body() dto: PresignUploadDto,
  ): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
    return this.storageService.getUploadUrl('doc', dto.filename, dto.contentType)
  }

  /**
   * POST /api/storage/image/presign-upload
   * 生成图片上传预签名 URL
   */
  @Post('image/presign-upload')
  async getImageUploadUrl(
    @Body() dto: PresignUploadDto,
  ): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
    return this.storageService.getUploadUrl('image', dto.filename, dto.contentType)
  }

  /**
   * POST /api/storage/doc/presign-download
   * 生成文档下载预签名 URL
   */
  @Post('doc/presign-download')
  async getDocDownloadUrl(
    @Body() dto: PresignDownloadDto,
  ): Promise<{ downloadUrl: string }> {
    const downloadUrl = await this.storageService.getDownloadUrl('doc', dto.key)
    return { downloadUrl }
  }

  /**
   * POST /api/storage/image/presign-download
   * 生成图片下载预签名 URL
   */
  @Post('image/presign-download')
  async getImageDownloadUrl(
    @Body() dto: PresignDownloadDto,
  ): Promise<{ downloadUrl: string }> {
    const downloadUrl = await this.storageService.getDownloadUrl('image', dto.key)
    return { downloadUrl }
  }

  /**
   * DELETE /api/storage/doc
   * 删除文档
   */
  @Post('doc/delete')
  async deleteDoc(@Body() dto: PresignDownloadDto): Promise<{ success: boolean }> {
    await this.storageService.deleteObject('doc', dto.key)
    return { success: true }
  }

  /**
   * DELETE /api/storage/image
   * 删除图片
   */
  @Post('image/delete')
  async deleteImage(
    @Body() dto: PresignDownloadDto,
  ): Promise<{ success: boolean }> {
    await this.storageService.deleteObject('image', dto.key)
    return { success: true }
  }
}
