import { Body, Controller, Get, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperationsService } from './operations.service';
import { RequestWithUser } from '../../core/http/request-with-user';

@Controller('operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.SYSTEM_RECOVERY_MANAGE)
  getDashboard() {
    return this.operationsService.getDashboard();
  }

  @Get('telegram')
  @RequirePermissions(PERMISSIONS.SYSTEM_RECOVERY_MANAGE)
  getTelegramStatus() {
    return this.operationsService.getTelegramStatus();
  }

  @Post('telegram/webhook')
  @RequirePermissions(PERMISSIONS.SYSTEM_RECOVERY_MANAGE)
  setTelegramWebhook(@Req() request: RequestWithUser) {
    return this.operationsService.setTelegramWebhook(request.user.id);
  }

  @Post('telegram/webhook/delete')
  @RequirePermissions(PERMISSIONS.SYSTEM_RECOVERY_MANAGE)
  deleteTelegramWebhook(@Req() request: RequestWithUser) {
    return this.operationsService.deleteTelegramWebhook(request.user.id);
  }

  @Get('backups')
  @RequirePermissions(PERMISSIONS.SYSTEM_RECOVERY_MANAGE)
  getBackups() { return this.operationsService.getBackups(); }

  @Post('backups/daily')
  @RequirePermissions(PERMISSIONS.SYSTEM_RECOVERY_MANAGE)
  async createDailyBackup(@Req() request: RequestWithUser, @Res() response: Response) {
    const { filename, process } = await this.operationsService.createDailyBackup(request.user.id);
    response.setHeader('Content-Type', 'application/octet-stream');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    process.stdout.pipe(response);
    process.stderr.on('data', () => undefined);
  }

  @Post('backups/daily/restore')
  @RequirePermissions(PERMISSIONS.SYSTEM_RECOVERY_MANAGE)
  @UseInterceptors(FileInterceptor('file'))
  restoreDailyBackup(@UploadedFile() file: { buffer: Buffer; originalname: string; size: number } | undefined, @Body() body: { confirmation?: string }, @Req() request: RequestWithUser) {
    return this.operationsService.restoreDailyBackup(file, body.confirmation, request.user.id);
  }

  @Post('backups/academic-year')
  @RequirePermissions(PERMISSIONS.SYSTEM_RECOVERY_MANAGE)
  createAcademicYearBackup(@Body() body: { schoolYearId: string }, @Req() request: RequestWithUser) {
    return this.operationsService.createAcademicYearBackup(body.schoolYearId, request.user.id);
  }

  @Post('jobs/retry')
  @RequirePermissions(PERMISSIONS.REPORTING_MANAGE)
  retryJob(@Body() body: { queueName: string; jobId: string }) {
    return this.operationsService.retryJob(body.queueName, body.jobId);
  }

  @Post('jobs/discard')
  @RequirePermissions(PERMISSIONS.REPORTING_MANAGE)
  discardJob(@Body() body: { queueName: string; jobId: string }) {
    return this.operationsService.discardJob(body.queueName, body.jobId);
  }
}
