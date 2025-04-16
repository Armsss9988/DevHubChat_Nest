import { Module } from '@nestjs/common';
import { SubscribeService } from './subscribe.service';
import { SubscribeController } from './subscribe.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RoomModule } from '../room/room.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, RoomModule, AuthModule],
  controllers: [SubscribeController],
  providers: [SubscribeService],
})
export class SubscribeModule {}
