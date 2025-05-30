import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { PrismaClientExceptionFilter } from './filter/prisma-exception.filter';
import { LoggingInterceptor } from './interceptor/logger-interceptor';

async function bootstrap() {
  const config = new DocumentBuilder()
    .setTitle('DevHub API')
    .setDescription('API Docs cho DevHub')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new PrismaClientExceptionFilter());
  app.use(cookieParser());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableCors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  });
  app.useWebSocketAdapter(new IoAdapter(app));
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
