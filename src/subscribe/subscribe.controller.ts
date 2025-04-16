import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SubscribeService } from './subscribe.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('subscribe')
export class SubscribeController {
  constructor(private readonly subscribeService: SubscribeService) {}

  @Post(':roomId')
  async subscribeRoom(@Param('roomId') roomId: string, @Req() req) {
    const userId = req.user.id;
    return this.subscribeService.subscribe(roomId, userId);
  }

  @Delete(':roomId')
  async unsubscribeRoom(@Param('roomId') roomId: string, @Req() req) {
    const userId = req.user['id'];
    return this.subscribeService.unsubscribe(roomId, userId);
  }

  @Get(':roomId')
  async isSubscribed(@Param('roomId') roomId: string, @Req() req) {
    const userId = req.user['id'];
    return this.subscribeService.isSubscribed(roomId, userId);
  }

  @Get('user/subscribed')
  async getSubscribedRooms(@Req() req) {
    const userId = req.user['id'];
    return this.subscribeService.getUserSubscriptions(userId);
  }
}
