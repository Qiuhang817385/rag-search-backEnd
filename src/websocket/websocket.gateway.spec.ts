import { Test, TestingModule } from '@nestjs/testing';
import { ChatRoomModule } from './chat-room.module';
import { WebsocketGateway } from './websocket.gateway';

describe('WebsocketGateway', () => {
  let gateway: WebsocketGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ChatRoomModule],
      providers: [WebsocketGateway],
    }).compile();

    gateway = module.get<WebsocketGateway>(WebsocketGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
