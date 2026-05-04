import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { SessionService } from './session.service';
import { SessionGuard } from './session.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    SessionGuard,
    { provide: APP_GUARD, useExisting: SessionGuard },
  ],
  imports: [UsersModule],
})
export class AuthModule {}
