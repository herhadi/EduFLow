import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueProducerService } from '../../queue/queue-producer.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class NotificationService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueProducer: QueueProducerService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultTemplates();
    await this.ensureDemoLogs();
  }

  async getSent() {
    return this.getLogsByStatus(NotificationStatus.SENT);
  }

  async getFailed() {
    return this.getLogsByStatus(NotificationStatus.FAILED);
  }

  async getPending() {
    return this.getLogsByStatus(NotificationStatus.PENDING);
  }

  async getTemplates() {
    return {
      data: await this.prisma.notificationTemplate.findMany({
        where: { deletedAt: null },
        orderBy: [{ channel: 'asc' }, { key: 'asc' }],
      }),
    };
  }

  async retry(id: string) {
    const notification = await this.prisma.notificationLog.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notifikasi tidak ditemukan');
    }

    if (notification.status !== NotificationStatus.FAILED) {
      throw new BadRequestException('Hanya notifikasi gagal yang bisa retry');
    }

    const updatedNotification = await this.prisma.notificationLog.update({
      where: { id },
      data: {
        status: NotificationStatus.PENDING,
        lastError: null,
        failedAt: null,
        attempts: { increment: 1 },
      },
    });

    const job = await this.queueProducer.addNotificationSend(notification.channel, {
      notificationId: notification.id,
      channel: notification.channel,
      recipient: notification.recipient,
      templateKey: notification.templateKey,
      dedupeKey: notification.dedupeKey,
    });

    await this.auditService.record({
      action: 'notification.retry',
      entityType: 'NotificationLog',
      entityId: notification.id,
      before: notification,
      after: {
        status: updatedNotification.status,
        attempts: updatedNotification.attempts,
        jobId: job.id,
      },
    });

    return {
      data: {
        notification: updatedNotification,
        job: {
          id: job.id,
          name: job.name,
          queue: job.queueName,
        },
      },
      message: 'Retry notifikasi berhasil dikirim ke queue.',
    };
  }

  async ensureDefaultTemplates() {
    const templates = [
      {
        key: 'attendance.summary.daily',
        name: 'Summary Presensi Harian',
        channel: 'TELEGRAM' as const,
        body: 'Halo {{guardianName}}, summary presensi {{studentName}} hari ini: {{status}}.',
      },
      {
        key: 'teacher.reminder.before-class',
        name: 'Reminder Guru Sebelum Kelas',
        channel: 'TELEGRAM' as const,
        body: 'Reminder: kelas {{className}} akan dimulai pukul {{startsAt}}.',
      },
      {
        key: 'attendance.class.empty',
        name: 'Notifikasi Kelas Kosong',
        channel: 'WHATSAPP' as const,
        body: 'Kelas {{className}} belum dibuka oleh guru pada jadwal {{startsAt}}.',
      },
    ];

    await Promise.all(
      templates.map((template) =>
        this.prisma.notificationTemplate.upsert({
          where: { key: template.key },
          update: template,
          create: template,
        }),
      ),
    );
  }

  private async ensureDemoLogs() {
    const existingCount = await this.prisma.notificationLog.count();

    if (existingCount > 0) {
      return;
    }

    await this.prisma.notificationLog.createMany({
      data: [
        {
          channel: 'TELEGRAM',
          status: 'SENT',
          recipient: '648351920',
          recipientName: 'Wali Murid Demo',
          message: 'Summary presensi harian berhasil dikirim.',
          templateKey: 'attendance.summary.daily',
          dedupeKey: 'demo.sent.attendance.summary.daily',
          entityType: 'Attendance',
          entityId: 'demo-attendance',
          attempts: 1,
          sentAt: new Date(),
        },
        {
          channel: 'WHATSAPP',
          status: 'FAILED',
          recipient: '08561186917',
          recipientName: 'Wali Murid Demo',
          message: 'Kelas belum dibuka sesuai jadwal.',
          templateKey: 'attendance.class.empty',
          dedupeKey: 'demo.failed.attendance.class.empty',
          entityType: 'DailyAgenda',
          entityId: 'demo-agenda',
          attempts: 3,
          lastError: 'Provider WhatsApp timeout',
          failedAt: new Date(),
        },
        {
          channel: 'TELEGRAM',
          status: 'PENDING',
          recipient: '648351920',
          recipientName: 'Guru Demo',
          message: 'Reminder kelas akan dimulai.',
          templateKey: 'teacher.reminder.before-class',
          dedupeKey: 'demo.pending.teacher.reminder.before-class',
          entityType: 'Schedule',
          entityId: 'demo-schedule',
          attempts: 0,
        },
      ],
      skipDuplicates: true,
    });
  }

  private async getLogsByStatus(status: NotificationStatus) {
    return {
      data: await this.prisma.notificationLog.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    };
  }
}
