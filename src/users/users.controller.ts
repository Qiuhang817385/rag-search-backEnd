import { UsersService } from './users.service';
import {
  Controller,
  Get,
  Param,
  Delete,
  NotFoundException,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** 根据 ID 查用户（需登录，由全局 SessionGuard 保护） */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  /** 删除用户（需登录；生产环境建议再加角色/本人校验） */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { success: true };
  }
}
