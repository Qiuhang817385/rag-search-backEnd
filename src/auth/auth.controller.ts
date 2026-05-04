import { AuthService } from './auth.service';
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  Get,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { Public } from './public.decorator';
import type { Request, Response } from 'express';
import { LoginDto, RegisterDto } from '../types/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private sessionService: SessionService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    // AuthService 内部调 UsersService.create()
    const user = await this.authService.register(
      dto.email,
      dto.password,
      dto.name,
    );
    return { success: true, user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 1. 验证明文密码
    const user = await this.authService.validateUser(dto.email, dto.password);

    // 2. 创建服务端 Session
    const sid = await this.sessionService.create(
      user.id,
      req.headers['user-agent'],
    );

    // 3. 写 HttpOnly Cookie（后端全权控制）
    res.cookie('session_id', sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 浏览器保留7天，但Redis 2小时过期，以Redis为准
      path: '/',
      // domain: '.yourdomain.com' // 如果是子域部署，开启此项
    });

    return {
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sid = req.cookies?.session_id;
    if (sid) await this.sessionService.destroy(sid);

    res.clearCookie('session_id', { path: '/' });
    return { success: true };
  }

  @Get('me')
  async me(@Req() req: Request) {
    // req.user 由 SessionGuard 挂载，已是 DTO 过滤后的数据
    return req.user;
  }
}
