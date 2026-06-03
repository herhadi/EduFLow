import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { QUEUE_JOBS, QUEUES } from '@eduflow/shared';
import { Queue } from 'bullmq';

@Injectable()
export class SchedulerService {
  constructor(
    @InjectQueue(QUEUES.TEACHER_REMINDER)
    private readonly reminderQueue: Queue,
    @InjectQueue(QUEUES.ATTENDANCE_SUMMARY)
    private readonly summaryQueue: Queue,
  ) {}

  scheduleTeacherReminder(data: Record<string, unknown>, delay: number) {
    return this.reminderQueue.add(QUEUE_JOBS.TEACHER_REMINDER_BEFORE_CLASS, data, {
      delay,
    });
  }

  scheduleDailySummary(data: Record<string, unknown>, delay: number) {
    return this.summaryQueue.add(QUEUE_JOBS.ATTENDANCE_SUMMARY_DAILY, data, {
      delay,
    });
  }
}
