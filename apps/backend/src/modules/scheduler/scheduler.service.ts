import { Injectable } from '@nestjs/common';
import { QueueProducerService } from '../../queue/queue-producer.service';

@Injectable()
export class SchedulerService {
  constructor(private readonly queueProducer: QueueProducerService) {}

  scheduleTeacherReminder(data: Record<string, unknown>, delay: number) {
    return this.queueProducer.addTeacherReminderBeforeClass(data, delay);
  }

  scheduleDailySummary(data: Record<string, unknown>, delay: number) {
    return this.queueProducer.addAttendanceSummaryDaily(data, delay);
  }
}
