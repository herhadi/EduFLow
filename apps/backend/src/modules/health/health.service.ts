import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { QUEUES } from '@eduflow/shared';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

type HealthStatus = 'Healthy' | 'Unhealthy';

@Injectable()
export class HealthService {
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

  async getHealth() {
    const [database, redis, queue] = await Promise.all([
      this.getDatabaseHealth(),
      this.getRedisHealth(),
      this.getQueueHealth(),
    ]);
    const healthy = [database, redis, queue].every(
      (item) => item.status === 'Healthy',
    );

    return {
      status: this.toHealth(healthy),
      services: { database, redis, queue },
      checkedAt: new Date().toISOString(),
    };
  }

  async getDatabaseHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: this.toHealth(true), latencyMs: 0 };
    } catch (error) {
      return {
        status: this.toHealth(false),
        error: error instanceof Error ? error.message : 'Database check failed',
      };
    }
  }

  async getRedisHealth() {
    try {
      await this.teacherReminderQueue.getJobCounts('waiting');
      return { status: this.toHealth(true) };
    } catch (error) {
      return {
        status: this.toHealth(false),
        error: error instanceof Error ? error.message : 'Redis check failed',
      };
    }
  }

  async getQueueHealth() {
    const queues = await Promise.all(
      this.getQueues().map(async ({ label, queue }) => {
        try {
          const counts = await queue.getJobCounts(
            'waiting',
            'active',
            'failed',
            'delayed',
          );

          return {
            name: queue.name,
            label,
            status: this.toHealth(true),
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0,
          };
        } catch (error) {
          return {
            name: queue.name,
            label,
            status: this.toHealth(false),
            error: error instanceof Error ? error.message : 'Queue check failed',
          };
        }
      }),
    );

    return {
      status: this.toHealth(queues.every((queue) => queue.status === 'Healthy')),
      queues,
    };
  }

  private getQueues() {
    return [
      { label: 'Reminder Queue', queue: this.teacherReminderQueue },
      { label: 'Summary Queue', queue: this.attendanceSummaryQueue },
      { label: 'Notification Queue', queue: this.notificationSendQueue },
      { label: 'Report Queue', queue: this.reportDailyQueue },
    ];
  }

  private toHealth(isHealthy: boolean): HealthStatus {
    return isHealthy ? 'Healthy' : 'Unhealthy';
  }
}
