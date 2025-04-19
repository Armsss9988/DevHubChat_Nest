import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@/src/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { Room, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createRoomDto: CreateRoomDto): Promise<Room> {
    const roomCode = await this.generateRoomCode();
    return this.prisma.room.create({
      data: {
        name: createRoomDto.name,
        description: createRoomDto.description,
        roomCode,
        password: createRoomDto.password
          ? await bcrypt.hash(createRoomDto.password, 10)
          : undefined,
        creatorId: userId,
      },
    });
  }

  async remove(userId: string, role: string, id: string): Promise<Room> {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (role !== Role.ADMIN) {
      if (!room) {
        throw new NotFoundException(`Room with ID ${id} not found`);
      }
      if (room.creatorId !== userId) {
        throw new ForbiddenException('Only the creator can delete this room');
      }
    }
    return this.prisma.room.delete({ where: { id } });
  }

  async checkExistingJoin(userId: string, roomId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { password: true },
    });

    if (!room) throw new Error('Room not found');
    if (!room.password) {
      return true;
    }
    const existingJoin = await this.prisma.userRoomJoin.findFirst({
      where: { userId, roomId },
    });

    if (existingJoin) return true;
    return false;
  }

  async joinRoom(
    roomId: string,
    userId: string,
    password?: string,
  ): Promise<void> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }
    if (room.password) {
      const existingJoin = await this.prisma.userRoomJoin.findFirst({
        where: { userId, roomId },
      });
      if (!existingJoin) {
        if (!password) {
          throw new ForbiddenException('Password required');
        }
        const isPasswordValid = await bcrypt.compare(password, room.password);
        if (!isPasswordValid) {
          throw new ForbiddenException('Incorrect password');
        }
        await this.prisma.userRoomJoin.create({
          data: {
            userId,
            roomId,
          },
        });
      }
    }
  }

  async getRoomById(
    userId: string,
    role: Role,
    roomId: string,
  ): Promise<Partial<Room> & { hasPassword?: boolean; isSub?: boolean }> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { creator: { select: { id: true, username: true } } },
    });
    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }
    if (room.creatorId === userId || role === Role.ADMIN) {
      return room;
    }
    const hasJoined = await this.prisma.userRoomJoin.findFirst({
      where: { userId, roomId },
    });
    if (!hasJoined && room.password) {
      throw new ForbiddenException('Bạn không có quyền vào room');
    }
    const isSub = !!(await this.prisma.userRoomJoin.findFirst({
      where: { userId, roomId },
    }));
    const { password, ...data } = room;
    return { ...data, isSub };
  }

  async filterRooms(
    userId: string,
    role: Role,
    name?: string,
    page: number = 1,
    pageSize: number = 12,
    isSub?: boolean,
    owner?: boolean,
  ): Promise<{
    rooms: (Partial<Room> & {
      subCount: number;
      isSub?: boolean;
      hasPassword?: boolean;
      isJoined?: boolean;
      unreadCount: number;
    })[];
    total: number;
  }> {
    const take = Number(pageSize);
    const skip = (Number(page) - 1) * take;

    const where: Prisma.RoomWhereInput = name
      ? { name: { contains: name, mode: Prisma.QueryMode.insensitive } }
      : {};

    if (role !== Role.ADMIN && owner) {
      where.creatorId = userId;
    }

    const [rooms, total] = await this.prisma.$transaction([
      this.prisma.room.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          creator: { select: { id: true, username: true } },
          _count: { select: { subscriptions: true } },
        },
      }),
      this.prisma.room.count({ where }),
    ]);

    if (role === Role.ADMIN) {
      return {
        rooms: rooms.map(({ _count, ...room }) => ({
          ...room,
          subCount: _count.subscriptions,
          unreadCount: 0,
        })),
        total,
      };
    }

    const currentRoomIds = rooms.map((r) => r.id);

    const [subscriptions, joinedRooms, rawUnreadGrouped] =
      await this.prisma.$transaction([
        this.prisma.roomSubscription.findMany({
          where: { userId, roomId: { in: currentRoomIds } },
          select: { roomId: true },
        }),
        this.prisma.userRoomJoin.findMany({
          where: { userId, roomId: { in: currentRoomIds } },
          select: { roomId: true },
        }),
        this.prisma.notification.groupBy({
          by: ['roomId'],
          where: {
            userId,
            roomId: { in: currentRoomIds },
            isRead: false,
          },
          orderBy: {
            roomId: 'asc',
          },
          _count: { id: true },
        }),
      ]);
    const unreadGrouped = rawUnreadGrouped as {
      roomId: string;
      _count: { id: number };
    }[];
    const subscribedRoomIds = new Set(subscriptions.map((s) => s.roomId));
    const joinedRoomIds = new Set(joinedRooms.map((j) => j.roomId));
    const unreadMap = new Map(
      unreadGrouped.map((g) => [g.roomId, g._count?.id ?? 0]),
    );

    const mapped = rooms
      .map(({ password, _count, ...room }) => {
        const isSubscribed = subscribedRoomIds.has(room.id);
        const isJoined = joinedRoomIds.has(room.id);
        const unreadCount = unreadMap.get(room.id) || 0;
        return {
          ...room,
          subCount: _count.subscriptions,
          hasPassword: !!password,
          isJoined,
          isSub: isSubscribed,
          unreadCount,
        };
      })
      .filter((room) => {
        if (isSub === true && !room.isSub) return false;
        return true;
      });

    return {
      rooms: mapped,
      total: mapped.length,
    };
  }

  async findByCode(
    code: string,
    userId: string,
  ): Promise<Partial<Room> & { hasPassword: boolean; isJoined: boolean }> {
    const room = await this.prisma.room.findUnique({
      where: { roomCode: code },
    });
    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng nào');
    }
    const { password, ...roomData } = room;
    const joinedRooms = await this.prisma.userRoomJoin.findMany({
      where: { userId },
      select: { roomId: true },
    });
    const joinedRoomIds = new Set(joinedRooms.map((j) => j.roomId));

    return {
      ...roomData,
      hasPassword: !!password,
      isJoined: joinedRoomIds.has(room.id),
    };
  }

  async getUserHouse(userId: string): Promise<Room[]> {
    return this.prisma.room.findMany({
      where: { creatorId: userId },
      include: { creator: { select: { id: true, username: true } } },
    });
  }

  private async generateRoomCode(): Promise<string> {
    let roomCode: string;
    let existingRoom: Room | null;
    do {
      roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      existingRoom = await this.prisma.room.findUnique({ where: { roomCode } });
    } while (existingRoom);
    return roomCode;
  }

  // async getSubscribedRooms(userId: string) {
  //   const rooms = await this.prisma.room.findMany({
  //     where: {
  //       subscriptions: {
  //         some: {
  //           userId,
  //         },
  //       },
  //     },
  //     include: {
  //       creator: true,
  //     },
  //   });

  //   const unreadCounts = await this.prisma.notification.groupBy({
  //     by: ['roomId'],
  //     where: {
  //       userId,
  //       isRead: false,
  //     },
  //     _count: {
  //       id: true,
  //     },
  //   });
  //   const joinedRooms = await this.prisma.userRoomJoin.findMany({
  //     where: { userId },
  //     select: { roomId: true },
  //   });
  //   const joinedRoomIds = new Set(joinedRooms.map((j) => j.roomId));
  //   const result = rooms.map((room) => {
  //     const countObj = unreadCounts.find((c) => c.roomId === room.id);
  //     return {
  //       ...room,
  //       unreadCount: countObj?._count.id || 0,
  //       isJoined: joinedRoomIds.has(room.id),
  //     };
  //   });

  //   return result;
  // }

  // async getMyRooms(userId: string) {
  //   const rooms = await this.prisma.room.findMany({
  //     where: {
  //       creatorId: userId,
  //     },
  //     include: {
  //       _count: {
  //         select: {
  //           messages: true,
  //           subscriptions: true,
  //         },
  //       },
  //     },
  //   });
  //   const unreadCounts = await this.prisma.notification.groupBy({
  //     by: ['roomId'],
  //     where: {
  //       userId,
  //       isRead: false,
  //     },
  //     _count: {
  //       id: true,
  //     },
  //   });

  //   const joinedRooms = await this.prisma.userRoomJoin.findMany({
  //     where: { userId },
  //     select: { roomId: true },
  //   });
  //   const joinedRoomIds = new Set(joinedRooms.map((j) => j.roomId));
  //   const result = rooms.map((room) => {
  //     const countObj = unreadCounts.find((c) => c.roomId === room.id);
  //     return {
  //       ...room,
  //       unreadCount: countObj?._count.id || 0,
  //       isJoined: joinedRoomIds.has(room.id),
  //     };
  //   });

  //   return result;
  // }
}
