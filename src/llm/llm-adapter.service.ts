import { Injectable, Inject, Logger } from '@nestjs/common';
import type { LlmModuleOptions } from './llm.module';
import { MessageDto } from 'src/chat/dto/chat.dto';
import {
  catchError,
  concatWith,
  from,
  map,
  mergeMap,
  Observable,
  of,
} from 'rxjs';
import { parseStreamPartsFromChunk } from 'src/rag/stream-utils';
import { toLangChainMessages } from './mappers/message.mapper';
import { DeepSeekProvider } from './providers/deepseek.provider';
import type { ILlmProvider } from './interfaces/llm-provider.interface';
import type { LlmProviderConfig } from './llm.types';

@Injectable()
export class LlmAdapterService {
  private readonly provider: ILlmProvider;

  private readonly logger = new Logger(LlmAdapterService.name);

  constructor(@Inject('LLM_OPTIONS') private options: LlmModuleOptions) {
    const deepseekConfig: LlmProviderConfig = options.providers?.deepseek ?? {
      apiKey: options.apiKey ?? process.env.DEEPSEEK_API_KEY?.trim() ?? '',
      model:
        options.model ??
        process.env.DEEPSEEK_MODEL?.trim() ??
        'deepseek-v4-flash',
      temperature:
        options.temperature ??
        Number(process.env.DEEPSEEK_TEMPERATURE?.trim() ?? 0.3),
    };

    this.provider = new DeepSeekProvider(deepseekConfig);
  }

  async invoke(messages: MessageDto[]): Promise<string> {
    return this.provider.invoke(toLangChainMessages(messages));
  }

  /**
   * 返回一个 Observable，每个发射值是一个 token 字符串
   * @param messages - 对话消息数组
   */
  stream(messages: MessageDto[]): Observable<MessageEvent> {
    const langchainMessages = toLangChainMessages(messages);

    this.logger.log('langchainMessages', langchainMessages);

    // LangChain 的 stream 返回一个 AsyncIterable (IterableReadableStream<AIMessageChunk>)
    return from(this.provider.stream(langchainMessages)).pipe(
      mergeMap((chunkIterable) =>
        from(chunkIterable).pipe(
          // mergeMap((chunk) => parseStreamPartsFromChunk(chunk)),
          mergeMap((chunk) => from(parseStreamPartsFromChunk(chunk))),
          map((part) => JSON.stringify(part)),

          concatWith(of(JSON.stringify({ type: 'done' }))),
        ),
      ),

      catchError((err) =>
        of(JSON.stringify({ type: 'error', message: err.message })),
      ),

      map((dataStr) => ({ data: dataStr }) as MessageEvent),
    );
    // 将 AsyncIterable 转换为 Observable
    // return new Observable<string>((subscriber) => {
    //   (async () => {
    //     try {
    //       for await (const chunk of streamIterable) {
    //         // chunk.content 可能是字符串或数组（多模态），这里按字符串处理
    //         const content =
    //           typeof chunk.content === 'string' ? chunk.content : '';
    //         if (content) {
    //           subscriber.next(content);
    //         }
    //       }
    //       subscriber.complete();
    //     } catch (err) {
    //       subscriber.error(err);
    //     }
    //   })();
    // });
  }
}
