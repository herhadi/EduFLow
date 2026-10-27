import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'node:child_process';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { cpus, freemem, loadavg, totalmem } from 'node:os';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { QUEUES } from '@eduflow/shared';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { STORAGE_PROVIDER, StorageProvider } from '../../infrastructure/storage/storage-provider';
import { TelegramBotService } from '../../infrastructure/telegram/telegram-bot.service';
import { RequestMetricsService } from '../../infrastructure/observability/request-metrics.service';

type HealthStatus = 'Healthy' | 'Unhealthy';
type HealthProbe = {
  latencyMs: number | null;
  status: HealthStatus;
};

const monitoredQueues = [
  QUEUES.TEACHER_REMINDER,
  QUEUES.ATTENDANCE_SUMMARY,
  QUEUES.NOTIFICATION_SEND,
  QUEUES.REPORT_DAILY,
] as const;

const R2_RANGE_MAX_OBJECTS = 1_000;
const DEFAULT_R2_BACKUP_MAX_BYTES = 128 * 1024 * 1024;

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipDosDateTime(value: string) {
  const date = new Date(value);
  const year = Math.max(1980, date.getUTCFullYear());
  return {
    time: ((date.getUTCHours() & 0x1f) << 11) | ((date.getUTCMinutes() & 0x3f) << 5) | (Math.floor(date.getUTCSeconds() / 2) & 0x1f),
    date: (((year - 1980) & 0x7f) << 9) | (((date.getUTCMonth() + 1) & 0x0f) << 5) | (date.getUTCDate() & 0x1f),
  };
}

