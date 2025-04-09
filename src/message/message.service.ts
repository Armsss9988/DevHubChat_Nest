import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/src/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from '@prisma/client';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async create(createMessageDto: CreateMessageDto) {
    return await this.prisma.message.create({
      data: createMessageDto,
      include: {
        user: {
          select: {
            username: true,
            id: true,
          },
        },
      },
    });
  }

  async findAll(): Promise<Message[]> {
    return this.prisma.message.findMany();
  }

  async findOne(id: string): Promise<Message> {
    const message = await this.prisma.message.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  async remove(id: string): Promise<Message> {
    return this.prisma.message.delete({ where: { id } });
  }
  async findMessagesByRoom(roomId: string): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
    });
  }
  async getChatHistory(roomId: string, lastMessageId?: string) {
    const take = 20; // Number of messages to fetch per request

    // If `lastMessageId` is provided, fetch messages older than the last message
    const cursor = lastMessageId ? { id: lastMessageId } : undefined;

    const messages = await this.prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take,
      skip: cursor ? 1 : 0, // Skip the cursor message if provided
      cursor,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return messages.reverse(); // Reverse to show oldest messages first
  }
}
