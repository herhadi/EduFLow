import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { QUEUES } from '@eduflow/constants';
import { Queue } from 'bullmq';

@Injectable()
export class SchedulerService {
  constructor(
    @InjectQueue(QUEUES.REMINDER)
    private readonly reminderQueue: Queue,
    @InjectQueue(QUEUES.SUMMARY)
    private readonly summaryQueue: Queue,
  ) {}

  scheduleTeacherReminder(data: Record<string, unknown>, delay: number) {
    return this.reminderQueue.add('teacher.reminder', data, { delay });
  }

  scheduleDailySummary(data: Record<string, unknown>, delay: number) {
    return this.summaryQueue.add('daily.summary', data, { delay });
  }
}

