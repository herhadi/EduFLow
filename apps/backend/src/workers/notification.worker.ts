import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUES } from '@eduflow/shared';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor(QUEUES.NOTIFICATION_SEND)
export class NotificationWorker extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
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

    return {
      processed: true,
      jobName: job.name,
      message: 'Notifikasi diproses.',
    };
  }
}
