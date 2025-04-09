import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { PrismaModule } from '@/src/prisma/prisma.module';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [PrismaModule, MessageModule],
  controllers: [RoomController],
  providers: [RoomService],
})
export class RoomModule {}
