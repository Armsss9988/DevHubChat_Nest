import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from '../message/message.service';

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly messageService: MessageService) {}

  handleConnection(client: Socket) {
    const roomId = client.handshake.query.roomId as string;
    if (roomId) {
      client.join(roomId);
    }
  }
  @SubscribeMessage('leave_room')
  handleLeaveRoom(client: Socket, roomId: string) {
    // Rời khỏi phòng
    client.leave(roomId);
    console.log(`${client.id} left room: ${roomId}`);
  }
  @SubscribeMessage('send_message')
  async handleMessage(client: Socket, payload: any) {
    const { content, userId, roomId } = payload;
    const message = await this.messageService.create({
      content,
      userId,
      roomId,
    });
    this.server.to(roomId).emit('receive_message', message);
  }
}
