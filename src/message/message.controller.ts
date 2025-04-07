import { Controller, Post, Get, Delete, Param, Body } from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  async create(@Body() createMessageDto: CreateMessageDto) {
    return this.messageService.create(createMessageDto);
  }

  @Get()
  async findAll() {
    return this.messageService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.messageService.findOne(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.messageService.remove(id);
  }
  @Get('/rooms/:id/messages')
  async findMessagesByRoom(@Param('id') roomId: string) {
    return this.messageService.findMessagesByRoom(roomId);
  }
}
