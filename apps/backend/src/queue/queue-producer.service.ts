import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { QUEUE_JOBS, QUEUES } from '@eduflow/shared';
import { Job, Queue } from 'bullmq';

@Injectable()
export class QueueProducerService {
  private readonly logger = new Logger(QueueProducerService.name);

  constructor(
    @InjectQueue(QUEUES.TEACHER_REMINDER)
    private readonly teacherReminderQueue: Queue,
    @InjectQueue(QUEUES.ATTENDANCE_SUMMARY)
    private readonly attendanceSummaryQueue: Queue,
    @InjectQueue(QUEUES.NOTIFICATION_SEND)
    private readonly notificationSendQueue: Queue,
  ) {}

  async addTeacherReminderBeforeClass(data: Record<string, unknown>, delay?: number) {
    const job = await this.teacherReminderQueue.add(
      QUEUE_JOBS.TEACHER_REMINDER_BEFORE_CLASS,
      data,
      { delay },
    );

    this.logEnqueued(job, QUEUES.TEACHER_REMINDER);
    return job;
  }

  async addAttendanceSummaryDaily(data: Record<string, unknown>, delay?: number) {
    const job = await this.attendanceSummaryQueue.add(
      QUEUE_JOBS.ATTENDANCE_SUMMARY_DAILY,
      data,
      { delay },
    );

    this.logEnqueued(job, QUEUES.ATTENDANCE_SUMMARY);
    return job;
  }

  async addNotificationSend(
    channel: 'WHATSAPP' | 'TELEGRAM' | 'EMAIL',
    data: Record<string, unknown>,
    delay?: number,
  ) {
    const jobNameByChannel = {
      WHATSAPP: QUEUE_JOBS.NOTIFICATION_SEND_WHATSAPP,
      TELEGRAM: QUEUE_JOBS.NOTIFICATION_SEND_TELEGRAM,
      EMAIL: QUEUE_JOBS.NOTIFICATION_SEND_EMAIL,
    } as const;

    const job = await this.notificationSendQueue.add(jobNameByChannel[channel], data, {
      delay,
    });

    this.logEnqueued(job, QUEUES.NOTIFICATION_SEND);
    return job;
  }

  private logEnqueued(job: Job, queueName: string) {
    this.logger.log(
      JSON.stringify({
        event: 'queue.job.enqueued',
        queueName,
        jobName: job.name,
        jobId: job.id,
        correlationId: job.data?.correlationId,
      }),
    );
  }
}
