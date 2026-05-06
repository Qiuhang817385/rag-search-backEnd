import { Module, DynamicModule } from '@nestjs/common';
import { LlmAdapterService } from './llm-adapter.service';

export interface LlmModuleOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  // 其他配置...
}

@Module({})
export class LlmModule {
  static forRoot(options: LlmModuleOptions): DynamicModule {
    return {
      module: LlmModule,
      global: true,
      providers: [
        {
          provide: 'LLM_OPTIONS',
          useValue: options,
        },
        LlmAdapterService,
      ],
      exports: [LlmAdapterService],
    };
  }
}
