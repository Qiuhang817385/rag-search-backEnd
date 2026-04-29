import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/** 根欢迎页：`GET /`（已从全局前缀 `/api` 中排除） */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
