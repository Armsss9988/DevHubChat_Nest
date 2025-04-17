import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { RoomModule } from './room/room.module';
import { MessageModule } from './message/message.module';
import { ChatGateway } from './chat/chat.gateway';
import { SubscribeModule } from './subscribe/subscribe.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    RoomModule,
    MessageModule,
    SubscribeModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService, ChatGateway],
})
export class AppModule {}
