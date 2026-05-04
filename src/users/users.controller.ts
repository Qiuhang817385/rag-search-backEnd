import { UsersService } from './users.service';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** 注册（内部调用或开放注册） */
  @Post('register')
  async register(
    @Body() dto: { email: string; password: string; name?: string },
  ) {
    const user = await this.usersService.create(
      dto.email,
      dto.password,
      dto.name,
    );
    return { success: true, user };
  }

  /** 根据 ID 查用户 */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  /** 根据邮箱查用户（内部用，返回含 passwordHash） */
  @Get('by-email/:email')
  async findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  //  /** 修改用户资料 */
  //  @Patch(':id')
  //  async update(
  //    @Param('id') id: string,
  //    @Body() dto: { name?: string; role?: 'user' | 'admin' },
  //  ) {
  //    return this.usersService.update(id, dto);
  //  }

  /** 删除用户 */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { success: true };
  }
}
