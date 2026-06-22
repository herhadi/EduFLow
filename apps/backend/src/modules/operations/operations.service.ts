import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { QUEUES } from '@eduflow/shared';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

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
    private readonly auditService: AuditService,
    @InjectQueue(QUEUES.TEACHER_REMINDER)
    private readonly teacherReminderQueue: Queue,
    @InjectQueue(QUEUES.ATTENDANCE_SUMMARY)
    private readonly attendanceSummaryQueue: Queue,
    @InjectQueue(QUEUES.NOTIFICATION_SEND)
    private readonly notificationSendQueue: Queue,
    @InjectQueue(QUEUES.REPORT_DAILY)
    private readonly reportDailyQueue: Queue,
  ) {}

  async getBackups() {
    const academicYears = await this.prisma.schoolYear.findMany({ where: { deletedAt: null }, orderBy: { startsAt: 'desc' } });
    return { data: { daily: [], academicYears } };
  }

  async createDailyBackup(userId: string) {
    const filename = `eduflow-${this.timestamp()}.dump`;
    const url = new URL(process.env.DATABASE_URL ?? 'postgresql://eduflow:eduflow@postgres:5432/eduflow');
    const dumpProcess = spawn('pg_dump', ['-Fc', '--no-owner', '--no-privileges', '-h', url.hostname, '-p', url.port || '5432', '-U', decodeURIComponent(url.username), url.pathname.slice(1)], { env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) } });
    await this.auditService.record({ userId, action: 'backup.daily.downloaded', entityType: 'Backup', entityId: filename, after: { filename } });
    return { filename, process: dumpProcess };
  }

  async createAcademicYearBackup(schoolYearId: string, userId: string) {
    const schoolYear = await this.prisma.schoolYear.findUnique({ where: { id: schoolYearId }, include: { semesters: true, classes: true, schedules: true, agendas: true, enrollments: true, timeSlots: true, teachingPlans: true } });
    if (!schoolYear) throw new NotFoundException('Tahun ajaran tidak ditemukan');
    const directory = await this.backupDirectory('academic-year');
    const filename = `${schoolYear.name.replace('/', '-')}-${this.timestamp()}.json`;
    await writeFile(join(directory, filename), JSON.stringify({ exportedAt: new Date().toISOString(), schoolYear }, null, 2));
    await this.auditService.record({ userId, action: 'backup.academic-year.created', entityType: 'SchoolYear', entityId: schoolYearId, after: { filename } });
    return { data: { filename }, message: 'Arsip tahun ajaran berhasil dibuat.' };
  }

  async restoreDailyBackup(file: { buffer: Buffer; originalname: string; size: number } | undefined, confirmation: string | undefined, userId: string) {
    if (confirmation !== 'RESTORE') throw new BadRequestException('Konfirmasi restore tidak valid');
    if (!file?.buffer?.length || !file.originalname.endsWith('.dump')) throw new BadRequestException('Pilih file backup PostgreSQL (.dump)');
    const url = new URL(process.env.DATABASE_URL ?? 'postgresql://eduflow:eduflow@postgres:5432/eduflow');
    await this.auditService.record({ userId, action: 'backup.daily.restore.started', entityType: 'Backup', entityId: file.originalname, after: { size: file.size } });
    await new Promise<void>((resolve, reject) => {
      const child = spawn('pg_restore', ['--clean', '--if-exists', '--no-owner', '--no-privileges', '-h', url.hostname, '-p', url.port || '5432', '-U', decodeURIComponent(url.username), '-d', url.pathname.slice(1)], { env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) } });
      child.on('error', reject); child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`pg_restore gagal (${code})`)));
      child.stdin.end(file.buffer);
    });
    return { data: { filename: file.originalname }, message: 'Restore selesai. Muat ulang aplikasi.' };
  }

  private async backupDirectory(kind: string) { const directory = join(process.env.BACKUP_DIR ?? '/app/backups', kind); await mkdir(directory, { recursive: true }); return directory; }
  private async listFiles(kind: string) { const directory = await this.backupDirectory(kind); return Promise.all((await readdir(directory)).sort().reverse().map(async (filename) => { const info = await stat(join(directory, filename)); return { filename, size: info.size, createdAt: info.mtime.toISOString() }; })); }
  private timestamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
  private run(command: string, args: string[], env: Record<string, string>) {
    return new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, { env: { ...process.env, ...env } });
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`${command} gagal (${code})`));
      });
    });
  }

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
