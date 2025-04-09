import {
  Controller,
  Post,
  Get,
  Body,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { MessageService } from '../message/message.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Controller('rooms')
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
    private readonly messageService: MessageService,
  ) {}

  @Post()
  async create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomService.create(createRoomDto);
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roomService.remove(id);
  }

  @Get()
  async findAll() {
    return this.roomService.findAll();
  }
  @Get('/messages/:roomId')
  async getChatHistory(
    @Param('roomId') roomId: string,
    @Query('lastMessageId') lastMessageId?: string,
  ) {
    return this.messageService.getChatHistory(roomId, lastMessageId);
  }
}
