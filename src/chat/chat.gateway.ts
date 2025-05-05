import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from '../message/message.service';
import { PrismaService } from '../prisma/prisma.service';

interface MessagePayload {
  content: string;
  userId: string;
  roomId: string;
  files?: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  }[];
}

interface ConnectedUser {
  userId: string;
  username: string;
}

export type NotificationType = 'NEW_MESSAGE' | 'OTHER_TYPES_LATER';

interface NotificationPayload {
  type: NotificationType;
  roomId: string;
  roomName: string;
  content: string;
  fromUserId: string;
  fromUsername: string;
  createdAt: string;
  messageId: string;
  isRead: boolean;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Allow all origins for dev; use specific domains in production
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly roomUsers = new Map<string, Map<string, ConnectedUser>>();

  constructor(
    private readonly messageService: MessageService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const { userId, username } = client.handshake.query as Record<
      string,
      string
    >;

    if (!userId || !username) {
      console.error('⛔ Missing userId or username in handshake');
      return client.disconnect();
    }

    client.data = { userId, username };
    console.log(`✅ Socket ${client.id} connected as ${username} (${userId})`);
  }

  handleDisconnect(client: Socket) {
    const { userId } = client.data;
    if (!userId) return;

    for (const [roomId, users] of this.roomUsers.entries()) {
      if (users.delete(userId)) {
        client.leave(roomId);
        users.size
          ? this.broadcastRoomUsers(roomId)
          : this.roomUsers.delete(roomId);
        console.log(`❌ User ${userId} disconnected from room ${roomId}`);
      }
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, { roomId }: { roomId: string }) {
    const { userId, username } = client.data;

    if (!roomId || !userId || !username) {
      console.warn('⚠️ Missing data to join room:', {
        roomId,
        userId,
        username,
      });
      return;
    }

    client.join(roomId);
    const usersInRoom = this.roomUsers.get(roomId) ?? new Map();

    if (!usersInRoom.has(userId)) {
      usersInRoom.set(userId, { userId, username });
      this.roomUsers.set(roomId, usersInRoom);
      this.broadcastRoomUsers(roomId);
    }

    console.log(`📥 User ${username} joined room ${roomId}`);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(client: Socket, { roomId }: { roomId: string }) {
    const { userId } = client.data;

    const usersInRoom = this.roomUsers.get(roomId);
    if (usersInRoom?.delete(userId)) {
      client.leave(roomId);
      usersInRoom.size
        ? this.broadcastRoomUsers(roomId)
        : this.roomUsers.delete(roomId);
      console.log(`📤 User ${userId} left room ${roomId}`);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(client: Socket, payload: MessagePayload) {
    try {
      console.warn(
        'Payload file:',
        JSON.stringify(payload.files ? payload?.files[0]?.mimetype || '' : ''),
      );
      const { content, userId, roomId, files } = payload;

      if ((!content && !files) || !userId || !roomId) {
        return client.emit('error', {
          message: 'Thiếu nội dung hoặc thông tin gửi',
        });
      }

      const message = await this.messageService.create(
        {
          content,
          userId,
          roomId,
        },
        files,
      );

      this.server.to(roomId).emit('receive_message', message);
      console.log(`📡 Message broadcasted to room ${roomId}`);

      const [subscriptions, sockets] = await Promise.all([
        this.prisma.roomSubscription.findMany({
          where: { roomId },
          select: { userId: true },
        }),
        this.server.fetchSockets(),
      ]);
      const notiData = subscriptions.map((sub) => ({
        userId: sub.userId,
        roomId: roomId,
        type: 'NEW_MESSAGE',
        messageId: message!.id,
      }));
      if (notiData.length > 0) {
        await this.prisma.notification.createMany({ data: notiData });
        console.log(`📝 Notifications saved for ${notiData.length} users`);
      }
      const usersInRoom = this.roomUsers.get(roomId) ?? new Map();
      sockets.map((socket) => {
        const socketUserId = socket.data?.userId;

        if (!socketUserId || socketUserId === userId) return [];

        const isSubscribed = subscriptions.some(
          (sub) => sub.userId === socketUserId,
        );
        const isNotInRoom = !usersInRoom.has(socketUserId);

        if (isSubscribed && isNotInRoom) {
          const notification: NotificationPayload = {
            type: 'NEW_MESSAGE',
            roomId,
            roomName: message?.room.name || '',
            content: message?.content || '',
            fromUserId: message!.userId,
            fromUsername: message!.user?.username || '',
            createdAt: message!.createdAt.toISOString(),
            messageId: message!.id,
            isRead: false,
          };
          socket.emit('notification', notification);
        }
      });
    } catch (error) {
      console.error('🔥 Error in handleSendMessage:', error);
      client.emit('error', { message: 'Server error while sending message' });
    }
  }

  private broadcastRoomUsers(roomId: string) {
    const users = Array.from(this.roomUsers.get(roomId)?.values() || []);
    this.server.to(roomId).emit('room_users_updated', {
      roomId,
      users: users.map(({ userId, username }) => ({ id: userId, username })),
      count: users.length,
    });
  }
}
