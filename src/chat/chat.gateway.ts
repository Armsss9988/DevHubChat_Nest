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
    origin: 'http://localhost:3000', // change to your frontend origin in production
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly messageService: MessageService) {}

  // Map<roomId, Map<userId, ConnectedUser>>
  private roomUsers: Map<string, Map<string, ConnectedUser>> = new Map();

  async handleConnection(client: Socket) {
    const { userId, username } = client.handshake.query as Record<string, string>;

    if (!userId || !username) {
      console.error('⛔ Missing userId or username in handshake');
      client.disconnect();
      return;
    }

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
    const { userId, username } = client.handshake.query as Record<string, string>;
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