function buildZipArchive(files: Array<{ name: string; content: Buffer; modifiedAt: string }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  let centralSize = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const compressed = deflateRawSync(file.content);
    const checksum = crc32(file.content);
    const { time, date } = zipDosDateTime(file.modifiedAt);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(file.content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(file.content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    centralSize += central.length + name.length;
    offset += local.length + name.length + compressed.length;
  }

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

function safeArchivePath(key: string) {
  const normalized = key.replace(/^\/+/, '').split('/').map((part) => part === '.' || part === '..' ? '_' : part).join('/');
  return normalized || 'unnamed-object';
}

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly telegramBotService: TelegramBotService,
    private readonly requestMetrics: RequestMetricsService,
    @InjectQueue(QUEUES.TEACHER_REMINDER)
    private readonly teacherReminderQueue: Queue,
    @InjectQueue(QUEUES.ATTENDANCE_SUMMARY)
    private readonly attendanceSummaryQueue: Queue,
    @InjectQueue(QUEUES.NOTIFICATION_SEND)
    private readonly notificationSendQueue: Queue,
    @InjectQueue(QUEUES.REPORT_DAILY)
    private readonly reportDailyQueue: Queue,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
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

  async getR2Usage() {
    const summary = await this.storage.getUsageSummary();
    return {
      data: {
        bucket: summary.bucket,
        objectCount: summary.objectCount,
        totalSizeBytes: summary.totalSizeBytes,
        isPartial: summary.isPartial,
        checkedAt: new Date().toISOString(),
        source: this.configService.get<string>('CLOUDFLARE_API_TOKEN') ? 'Cloudflare Analytics (fallback: S3 listing)' : 'S3 listing',
      },
    };
  }

  async listR2Objects(from: string, to: string, prefix: string | undefined) {
    const range = this.parseR2DateRange(from, to);
    const normalizedPrefix = this.validateR2Prefix(prefix);
    const result = await this.storage.listObjectsByModifiedRange(range.from, range.to, normalizedPrefix, R2_RANGE_MAX_OBJECTS);
    return { data: {
      from, to, prefix: normalizedPrefix ?? null,
      objects: result.objects,
      objectCount: result.objects.length,
      totalSizeBytes: result.objects.reduce((total, object) => total + object.size, 0),
      truncated: result.truncated,
      maxObjects: R2_RANGE_MAX_OBJECTS,
    } };
  }

  async createR2RangeBackup(from: string, to: string, prefix: string | undefined, userId: string) {
    const range = this.parseR2DateRange(from, to);
    const normalizedPrefix = this.validateR2Prefix(prefix);
    const result = await this.storage.listObjectsByModifiedRange(range.from, range.to, normalizedPrefix, R2_RANGE_MAX_OBJECTS);
    if (result.truncated) throw new BadRequestException(`Rentang berisi lebih dari ${R2_RANGE_MAX_OBJECTS} objek. Persempit tanggal atau isi prefix.`);
    if (!result.objects.length) throw new BadRequestException('Tidak ada objek R2 pada rentang waktu ini.');
    const totalSizeBytes = result.objects.reduce((total, object) => total + object.size, 0);
    const maxBytes = Number(this.configService.get<string>('R2_BACKUP_MAX_BYTES') ?? DEFAULT_R2_BACKUP_MAX_BYTES);
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new BadRequestException('R2_BACKUP_MAX_BYTES harus berupa integer positif.');
    if (totalSizeBytes > maxBytes) {
      throw new BadRequestException(`Ukuran backup ${totalSizeBytes} byte melewati batas ${maxBytes} byte. Persempit tanggal atau isi prefix.`);
    }

    const files: Array<{ name: string; content: Buffer; modifiedAt: string }> = [];
    const manifestObjects: Array<{ key: string; archivePath: string; size: number; lastModified: string }> = [];
    for (const object of result.objects) {
      const buffer = await this.storage.downloadObject(object.key);
      const archivePath = `objects/${safeArchivePath(object.key)}`;
      files.push({ name: archivePath, content: buffer, modifiedAt: object.lastModified });
      manifestObjects.push({ key: object.key, archivePath, size: object.size, lastModified: object.lastModified });
    }
    files.push({
      name: 'manifest.json',
      content: Buffer.from(JSON.stringify({
        exportedAt: new Date().toISOString(),
        bucket: this.configService.get<string>('R2_BUCKET_NAME') ?? null,
        from, to, prefix: normalizedPrefix ?? null,
        objectCount: result.objects.length,
        totalSizeBytes,
        objects: manifestObjects,
      }, null, 2), 'utf8'),
      modifiedAt: new Date().toISOString(),
    });
    const archive = buildZipArchive(files);
    const filename = `eduflow-r2-${from}-to-${to}.zip`;
    await this.auditService.record({
      userId,
      action: 'storage.r2.backup-range.created',
      entityType: 'R2Storage',
      entityId: `${from}:${to}`,
      after: { from, to, prefix: normalizedPrefix ?? null, objectCount: result.objects.length, totalSizeBytes, filename },
    });
    return { filename, archive, objectCount: result.objects.length, totalSizeBytes };
  }

  async deleteR2Range(from: string, to: string, prefix: string | undefined, confirmation: string | undefined, expectedCount: number | undefined, expectedSizeBytes: number | undefined, userId: string) {
    if (confirmation !== 'DELETE R2 OBJECTS') throw new BadRequestException('Ketik DELETE R2 OBJECTS untuk mengonfirmasi penghapusan.');
    if (expectedCount === undefined || !Number.isSafeInteger(expectedCount) || expectedCount < 0 ||
        expectedSizeBytes === undefined || !Number.isSafeInteger(expectedSizeBytes) || expectedSizeBytes < 0) {
      throw new BadRequestException('Preview jumlah dan ukuran objek wajib dikirim ulang sebelum penghapusan.');
    }
    const range = this.parseR2DateRange(from, to);
    const normalizedPrefix = this.validateR2Prefix(prefix);
    const result = await this.storage.listObjectsByModifiedRange(range.from, range.to, normalizedPrefix, R2_RANGE_MAX_OBJECTS);
    if (result.truncated) throw new BadRequestException(`Rentang berisi lebih dari ${R2_RANGE_MAX_OBJECTS} objek. Persempit tanggal atau isi prefix.`);
    const actualSizeBytes = result.objects.reduce((total, object) => total + object.size, 0);
    if (result.objects.length !== expectedCount || actualSizeBytes !== expectedSizeBytes) {
      throw new BadRequestException('Isi R2 berubah sejak preview. Muat ulang preview sebelum menghapus.');
    }
    if (!result.objects.length) throw new BadRequestException('Tidak ada objek R2 yang cocok untuk dihapus.');
    try {
      await this.storage.deleteObjects(result.objects.map((object) => object.key));
    } catch (error) {
      await this.auditService.record({
        userId,
        action: 'storage.r2.delete-range.failed',
        entityType: 'R2Storage',
        entityId: `${from}:${to}`,
        after: { from, to, prefix: normalizedPrefix ?? null, attemptedCount: result.objects.length, totalSizeBytes: actualSizeBytes, error: error instanceof Error ? error.name : 'UnknownError' },
      });
      throw error;
    }
    await this.auditService.record({
      userId,
      action: 'storage.r2.delete-range.completed',
      entityType: 'R2Storage',
      entityId: `${from}:${to}`,
      before: { from, to, prefix: normalizedPrefix ?? null, objectCount: result.objects.length, totalSizeBytes: actualSizeBytes },
      after: { deletedCount: result.objects.length, totalSizeBytes: actualSizeBytes },
    });
    return {
      data: { deletedCount: result.objects.length, totalSizeBytes: actualSizeBytes, from, to, prefix: normalizedPrefix ?? null },
      message: `${result.objects.length} objek R2 berhasil dihapus.`,
    };
  }

  private parseR2DateRange(from: string, to: string) {
    const validDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) &&
      new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
    if (!from || !to || !validDay(from) || !validDay(to)) {
      throw new BadRequestException('Tanggal from dan to wajib menggunakan format YYYY-MM-DD yang valid.');
    }
    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T23:59:59.999Z`);
    if (start.getTime() > end.getTime()) throw new BadRequestException('Tanggal awal tidak boleh melewati tanggal akhir.');
    return { from: start, to: end };
  }

  private validateR2Prefix(prefix?: string) {
    const normalized = prefix?.trim();
    if (!normalized) return undefined;
    if (normalized.length > 200 || /[\\r\\n\\0]/.test(normalized)) {
      throw new BadRequestException('Prefix maksimal 200 karakter dan tidak boleh memuat karakter kontrol.');
    }
    return normalized;
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
    const [database, redis, storageResult, queues, failedJobs] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.getStorageStatus(),
      this.getQueueSummaries(),
      this.getFailedJobs(),
    ]);

    const queueHealthy = queues.every((queue) => queue.status === 'Healthy');
    const workerHealthy = queues.every((queue) => queue.failed === 0);

    return {
      data: {
        health: {
          redis: redis.status,
          queue: this.toHealth(queueHealthy),
          worker: this.toHealth(workerHealthy),
          database: database.status,
          storage: storageResult.status,
          storageSummary: storageResult.summary,
          storageError: storageResult.error,
          notification: this.toHealth(
            queues.find((queue) => queue.name === QUEUES.NOTIFICATION_SEND)?.status ===
              'Healthy',
          ),
        },
        diagnostics: {
          databaseLatencyMs: database.latencyMs,
          redisLatencyMs: redis.latencyMs,
        },
        runtime: this.getRuntimeSnapshot(),
        requests: this.requestMetrics.getSnapshot(),
        queueTotals: this.getQueueTotals(queues),
        queues,
        failedJobs,
      },
    };
  }

  async getTelegramStatus() {
    const webhookUrl = this.getTelegramWebhookUrl();
    const [
      linkedUsers,
      sent,
      pending,
      failed,
      total,
      recentLogs,
      provider,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { deletedAt: null, telegramId: { not: null } },
      }),
      this.prisma.notificationLog.count({
        where: { channel: 'TELEGRAM', status: 'SENT' },
      }),
      this.prisma.notificationLog.count({
        where: { channel: 'TELEGRAM', status: 'PENDING' },
      }),
      this.prisma.notificationLog.count({
        where: { channel: 'TELEGRAM', status: 'FAILED' },
      }),
      this.prisma.notificationLog.count({ where: { channel: 'TELEGRAM' } }),
      this.prisma.notificationLog.findMany({
        where: { channel: 'TELEGRAM' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          recipient: true,
          recipientName: true,
          subject: true,
          templateKey: true,
          attempts: true,
          lastError: true,
          sentAt: true,
          failedAt: true,
          createdAt: true,
        },
      }),
      this.getTelegramProviderStatus(),
    ]);

    return {
      data: {
        config: {
          botTokenConfigured: this.telegramBotService.isConfigured(),
          botUsername: this.configService.get<string>('TELEGRAM_BOT_USERNAME')?.trim() || null,
          botUrlConfigured: Boolean(this.configService.get<string>('TELEGRAM_BOT_URL')?.trim()),
          webhookSecretConfigured: Boolean(this.getTelegramWebhookSecret()),
          webhookUrl,
        },
        provider,
        usage: {
          linkedUsers,
          logs: {
            total,
            sent,
            pending,
            failed,
          },
        },
        recentLogs,
      },
    };
  }

  async setTelegramWebhook(userId: string) {
    const webhookUrl = this.getTelegramWebhookUrl();

    if (!webhookUrl) {
      throw new BadRequestException('TELEGRAM_WEBHOOK_URL atau FRONTEND_URL wajib diisi');
    }

    const result = await this.telegramBotService.setWebhook(
      webhookUrl,
      this.getTelegramWebhookSecret(),
    );

    await this.auditService.record({
      userId,
      action: 'telegram.webhook.set',
      entityType: 'Telegram',
      entityId: webhookUrl,
      after: { webhookUrl, ok: result.ok },
    });

    return {
      data: await this.getTelegramStatus().then((response) => response.data),
      message: 'Webhook Telegram berhasil dipasang.',
    };
  }

  async deleteTelegramWebhook(userId: string) {
    const result = await this.telegramBotService.deleteWebhook();

    await this.auditService.record({
      userId,
      action: 'telegram.webhook.delete',
      entityType: 'Telegram',
      entityId: 'telegram-webhook',
      after: { ok: result.ok },
    });

    return {
      data: await this.getTelegramStatus().then((response) => response.data),
      message: 'Webhook Telegram berhasil dihapus.',
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

  private getRuntimeSnapshot() {
    const memory = process.memoryUsage();
    const totalMemoryBytes = totalmem();
    const freeMemoryBytes = freemem();
    const cpuCount = cpus().length;
    const oneMinuteLoad = loadavg()[0] ?? 0;

    return {
      uptimeSeconds: Math.round(process.uptime()),
      cpu: {
        count: cpuCount,
        loadAverage1m: Number(oneMinuteLoad.toFixed(2)),
        loadPercent: Math.min(100, Math.round((oneMinuteLoad / Math.max(cpuCount, 1)) * 100)),
      },
      memory: {
        processRssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
        heapTotalBytes: memory.heapTotal,
        systemTotalBytes: totalMemoryBytes,
        systemFreeBytes: freeMemoryBytes,
        systemUsedPercent: Math.round(((totalMemoryBytes - freeMemoryBytes) / totalMemoryBytes) * 100),
      },
    };
  }

  private getQueueTotals(queues: Awaited<ReturnType<OperationsService['getQueueSummaries']>>) {
    const totals = queues.reduce(
      (summary, queue) => ({
        waiting: summary.waiting + queue.waiting,
        active: summary.active + queue.active,
        failed: summary.failed + queue.failed,
        delayed: summary.delayed + queue.delayed,
        completed: summary.completed + queue.completed,
      }),
      { waiting: 0, active: 0, failed: 0, delayed: 0, completed: 0 },
    );

    return {
      ...totals,
      notification: queues.find((queue) => queue.name === QUEUES.NOTIFICATION_SEND) ?? null,
      attendance: queues.find((queue) => queue.name === QUEUES.ATTENDANCE_SUMMARY) ?? null,
      reminder: queues.find((queue) => queue.name === QUEUES.TEACHER_REMINDER) ?? null,
      report: queues.find((queue) => queue.name === QUEUES.REPORT_DAILY) ?? null,
    };
  }

  private async checkDatabase(): Promise<HealthProbe> {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { latencyMs: Date.now() - startedAt, status: 'Healthy' };
    } catch {
      return { latencyMs: null, status: 'Unhealthy' };
    }
  }

  private async checkRedis(): Promise<HealthProbe> {
    const startedAt = Date.now();

    try {
      await this.teacherReminderQueue.getJobCounts('waiting');
      return { latencyMs: Date.now() - startedAt, status: 'Healthy' };
    } catch {
      return { latencyMs: null, status: 'Unhealthy' };
    }
  }

  private async getStorageStatus(): Promise<{ status: HealthStatus; summary: Awaited<ReturnType<StorageProvider['getUsageSummary']>> | null; error: string | null }> {
    try {
      return { status: 'Healthy', summary: await this.storage.getUsageSummary(), error: null };
    } catch (error) {
      const name = error instanceof Error ? error.name : 'UnknownError';
      return {
        status: 'Healthy',
        summary: null,
        error: `Storage aktif, tetapi detail penggunaan belum tersedia (${name}). Pastikan credential memiliki izin list bucket atau Cloudflare Analytics.`,
      };
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

  private async getTelegramProviderStatus() {
    if (!this.telegramBotService.isConfigured()) {
      return {
        reachable: false,
        webhookUrl: null,
        pendingUpdateCount: null,
        lastErrorMessage: 'TELEGRAM_BOT_TOKEN belum dikonfigurasi',
        lastErrorAt: null,
        maxConnections: null,
      };
    }

    try {
      const info = await this.telegramBotService.getWebhookInfo();
      return {
        reachable: true,
        info,
        webhookUrl: info.url || null,
        hasCustomCertificate: info.has_custom_certificate ?? false,
        pendingUpdateCount: info.pending_update_count ?? 0,
        lastErrorMessage: info.last_error_message ?? null,
        lastErrorAt: info.last_error_date
          ? new Date(info.last_error_date * 1000).toISOString()
          : null,
        maxConnections: info.max_connections ?? null,
        ipAddress: info.ip_address ?? null,
      };
    } catch (error) {
      return {
        reachable: false,
        info: null,
        webhookUrl: null,
        hasCustomCertificate: null,
        pendingUpdateCount: null,
        lastErrorMessage: error instanceof Error ? error.message : 'Telegram tidak dapat diakses',
        lastErrorAt: null,
        maxConnections: null,
        ipAddress: null,
      };
    }
  }

  private getTelegramWebhookUrl() {
    const explicitUrl = this.configService.get<string>('TELEGRAM_WEBHOOK_URL')?.trim();

    if (explicitUrl) {
      return explicitUrl;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.trim();

    if (!frontendUrl) {
      return null;
    }

    return `${frontendUrl.replace(/\/$/, '')}/api/backend/auth/telegram/webhook`;
  }

  private getTelegramWebhookSecret() {
    return this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET')?.trim() || undefined;
  }
}
