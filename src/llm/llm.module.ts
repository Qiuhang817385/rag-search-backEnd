import { Module, DynamicModule } from '@nestjs/common';
import { LlmAdapterService } from './llm-adapter.service';
import { LlmProviderFactory } from './factory/llm-provider.factory';
import type { LlmModuleOptions } from './llm.types';

export type {
  LlmModuleOptions,
  LlmProviderConfig,
  LlmInvokeOptions,
  ProviderId,
} from './llm.types';

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
        LlmProviderFactory,
        LlmAdapterService,
      ],
      exports: [LlmAdapterService, LlmProviderFactory],
    };
  }
}
