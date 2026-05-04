import 'dotenv/config';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // auth
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3035',
    credentials: true,
  });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());

  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.listen(process.env.PORT ?? 3025);
}

bootstrap();
