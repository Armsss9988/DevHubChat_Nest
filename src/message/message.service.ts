import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/src/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from '@prisma/client';
import cloudinary from '../cloudinary/cloudinary.provider';
import { UploadApiResponse } from 'cloudinary';
@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async create(
    createMessageDto: CreateMessageDto,
    files?: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
    }[],
  ) {
    const message = await this.prisma.message.create({
      data: createMessageDto,
    });
    if (files?.length) {
      const streamifier = await import('streamifier');

      const mediaPromises = files.map(async (file) => {
        const fileBuffer = Buffer.from(file.buffer);
        const result = await new Promise<UploadApiResponse>(
          (resolve, reject) => {
            const uploaded = cloudinary.uploader.upload_stream(
              {
                resource_type: 'auto',
                folder: 'DevHub',
              },
              (error, result) => {
                if (error) return reject(error);
                if (!result)
                  return reject(new Error('No result from Cloudinary'));
                return resolve(result);
              },
            );
            streamifier.createReadStream(fileBuffer).pipe(uploaded);
          },
        );
        return {
          url: result.secure_url,
          type: file.mimetype,
          messageId: message.id,
        };
      });

      const mediaData = await Promise.all(mediaPromises);
      await this.prisma.media.createMany({ data: mediaData });
    }
    return this.prisma.message.findUnique({
      where: { id: message.id },
      include: {
        media: true,
        user: {
          select: {
            username: true,
            id: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
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
    const take = 20; 

    const cursor = lastMessageId ? { id: lastMessageId } : undefined;

    const messages = await this.prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take,
      skip: cursor ? 1 : 0, 
      cursor,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        media: true,
      },
    });

    return messages.reverse(); 
  }
}
