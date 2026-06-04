import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { QUEUES } from '@eduflow/shared';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

type HealthStatus = 'Healthy' | 'Unhealthy';

const monitoredQueues = [
  QUEUES.TEACHER_REMINDER,
  QUEUES.ATTENDANCE_SUMMARY,
  QUEUES.NOTIFICATION_SEND,
  QUEUES.REPORT_DAILY,
] as const;

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.TEACHER_REMINDER)
    private readonly teacherReminderQueue: Queue,
    @InjectQueue(QUEUES.ATTENDANCE_SUMMARY)
    private readonly attendanceSummaryQueue: Queue,
    @InjectQueue(QUEUES.NOTIFICATION_SEND)
    private readonly notificationSendQueue: Queue,
    @InjectQueue(QUEUES.REPORT_DAILY)
    private readonly reportDailyQueue: Queue,
  ) {}

  async getDashboard() {
    const [database, redis, queues, failedJobs] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.getQueueSummaries(),
      this.getFailedJobs(),
    ]);

    const queueHealthy = queues.every((queue) => queue.status === 'Healthy');
    const workerHealthy = queues.every((queue) => queue.failed === 0);

    return {
      data: {
        health: {
          redis,
          queue: this.toHealth(queueHealthy),
          worker: this.toHealth(workerHealthy),
          database,
          notification: this.toHealth(
            queues.find((queue) => queue.name === QUEUES.NOTIFICATION_SEND)?.status ===
              'Healthy',
          ),
        },
        queues,
        failedJobs,
      },
    };
  }

  async retryJob(queueName: string, jobId: string) {
    const job = await this.getJob(queueName, jobId);
    await job.retry();

    return {
      data: {
        queueName,
        jobId,
      },
      message: 'Job dikirim ulang ke queue.',
    };
  }

  async discardJob(queueName: string, jobId: string) {
    const job = await this.getJob(queueName, jobId);
    await job.remove();

    return {
      data: {
        queueName,
        jobId,
      },
      message: 'Job dihapus dari queue.',
    };
  }

  private async getQueueSummaries() {
    return Promise.all(
      monitoredQueues.map(async (queueName) => {
        const queue = this.getQueue(queueName);
        const counts = await queue.getJobCounts(
          'waiting',
          'active',
          'failed',
          'delayed',
          'completed',
        );

        return {
          name: queueName,
          label: this.getQueueLabel(queueName),
          status: this.toHealth(true),
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          failed: counts.failed ?? 0,
          delayed: counts.delayed ?? 0,
          completed: counts.completed ?? 0,
        };
      }),
    );
  }

  private async getFailedJobs() {
    const jobsByQueue = await Promise.all(
      monitoredQueues.map(async (queueName) => {
        const queue = this.getQueue(queueName);
        const jobs = await queue.getJobs(['failed'], 0, 20, false);

        return jobs.map((job) => ({
          id: String(job.id),
          queueName,
          queueLabel: this.getQueueLabel(queueName),
          name: job.name,
          attemptsMade: job.attemptsMade,
          failedReason: job.failedReason,
          timestamp: new Date(job.timestamp).toISOString(),
          processedOn: job.processedOn
            ? new Date(job.processedOn).toISOString()
            : null,
          finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
          payload: job.data,
        }));
      }),
    );

    return jobsByQueue.flat().sort((first, second) => {
      return (
        new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime()
      );
    });
  }

  private async checkDatabase(): Promise<HealthStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'Healthy';
    } catch {
      return 'Unhealthy';
    }
  }

  private async checkRedis(): Promise<HealthStatus> {
    try {
      await this.teacherReminderQueue.getJobCounts('waiting');
      return 'Healthy';
    } catch {
      return 'Unhealthy';
    }
  }

  private async getJob(queueName: string, jobId: string): Promise<Job> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new NotFoundException('Job tidak ditemukan');
    }

    return job;
  }

  private getQueue(queueName: string) {
    const queues: Record<string, Queue> = {
      [QUEUES.TEACHER_REMINDER]: this.teacherReminderQueue,
      [QUEUES.ATTENDANCE_SUMMARY]: this.attendanceSummaryQueue,
      [QUEUES.NOTIFICATION_SEND]: this.notificationSendQueue,
      [QUEUES.REPORT_DAILY]: this.reportDailyQueue,
    };

    const queue = queues[queueName];

    if (!queue) {
      throw new NotFoundException('Queue tidak ditemukan');
    }

    return queue;
  }

  private getQueueLabel(queueName: string) {
    const labels: Record<string, string> = {
      [QUEUES.TEACHER_REMINDER]: 'Reminder Queue',
      [QUEUES.ATTENDANCE_SUMMARY]: 'Summary Queue',
      [QUEUES.NOTIFICATION_SEND]: 'Notification Queue',
      [QUEUES.REPORT_DAILY]: 'Report Queue',
    };

    return labels[queueName] ?? queueName;
  }

  private toHealth(isHealthy: boolean): HealthStatus {
    return isHealthy ? 'Healthy' : 'Unhealthy';
  }
}
