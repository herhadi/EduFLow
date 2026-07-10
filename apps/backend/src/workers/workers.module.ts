import { Module } from '@nestjs/common';
import { TelegramModule } from '../infrastructure/telegram/telegram.module';
import { NotificationWorker } from './notification.worker';
import { ReminderWorker } from './reminder.worker';
import { ReportingWorker } from './reporting.worker';
import { SummaryWorker } from './summary.worker';

@Module({
  imports: [TelegramModule],
  providers: [
    NotificationWorker,
    ReminderWorker,
    ReportingWorker,
    SummaryWorker,
  ],
})
export class WorkersModule {}
