import { Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequestWithUser } from '../../core/http/request-with-user';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('mine')
  getMine(@Req() request: RequestWithUser) {
    return this.notificationService.getMine(
      request.user.id,
      request.user.roles ?? [],
    );
  }

  @Patch('mine/:id/read')
  markMineAsRead(@Req() request: RequestWithUser, @Param('id') id: string) {
    return this.notificationService.markAsRead(
      request.user.id,
      request.user.roles ?? [],
      id,
    );
  }

  @RequirePermissions(PERMISSIONS.NOTIFICATION_READ)
  @Get('sent')
  getSent() {
    return this.notificationService.getSent();
  }

  @RequirePermissions(PERMISSIONS.NOTIFICATION_READ)
  @Get('failed')
  getFailed() {
    return this.notificationService.getFailed();
  }

  @RequirePermissions(PERMISSIONS.NOTIFICATION_READ)
  @Get('pending')
  getPending() {
    return this.notificationService.getPending();
  }

  @RequirePermissions(PERMISSIONS.NOTIFICATION_READ)
  @Get('retry')
  getRetryQueue() {
    return this.notificationService.getPending();
  }

  @RequirePermissions(PERMISSIONS.NOTIFICATION_MANAGE)
  @Post('retry/:id')
  retry(@Param('id') id: string) {
    return this.notificationService.retry(id);
  }

  @RequirePermissions(PERMISSIONS.NOTIFICATION_MANAGE)
  @Get('templates')
  getTemplates() {
    return this.notificationService.getTemplates();
  }
}
