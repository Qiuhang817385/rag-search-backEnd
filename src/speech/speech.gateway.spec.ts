import { Test, TestingModule } from '@nestjs/testing';
import { SpeechGateway } from './speech.gateway';
import { SpeechService } from './speech.service';

describe('SpeechGateway', () => {
  let gateway: SpeechGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpeechGateway, SpeechService],
    }).compile();

    gateway = module.get<SpeechGateway>(SpeechGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
