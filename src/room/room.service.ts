import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/src/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { Room } from '@prisma/client';

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  async create(createRoomDto: CreateRoomDto) {
    const room = this.prisma.room.create({
      data: {
        name: createRoomDto.name,
      },
    });
    return room;
  }
  findOne = async (id: string): Promise<Room> => {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Users not found');
    return room;
  };
  remove = async (id: string) => {
    return this.prisma.room.delete({ where: { id } });
  };

  async findAll(): Promise<Room[]> {
    const rooms = await this.prisma.room.findMany();
    if (!rooms) throw new NotFoundException('Users not found');
    return rooms;
  }
}
