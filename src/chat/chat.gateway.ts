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
    origin: '#',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly messageService: MessageService,
    private prisma: PrismaService,
  ) {}

  // Map<roomId, Map<userId, ConnectedUser>>
  private roomUsers: Map<string, Map<string, ConnectedUser>> = new Map();

  async handleConnection(client: Socket) {
    const { userId, username } = client.handshake.query as Record<
      string,
      string
    >;

    if (!userId || !username) {
      console.error('⛔ Missing userId or username in handshake');
      client.disconnect();
      return;
    }
    client.data.userId = userId;
    client.data.username = username;

    console.log(`✅ Socket ${client.id} connected as ${username} (${userId})`);
  }

  handleDisconnect(client: Socket) {
    const { userId } = client.handshake.query as Record<string, string>;
    if (!userId) return;
    // Find all rooms this user was in
    for (const [roomId, users] of this.roomUsers.entries()) {
      if (users.has(userId)) {
        users.delete(userId);
        client.leave(roomId);

        if (users.size === 0) {
          this.roomUsers.delete(roomId);
        } else {
          this.broadcastRoomUsers(roomId);
        }

        console.log(`❌ User ${userId} disconnected from room ${roomId}`);
      }
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, payload: { roomId: string }) {
    const { userId, username } = client.handshake.query as Record<
      string,
      string
    >;
    const { roomId } = payload;

    if (!roomId || !userId || !username) {
      console.warn('⚠️ Missing data to join room:', payload);
      return;
    }

    client.join(roomId);

    if (!this.roomUsers.has(roomId)) {
      this.roomUsers.set(roomId, new Map());
    }

    const usersInRoom = this.roomUsers.get(roomId)!;

    if (!usersInRoom.has(userId)) {
      usersInRoom.set(userId, { userId, username });
      this.broadcastRoomUsers(roomId);
    }

    console.log(`📥 User ${username} joined room ${roomId}`);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(client: Socket, payload: { roomId: string }) {
    const { userId } = client.handshake.query as Record<string, string>;
    const { roomId } = payload;

    const usersInRoom = this.roomUsers.get(roomId);
    if (usersInRoom && userId) {
      usersInRoom.delete(userId);
      client.leave(roomId);

      if (usersInRoom.size === 0) {
        this.roomUsers.delete(roomId);
      } else {
        this.broadcastRoomUsers(roomId);
      }

      console.log(`📤 User ${userId} left room ${roomId}`);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(client: Socket, payload: MessagePayload) {
    try {
      const { content, userId, roomId } = payload;
      console.log('📨 Received send_message payload:', payload);
      if (!content || !userId || !roomId) {
        client.emit('error', { message: '❌ Invalid message payload' });
        console.error('❌ Missing fields in payload');
        return;
      }
  
      // 1. Tạo message trong DB
      const message = await this.prisma.message.create({
        data: {
          content,
          userId,
          roomId,
        },
        include: {
          user: true,
          room: true,
        },
      });
  
      console.log('✅ Message saved to DB:', message);
  
      // 2. Gửi message cho mọi người trong phòng
      this.server.to(roomId).emit('receive_message', message);
      console.log(`📡 Message broadcasted to room ${roomId}`);
  
      // 3. Lấy danh sách người đăng ký phòng
      const subscriptions = await this.prisma.roomSubscription.findMany({
        where: { roomId },
        include: { user: true },
      });
  
      const connectedSockets = await this.server.fetchSockets();
      const usersInRoom = this.roomUsers.get(roomId) ?? new Map();
  
      // 4. Tạo danh sách notification cần tạo vào DB
      const notificationsToCreate: { userId: string; roomId: string; type: NotificationType; messageId: string }[] = [];
  
      for (const socket of connectedSockets) {
        const socketUserId = socket.data?.userId;
        if (!socketUserId || socketUserId === userId) continue;
  
        const isSubscribed = subscriptions.find((sub) => sub.userId === socketUserId);
        const isHeInRoomAlready = usersInRoom.has(socketUserId);
  
        if (isSubscribed && !isHeInRoomAlready) {
          // Push vào danh sách để tạo notification vào DB
          notificationsToCreate.push({
            userId: socketUserId,
            roomId,
            type: 'NEW_MESSAGE',
            messageId: message.id,
          });
  
          // Emit real-time notification
          const notification: NotificationPayload = {
            type: 'NEW_MESSAGE',
            roomId: message.roomId,
            roomName: message.room?.name || '',
            content: message.content,
            fromUserId: message.userId,
            fromUsername: message.user?.username || '',
            createdAt: message.createdAt.toISOString(),
            messageId: message.id,
            isRead: false,
          };
  
          console.log(`🚀 Emitting notification to user ${socketUserId}:`, notification);
          socket.emit('notification', notification);
        }
      }
  
      if (notificationsToCreate.length > 0) {
        await this.prisma.notification.createMany({
          data: notificationsToCreate,
        });
        console.log(`📝 Notifications saved for ${notificationsToCreate.length} users`);
      }
    } catch (error) {
      console.error('🔥 Error in handleSendMessage:', error);
      client.emit('error', {
        message: 'Server error while sending message',
      });
    }
  }
  

  private broadcastRoomUsers(roomId: string) {
    const users = Array.from(this.roomUsers.get(roomId)?.values() || []);
    this.server.to(roomId).emit('room_users_updated', {
      roomId,
      users: users.map(({ userId, username }) => ({
        id: userId,
        username,
      })),
      count: users.length,
    });
  }
}
