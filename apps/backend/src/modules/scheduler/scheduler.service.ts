import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { QUEUES } from '@eduflow/shared';
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
    return this.reminderQueue.add('teacher:reminder', data, { delay });
  }

  scheduleDailySummary(data: Record<string, unknown>, delay: number) {
    return this.summaryQueue.add('attendance:summary', data, { delay });
  }
}
