import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { SessionService } from './session.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private sessionService: SessionService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const sid = req.cookies?.session_id;
    if (!sid) throw new UnauthorizedException('未登录');

    const session = await this.sessionService.get(sid);
    if (!session) throw new UnauthorizedException('Session 已过期');

    // 续期：活跃用户自动刷新 2 小时
    await this.sessionService.touch(sid);

    // 挂载用户（已过滤敏感字段）
    const user = await this.usersService.findById(session.userId);
    if (!user) throw new UnauthorizedException('用户不存在');

    req.user = user;
    return true;
  }
}
