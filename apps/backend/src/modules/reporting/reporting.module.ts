import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { ReportExportService } from './report-export.service';
import { ReportingService } from './reporting.service';

@Module({
  controllers: [ReportingController],
  providers: [ReportingService, ReportExportService],
  exports: [ReportingService],
})
export class ReportingModule {}
