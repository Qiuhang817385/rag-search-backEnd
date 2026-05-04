import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { SessionService } from './session.service';
import { SessionGuard } from './session.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionService, SessionGuard],
  imports: [UsersModule],
})
export class AuthModule {}
