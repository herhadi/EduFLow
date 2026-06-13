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

  async getMine(userId: string, roles: string[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        teacherProfile: {
          select: { email: true, phone: true, telegramId: true },
        },
      },
    });

    if (!user) {
      return { data: [] };
    }

    const recipients = [
      user.email,
      user.teacherProfile?.email,
      user.teacherProfile?.phone,
      user.teacherProfile?.telegramId,
    ].filter((recipient): recipient is string => Boolean(recipient));

    if (!recipients.length) {
      return { data: [] };
    }

    const allowedTemplates = roles.includes('kepala_sekolah')
      ? [
          'principal.',
          'teaching-plan.',
          'student-grade.',
          'attendance.class.empty',
          'attendance.teacher.not-submitted',
          'attendance.correction.important',
          'teacher.substitute.',
          'school.summary.',
          'academic.announcement.',
        ]
      : [
          'teacher.',
          'attendance.correction.',
          'teaching-plan.',
          'student-grade.',
          'academic.announcement.',
        ];

    return {
      data: await this.prisma.notificationLog.findMany({
        where: {
          recipient: { in: recipients },
          OR: allowedTemplates.map((templateKey) => ({
            templateKey: { startsWith: templateKey },
          })),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    };
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
      {
        key: 'teaching-plan.submitted',
        name: 'Perangkat Ajar Menunggu Review',
        channel: 'EMAIL' as const,
        subject: 'Perangkat ajar menunggu review',
        body: '{{teacherName}} mengirim {{documentType}} untuk diperiksa.',
      },
      {
        key: 'student-grade.submitted',
        name: 'Nilai Semester Menunggu Approval',
        channel: 'EMAIL' as const,
        subject: 'Nilai semester menunggu approval',
        body: 'Nilai {{className}} untuk {{subjectName}} menunggu persetujuan Kepala Sekolah.',
      },
      {
        key: 'attendance.teacher.not-submitted',
        name: 'Guru Belum Submit Presensi',
        channel: 'EMAIL' as const,
        subject: 'Presensi belum disubmit',
        body: '{{teacherName}} belum submit presensi {{className}} sesuai batas waktu.',
      },
      {
        key: 'school.summary.daily',
        name: 'Ringkasan Operasional Harian',
        channel: 'EMAIL' as const,
        subject: 'Ringkasan operasional sekolah',
        body: 'Ringkasan hari ini: {{completedClasses}} kelas selesai, {{emptyClasses}} kelas kosong, {{notSubmitted}} belum submit.',
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
