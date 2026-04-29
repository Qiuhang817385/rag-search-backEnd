import { Test, TestingModule } from '@nestjs/testing';
import { EmbeddingController } from './embedding.controller';
import { EmbeddingService } from './embedding.service';

describe('EmbeddingController', () => {
  let controller: EmbeddingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmbeddingController],
      providers: [
        {
          provide: EmbeddingService,
          useValue: { embed: jest.fn().mockResolvedValue([0.1, 0.2]) },
        },
      ],
    }).compile();

    controller = module.get<EmbeddingController>(EmbeddingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
