import { Module } from '@nestjs/common';
import { NotificationWorker } from './notification.worker';
import { ReminderWorker } from './reminder.worker';
import { ReportingWorker } from './reporting.worker';
import { SummaryWorker } from './summary.worker';

@Module({
  providers: [
    NotificationWorker,
    ReminderWorker,
    ReportingWorker,
    SummaryWorker,
  ],
})
export class WorkersModule {}

