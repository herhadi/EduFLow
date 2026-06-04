import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { QUEUES } from '@eduflow/shared';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor(QUEUES.NOTIFICATION_SEND)
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    this.logJob('queue.job.started', job);

    try {
      const notificationId = job.data?.notificationId as string | undefined;

      if (notificationId) {
        await this.prisma.notificationLog.update({
          where: { id: notificationId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            failedAt: null,
            lastError: null,
          },
        });
      }

      this.logJob('queue.job.completed', job);
      return {
        processed: true,
        jobName: job.name,
        message: 'Notifikasi diproses.',
      };
    } catch (error) {
      this.logJob('queue.job.failed', job, error);
      throw error;
    }
  }

  private logJob(event: string, job: Job, error?: unknown) {
    this.logger[error ? 'error' : 'log'](
      JSON.stringify({
        event,
        queueName: QUEUES.NOTIFICATION_SEND,
        jobName: job.name,
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        correlationId: job.data?.correlationId,
        error: error instanceof Error ? error.message : undefined,
      }),
    );
  }
}
