import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    // private jwtService: JwtService,
  ) {}

  /** 验证明文密码 */
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('用户不存在');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('密码错误');
    return user;
  }

  async register(email: string, password: string, name?: string) {
    // 检查邮箱是否已存在
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new ConflictException('邮箱已注册');

    return this.usersService.create(email, password, name);
  }
}
