import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/src/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { Room, Prisma } from '@prisma/client';

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  async create(createRoomDto: CreateRoomDto) {
    const room = this.prisma.room.create({
      data: {
        name: createRoomDto.name,
        description: createRoomDto.description,
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
  async getRoomById(id: string): Promise<Room> {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
    return room;
  }
  async filterRooms(
    name?: string,
    page: number = 1,
    pageSize: number = 12,
  ): Promise<{ rooms: Room[]; total: number }> {
    const take = Number(pageSize);
    const skip = (Number(page) - 1) * take;

    const where: Prisma.RoomWhereInput = name
      ? { name: { contains: name, mode: Prisma.QueryMode.insensitive } }
      : {};

    const [rooms, total] = await this.prisma.$transaction([
      this.prisma.room.findMany({
        where,
        skip,
        take: take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.room.count({ where }),
    ]);

    return { rooms, total };
  }
}
