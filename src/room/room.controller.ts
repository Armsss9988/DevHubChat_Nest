import {
  Controller,
  Post,
  Get,
  Body,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { MessageService } from '../message/message.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('rooms')
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
    private readonly messageService: MessageService,
  ) {}

  @UseGuards(AuthGuard)
  @Post()
  async create(@Request() req, @Body() createRoomDto: CreateRoomDto) {
    const userId = req.user.id;
    return this.roomService.create(userId, createRoomDto);
  }
  // @UseGuards(AuthGuard)
  // @Get('subscribed')
  // async getSubscribed(@Request() req) {
  //   const userId = req.user['id'];
  //   return this.roomService.getSubscribedRooms(userId);
  // }

  // @UseGuards(AuthGuard)
  // @Get('my')
  // async getMyRooms(@Request() req) {
  //   const userId = req.user['id'];
  //   return this.roomService.getMyRooms(userId);
  // }

  @UseGuards(AuthGuard)
  @Post('check')
  async checkExistingJoin(@Request() req, @Body() { roomId }) {
    const userId = req.user.id;
    return this.roomService.checkExistingJoin(userId, roomId);
  }
  @UseGuards(AuthGuard)
  @Get('code/:code')
  async findRoomByCode(@Request() req, @Param('code') code: string) {
    const userId = req.user.id;
    return this.roomService.findByCode(code, userId);
  }

  @UseGuards(AuthGuard)
  @Post(':id/join')
  async join(@Request() req, @Param('id') id: string, @Body() { password }) {
    const userId = req.user.id;
    const roomId = id;
    await this.roomService.joinRoom(roomId, userId, password);
    return { message: 'Vào room thành công' };
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Request() req, @Param('id') roomId: string) {
    const { id: userId, role } = req.user;
    return this.roomService.remove(userId, role, roomId);
  }

  @UseGuards(AuthGuard)
  @Get('filter')
  async filterRooms(
    @Request() req,
    @Query('name') name?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('isSub') isSub?: string, 
    @Query('owner') owner?: string,
  ) {
    const { id, role } = req.user;
    return this.roomService.filterRooms(
      id,
      role,
      name,
      page,
      pageSize,
      isSub === 'true',
      owner === 'true',
    );
  }

  @UseGuards(AuthGuard)
  @Get('house')
  async getUserHouse(@Request() req) {
    const userId = req.user.id;
    return this.roomService.getUserHouse(userId);
  }
  @UseGuards(AuthGuard)
  @Get(':id')
  async getRoomById(@Request() { user }, @Param('id') roomId: string) {
    const { id: userId, role } = user;
    return this.roomService.getRoomById(userId, role, roomId);
  }

  @UseGuards(AuthGuard)
  @Get('messages/:roomId')
  async getChatHistory(
    @Param('roomId') roomId: string,
    @Query('lastMessageId') lastMessageId?: string,
  ) {
    return this.messageService.getChatHistory(roomId, lastMessageId);
  }
}
