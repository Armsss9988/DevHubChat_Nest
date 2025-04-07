import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/src/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from '@prisma/client';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    return this.prisma.message.create({
      data: {
        content: createMessageDto.content,
        roomId: createMessageDto.roomId,
        userId: createMessageDto.userId,
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
}