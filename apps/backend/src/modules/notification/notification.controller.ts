import { Controller, Get, Param, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { NotificationService } from './notification.service';

@Public()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('sent')
  getSent() {
    return this.notificationService.getSent();
  }

  @Get('failed')
  getFailed() {
    return this.notificationService.getFailed();
  }

  @Get('pending')
  getPending() {
    return this.notificationService.getPending();
  }

  @Get('retry')
  getRetryQueue() {
    return this.notificationService.getPending();
  }

  @Post('retry/:id')
  retry(@Param('id') id: string) {
    return this.notificationService.retry(id);
  }

  @Get('templates')
  getTemplates() {
    return this.notificationService.getTemplates();
  }
}
