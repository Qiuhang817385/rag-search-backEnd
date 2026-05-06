import { Injectable, Inject } from '@nestjs/common';
import { ChatDeepSeek } from '@langchain/deepseek';
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from '@langchain/core/messages';
import type { LlmModuleOptions } from './llm.module';
import { MessageDto } from 'src/chat/dto/chat.dto';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import {
  catchError,
  concatWith,
  from,
  map,
  mergeMap,
  Observable,
  of,
} from 'rxjs';
import {
  ParsedStreamPart,
  parseStreamPartsFromChunk,
} from 'src/rag/stream-utils';

@Injectable()
export class LlmAdapterService {
  private model: ChatDeepSeek;
  private readonly logger = new Logger(LlmAdapterService.name);
  constructor(@Inject('LLM_OPTIONS') private options: LlmModuleOptions) {
    const apiKey =
      options.apiKey ??
      process.env.CHAT_API_KEY?.trim() ??
      process.env.DEEPSEEK_API_KEY?.trim();

    if (!apiKey) {
      throw new InternalServerErrorException(
        '未配置 CHAT_API_KEY 或 DEEPSEEK_API_KEY',
      );
    }

    // const baseURL =
    // process.env.CHAT_BASE_URL?.trim() ||
    // process.env.BASE_URL?.trim() ||
    // undefined;

    const model =
      options.model ?? process.env.CHAT_MODEL?.trim() ?? 'deepseek-v4-flash';
    const temperature =
      options.temperature ?? Number(process.env.CHAT_TEMPERATURE ?? 0.3);

    this.model = new ChatDeepSeek({
      apiKey,
      model,
      temperature,
    });
  }

  async invoke(messages: MessageDto[]): Promise<string> {
    const langchainMessages = messages.map((m) => {
      if (m.role === 'system') return new SystemMessage(m.content);
      if (m.role === 'user') return new HumanMessage(m.content);
      return new AIMessage(m.content);
    });

    const response = await this.model.invoke(langchainMessages);
    return typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);
  }

  /**
   * 返回一个 Observable，每个发射值是一个 token 字符串
   * @param messages - 对话消息数组
   */
  stream(messages: MessageDto[]): Observable<MessageEvent> {
    const langchainMessages = messages.map((m) => {
      if (m.role === 'system') return new SystemMessage(m.content);
      if (m.role === 'user') return new HumanMessage(m.content);
      return new AIMessage(m.content);
    });

    this.logger.log('langchainMessages', langchainMessages);

    // LangChain 的 stream 返回一个 AsyncIterable (IterableReadableStream<AIMessageChunk>)
    const streamIterable = this.model.stream(langchainMessages);

    return from(streamIterable).pipe(
      mergeMap((stream) => {
        return from(stream).pipe(
          mergeMap((chunk) => {
            return parseStreamPartsFromChunk(chunk);
          }),
          map((part) => {
            return JSON.stringify(part);
          }),
          concatWith(of(JSON.stringify({ type: 'done' }))),
        );
      }),
      catchError((err) => {
        return of(JSON.stringify({ type: 'error', message: err.message }));
      }),
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
