import { Controller, Get, Patch, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from '@/src/auth/guards/auth.guard';
import { Request } from 'express';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get('me')
  async getMyNotifications(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.notificationService.getUserNotifications(user.id);
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.notificationService.markAllAsRead(user.id);
  }
}
