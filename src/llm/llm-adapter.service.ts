import { Injectable, Logger } from '@nestjs/common';
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
import { LlmProviderFactory } from './factory/llm-provider.factory';
import { toLangChainMessages } from './mappers/message.mapper';
import type { LlmInvokeOptions } from './llm.types';

@Injectable()
export class LlmAdapterService {
  private readonly logger = new Logger(LlmAdapterService.name);

  constructor(private readonly providerFactory: LlmProviderFactory) {}

  async invoke(
    messages: MessageDto[],
    options?: LlmInvokeOptions,
  ): Promise<string> {
    const provider = this.providerFactory.getProvider(options);
    return provider.invoke(toLangChainMessages(messages));
  }

  stream(
    messages: MessageDto[],
    options?: LlmInvokeOptions,
  ): Observable<MessageEvent> {
    const langchainMessages = toLangChainMessages(messages);
    const provider = this.providerFactory.getProvider(options);

    this.logger.log(
      `stream via provider=${provider.id}`,
      langchainMessages.length,
    );

    return from(provider.stream(langchainMessages)).pipe(
      mergeMap((chunkIterable) =>
        from(chunkIterable).pipe(
          mergeMap((chunk) => from(parseStreamPartsFromChunk(chunk))),
          map((part) => JSON.stringify(part)),
          concatWith(of(JSON.stringify({ type: 'done' }))),
        ),
      ),
      catchError((err) =>
        of(
          JSON.stringify({
            type: 'error',
            message: err instanceof Error ? err.message : String(err),
          }),
        ),
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
