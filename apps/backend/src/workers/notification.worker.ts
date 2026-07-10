import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_JOBS, QUEUES } from '@eduflow/shared';
import { Job } from 'bullmq';
import { TelegramBotService } from '../infrastructure/telegram/telegram-bot.service';
import { PrismaService } from '../prisma/prisma.service';

@Processor(QUEUES.NOTIFICATION_SEND)
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramBotService: TelegramBotService,
  ) {
    super();
  }

  async process(job: Job) {
    this.logJob('queue.job.started', job);

    try {
      const notificationId = job.data?.notificationId as string | undefined;

      if (notificationId) {
        if (job.name === QUEUE_JOBS.NOTIFICATION_SEND_TELEGRAM) {
          await this.sendTelegramNotification(notificationId);
        }

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
      await this.markNotificationFailed(job, error);
      this.logJob('queue.job.failed', job, error);
      throw error;
    }
  }

  private async sendTelegramNotification(notificationId: string) {
    const notification = await this.prisma.notificationLog.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('NotificationLog tidak ditemukan');
    }

    if (notification.channel !== 'TELEGRAM') {
      return;
    }

    await this.telegramBotService.sendMessage(
      notification.recipient,
      notification.subject
        ? `<b>${this.escapeHtml(notification.subject)}</b>\n\n${this.escapeHtml(notification.message)}`
        : this.escapeHtml(notification.message),
    );
  }

  private async markNotificationFailed(job: Job, error: unknown) {
    const notificationId = job.data?.notificationId as string | undefined;

    if (!notificationId) {
      return;
    }

    await this.prisma.notificationLog.update({
      where: { id: notificationId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        lastError: error instanceof Error ? error.message : 'Unknown error',
      },
    }).catch(() => undefined);
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
