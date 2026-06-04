import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { QUEUE_JOBS, QUEUES } from '@eduflow/shared';
import { Queue } from 'bullmq';

@Injectable()
export class QueueProducerService {
  constructor(
    @InjectQueue(QUEUES.TEACHER_REMINDER)
    private readonly teacherReminderQueue: Queue,
    @InjectQueue(QUEUES.ATTENDANCE_SUMMARY)
    private readonly attendanceSummaryQueue: Queue,
    @InjectQueue(QUEUES.NOTIFICATION_SEND)
    private readonly notificationSendQueue: Queue,
  ) {}

  addTeacherReminderBeforeClass(data: Record<string, unknown>, delay?: number) {
    return this.teacherReminderQueue.add(
      QUEUE_JOBS.TEACHER_REMINDER_BEFORE_CLASS,
      data,
      { delay },
    );
  }

  addAttendanceSummaryDaily(data: Record<string, unknown>, delay?: number) {
    return this.attendanceSummaryQueue.add(
      QUEUE_JOBS.ATTENDANCE_SUMMARY_DAILY,
      data,
      { delay },
    );
  }

  addNotificationSend(
    channel: 'WHATSAPP' | 'TELEGRAM' | 'EMAIL',
    data: Record<string, unknown>,
    delay?: number,
  ) {
    const jobNameByChannel = {
      WHATSAPP: QUEUE_JOBS.NOTIFICATION_SEND_WHATSAPP,
      TELEGRAM: QUEUE_JOBS.NOTIFICATION_SEND_TELEGRAM,
      EMAIL: QUEUE_JOBS.NOTIFICATION_SEND_EMAIL,
    } as const;

    return this.notificationSendQueue.add(jobNameByChannel[channel], data, {
      delay,
    });
  }
}
