import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('database')
  getDatabaseHealth() {
    return this.healthService.getDatabaseHealth();
  }

  @Get('redis')
  getRedisHealth() {
    return this.healthService.getRedisHealth();
  }

  @Get('queue')
  getQueueHealth() {
    return this.healthService.getQueueHealth();
  }
}
