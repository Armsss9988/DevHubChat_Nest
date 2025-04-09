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
  private roomUsersCount: Record<string, number> = {};
  handleConnection(client: Socket) {
    const roomId = client.handshake.query.roomId as string;
    console.log('New client connected:', client.id);
    console.log('Handshake query:', client.handshake.query);
    console.log('Room ID from query:', roomId);
    if (!roomId) {
      client.disconnect(); // Disconnect client if roomId is missing
      console.error('Client connection rejected: Missing roomId');
      return;
    }

    console.log(`Client ${client.id} connected to room: ${roomId}`);
    client.join(roomId);
    this.roomUsersCount[roomId] = (this.roomUsersCount[roomId] || 0) + 1;

    // Emit updated user count
    this.server.to(roomId).emit('room_user_count_updated', {
      roomId,
      count: this.roomUsersCount[roomId],
    });
  }
  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, roomId: string) {
    if (!roomId) {
      client.emit('error', { message: 'Room ID is required' });
      console.error('Room ID is missing');
      return;
    }

    client.join(roomId);
    this.roomUsersCount[roomId] = (this.roomUsersCount[roomId] || 0) + 1;

    this.server.to(roomId).emit('room_user_count_updated', {
      roomId,
      count: this.roomUsersCount[roomId],
    });

    console.log(`Client ${client.id} joined room: ${JSON.stringify(roomId)}`);
  }
  @SubscribeMessage('leave_room')
  handleLeaveRoom(client: Socket, roomId: string) {
    client.leave(roomId);
    if (this.roomUsersCount[roomId]) {
      this.roomUsersCount[roomId]--;

      if (this.roomUsersCount[roomId] === 0) {
        delete this.roomUsersCount[roomId]; // Clean up empty room
      }

      this.server.to(roomId).emit('room_user_count_updated', {
        roomId,
        count: this.roomUsersCount[roomId] || 0,
      });
      console.log(`${client.id} left room: ${JSON.stringify(roomId)}`);
    }
  }
  @SubscribeMessage('send_message')
  async handleMessage(client: Socket, payload: MessagePayload) {
    const { content, userId, roomId } = payload;
    console.log('sended message', userId, roomId, content);
    if (!content || !userId || !roomId) {
      client.emit('error', { message: 'Invalid message payload' });
      console.error('Invalid message payload:', payload);
      return;
    }

    const message = await this.messageService.create({
      content,
      userId,
      roomId,
    });

    this.server.to(roomId).emit('receive_message', message);
  }
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Optionally, clean up roomUsersCount or other resources here
  }
}
