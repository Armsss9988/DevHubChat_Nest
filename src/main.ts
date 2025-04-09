import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
async function bootstrap() {
  const config = new DocumentBuilder()
    .setTitle('DevHub API')
    .setDescription('API Docs cho DevHub')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    credentials: true,
  });
  app.useWebSocketAdapter(new IoAdapter(app));
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
