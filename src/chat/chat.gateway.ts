import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from '../message/message.service';

interface MessagePayload {
  content: string;
  userId: string;
  roomId: string;
}

interface ConnectedUser {
  userId: string;
  username: string;
}

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly messageService: MessageService) {}

  // Track users per room
  private roomUsers: Map<string, Map<string, ConnectedUser>> = new Map();

  handleConnection(client: Socket) {
    const { roomId, userId, username } = client.handshake.query as Record<
      string,
      string
    >;

    if (!roomId || !userId || !username) {
      client.disconnect();
      console.error('Missing roomId, userId, or username');
      return;
    }

    client.join(roomId);
    console.log(`✅ Client ${client.id} joined room ${roomId} as ${username}`);

    // Init map if not exists
    if (!this.roomUsers[roomId]) {
      this.roomUsers[roomId] = new Map<string, ConnectedUser>();
    }

    const usersInRoom = this.roomUsers[roomId];

    // Add user if not already added
    if (!usersInRoom.has(userId)) {
      usersInRoom.set(userId, { userId, username });
      this.broadcastRoomUsers(roomId);
    }

    console.log(
      `👥 Current users in ${roomId}:`,
      Array.from(usersInRoom.values()),
    );
  }

  handleDisconnect(client: Socket) {
    const { roomId, userId } = client.handshake.query as Record<string, string>;

    if (!roomId || !userId) return;

    const usersInRoom = this.roomUsers[roomId];
    if (usersInRoom) {
      usersInRoom.delete(userId);
      if (usersInRoom.size === 0) {
        delete this.roomUsers[roomId];
      } else {
        this.broadcastRoomUsers(roomId);
      }
    }

    console.log(`❌ Client ${client.id} (user ${userId}) left room ${roomId}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(client: Socket, payload: MessagePayload) {
    const { content, userId, roomId } = payload;
    if (!content || !userId || !roomId) {
      client.emit('error', { message: 'Invalid message payload' });
      return;
    }

    const message = await this.messageService.create({
      content,
      userId,
      roomId,
    });
    this.server.to(roomId).emit('receive_message', message);
  }

  private broadcastRoomUsers(roomId: string) {
    const users = Array.from(this.roomUsers[roomId]?.values() || []);
    console.log('Onl User:', users);
    this.server.to(roomId).emit('room_users_updated', {
      roomId,
      users,
      count: users.length,
    });
  }
}
