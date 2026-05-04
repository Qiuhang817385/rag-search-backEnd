import { Module } from '@nestjs/common';
import { ChatRoomModule } from './chat-room.module';
import { WebsocketGateway } from './websocket.gateway';

@Module({
  imports: [ChatRoomModule],
  providers: [WebsocketGateway],
})
export class WebsocketModule {}
