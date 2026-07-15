import { Global, Module } from '@nestjs/common';
import { RequestMetricsService } from './request-metrics.service';

@Global()
@Module({
  providers: [RequestMetricsService],
  exports: [RequestMetricsService],
})
export class ObservabilityModule {}
