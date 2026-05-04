import { Module } from '@nestjs/common';
import { ChatRoomService } from './chat-room.service';

@Module({
  // 注入 ChatRoomService
  providers: [ChatRoomService],
  // 导出 ChatRoomService,IOC 之后，便于其他模块注入使用
  exports: [ChatRoomService],
})
export class ChatRoomModule {}
