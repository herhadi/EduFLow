import { Module } from '@nestjs/common';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { ReportingController } from './reporting.controller';
import { ReportExportService } from './report-export.service';
import { ReportingService } from './reporting.service';

@Module({
  imports: [StorageModule],
  controllers: [ReportingController],
  providers: [ReportingService, ReportExportService],
  exports: [ReportingService],
})
export class ReportingModule {}
