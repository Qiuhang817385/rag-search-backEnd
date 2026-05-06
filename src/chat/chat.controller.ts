import { Body, Controller, MessageEvent, Post, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';

import { ChatRouterService } from './chat-router.service';
import type { ChatStreamRequest } from './chat-router.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatRouterService: ChatRouterService) {}

  // 老的写法，自己处理sse
  // streamChat(
  //   @Body() body: ChatStreamRequest,
  //   @Res({ passthrough: false }) res: Response,
  // ) {
  //   res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  //   res.setHeader('Cache-Control', 'no-cache, no-transform');
  //   res.setHeader('Connection', 'keep-alive');
  //   res.setHeader('X-Accel-Buffering', 'no');

  //   console.log('body', body);

  //   try {
  //     res.write(this.chatRouterService.streamChat(body));
  //   } catch (err) {
  //     res.status(500).send({ type: 'error', message: err.message });
  //   }

  /** Nest 负责 `text/event-stream` 与逐条写出；body 仍为 JSON POST */
  @Post('stream')
  @Sse()
  streamChat(@Body() body: ChatStreamRequest): Observable<MessageEvent> {
    return this.chatRouterService.streamChat(body);
  }
}
