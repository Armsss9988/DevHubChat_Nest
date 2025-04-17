// src/gateways/chat.module.ts
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessageModule } from '../message/message.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [MessageModule, PrismaModule],
  providers: [ChatGateway],
})
export class ChatModule {}
