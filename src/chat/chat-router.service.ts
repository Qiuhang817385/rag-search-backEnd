import { BadRequestException, Injectable } from '@nestjs/common';
import { ChatStrategy } from './strategies/chat-strategy.interface';
import { PlainChatStrategy } from './strategies/plain-chat.strategy';
import { RagChatStrategy } from './strategies/rag-chat.strategy';
import { RoleplayStrategy } from './strategies/roleplay.strategy';
import { CacheService } from 'src/cache/cache.service';
import { LlmAdapterService } from 'src/llm/llm-adapter.service';
import { MessageDto } from './dto/chat.dto';
import { Observable, from, switchMap, throwError } from 'rxjs';

export interface ChatStreamRequest {
  sessionId: string;
  chatType: 'plain' | 'rag' | 'roleplay';
  userMessage: string;
  history: MessageDto[];
}

// chat/chat-router.service.ts
@Injectable()
export class ChatRouterService {
  private strategies: Map<string, ChatStrategy> = new Map();

  constructor(
    private readonly cacheService: CacheService,
    private readonly llmAdapter: LlmAdapterService,
    // 注入所有策略
    private readonly plainChatStrategy: PlainChatStrategy,
    private readonly ragChatStrategy: RagChatStrategy,
    private readonly roleplayStrategy: RoleplayStrategy,
  ) {
    this.strategies.set('plain', this.plainChatStrategy);
    this.strategies.set('rag', this.ragChatStrategy);
    this.strategies.set('roleplay', this.roleplayStrategy);
  }

  async chat(
    sessionId: string,
    chatType: 'plain' | 'rag' | 'roleplay',
    userMessage: string,
    history: MessageDto[],
  ): Promise<{ reply: string }> {
    // 1. 获取对应策略
    const strategy = this.strategies.get(chatType);
    if (!strategy) {
      throw new BadRequestException(`不支持的聊天类型: ${chatType}`);
    }

    // 2. 策略构建消息（每个策略可能会异步检索等）
    const messagesForLLM = await strategy.buildMessages(userMessage, history);

    // 3. 调用 LLM
    const reply = await this.llmAdapter.invoke(messagesForLLM);
    // const reply = await this.llmAdapter.stream(messagesForLLM);

    // 4. 将本轮对话追加到历史并更新缓存
    const updatedHistory = [
      ...history,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: reply },
    ];
    await this.cacheService.set(sessionId, updatedHistory as MessageDto[]);

    return { reply };
  }

  /**
   * 供 `@Sse()` 使用：先异步组消息，再订阅 LLM 的 token 流（已是 MessageEvent）。
   * 会话落库可在后续用 scan/finalize 在完整正文上调用 cacheService。
   */
  streamChat({
    chatType,
    userMessage,
    history,
  }: ChatStreamRequest): Observable<MessageEvent> {
    const strategy = this.strategies.get(chatType);

    //  if (!strategy) throw new Error('未知聊天类型');

    // console.log('strategy', strategy);

    // const messages = await strategy.buildMessages(userMessage, history);

    // console.log('messages', messages);

    // return this.llmAdapter.stream(messages);
    // try {
    //   const stream = await ;
    //   for await (const chunk of stream) {
    //     const parts = parseStreamPartsFromChunk(chunk);
    //     for (const part of parts) {
    //       yield JSON.stringify(part);
    //     }
    //   }
    //   yield JSON.stringify({ type: 'done' });
    // } catch (err) {
    //   const message = err instanceof Error ? err.message : String(err);
    //   yield JSON.stringify({ type: 'error', message });
    // }

    // 用 from 将 buildMessages 的 Promise 转换为 Observable
    // return from(strategy.buildMessages(userMessage, history)).pipe(
    //   switchMap((messages) => {
    //     console.log('messages', messages);
    //     // 调用流式 LLM
    //     // 我们需要先把 token 流发给前端，最后再拼装完整回复用于更新缓存
    //     let fullReply = '';
    //     return from(this.llmAdapter.stream(messages)).pipe(
    //       map((token) => {
    //         console.log('token', token);
    //         fullReply += token;
    //         // 发送给前端的 SSE 数据格式：{ data: JSON.stringify({ token }) }
    //         return { data: JSON.stringify({ token }) } as MessageEvent;
    //       }),
    //       // 当流结束时更新缓存（用 finalize 确保即使出错也尝试保存已生成的文本）
    //       // finalize(async () => {
    //       //   if (fullReply) {
    //       //     const updatedHistory = [
    //       //       ...history,
    //       //       { role: 'user', content: userMessage },
    //       //       { role: 'assistant', content: fullReply },
    //       //     ];
    //       //     await this.cacheService.set(sessionId, updatedHistory);
    //       //   }
    //       // }),
    //     );
    //   }),
    // ).toPromise();
    if (!strategy) {
      return throwError(
        () => new BadRequestException(`不支持的聊天类型: ${chatType}`),
      );
    }
    return from(strategy.buildMessages(userMessage, history)).pipe(
      switchMap((messages) => this.llmAdapter.stream(messages)),
    );
  }
}
