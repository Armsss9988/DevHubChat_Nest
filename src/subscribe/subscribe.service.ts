import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SubscribeService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(roomId: string, userId: string) {
    return await this.prisma.roomSubscription.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: {},
      create: { roomId, userId },
    });
  }

  async unsubscribe(roomId: string, userId: string) {
    try {
      return await this.prisma.roomSubscription.delete({
        where: { roomId_userId: { roomId, userId } },
      });
    } catch (err) {
      throw new NotFoundException('Subscription not found');
    }
  }

  async isSubscribed(roomId: string, userId: string) {
    const subscription = await this.prisma.roomSubscription.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    return !!subscription;
  }

  async getUserSubscriptions(userId: string) {
    return await this.prisma.roomSubscription.findMany({
      where: { userId },
      include: { room: true },
    });
  }
}
