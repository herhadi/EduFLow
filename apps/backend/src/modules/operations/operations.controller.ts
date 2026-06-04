import { Body, Controller, Get, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { OperationsService } from './operations.service';

@Public()
@Controller('operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.operationsService.getDashboard();
  }

  @Post('jobs/retry')
  retryJob(@Body() body: { queueName: string; jobId: string }) {
    return this.operationsService.retryJob(body.queueName, body.jobId);
  }

  @Post('jobs/discard')
  discardJob(@Body() body: { queueName: string; jobId: string }) {
    return this.operationsService.discardJob(body.queueName, body.jobId);
  }
}
