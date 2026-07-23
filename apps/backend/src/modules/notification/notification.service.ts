import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { ok } from '../../core/response/api-response';
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
    const scope = await this.getPersonalInboxScope(userId, roles);

    if (!scope) {
      return ok([]);
    }

    return ok(
      await this.prisma.notificationLog.findMany({
        where: {
          AND: [
            {
              OR: [
                { recipientUserId: userId },
                ...(scope.recipients.length && scope.allowedTemplates.length ? [{
                  recipient: { in: scope.recipients },
                  OR: scope.allowedTemplates.map((templateKey) => ({
                    templateKey: { startsWith: templateKey },
                  })),
                }] : []),
              ],
            },
            ...(scope.blockedTemplates.length ? [{
              NOT: {
                OR: scope.blockedTemplates.map((templateKey) => ({
                  templateKey: { startsWith: templateKey },
                })),
              },
            }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    );
  }

  async getMineSent(userId: string, roles: string[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { teacherProfile: { select: { id: true } } },
    });
    const entityFilters: Array<{ entityType: string; entityIds: string[]; templatePrefix: string }> = [];

    if (roles.includes('guru') || roles.includes('wali_kelas')) {
      const teacherId = user?.teacherProfile?.id;

      if (teacherId) {
        const teachingPlans = await this.prisma.teachingPlan.findMany({
          where: { teacherId, deletedAt: null },
          select: { id: true },
        });

        entityFilters.push({
          entityType: 'TeachingPlan',
          entityIds: teachingPlans.map((plan) => plan.id),
          templatePrefix: 'teaching-plan.submitted',
        });
      }
    }

    if (roles.includes('kepala_sekolah')) {
      const reviewedPlans = await this.prisma.teachingPlan.findMany({
        where: { reviewedById: userId, deletedAt: null },
        select: { id: true },
      });

      entityFilters.push({
        entityType: 'TeachingPlan',
        entityIds: reviewedPlans.map((plan) => plan.id),
        templatePrefix: 'teaching-plan.',
      });
    }

    if (roles.includes('orang_tua')) {
      const leaveRequests = await this.prisma.studentLeaveRequest.findMany({
        where: { requestedById: userId, deletedAt: null },
        select: { id: true },
      });

      entityFilters.push({
        entityType: 'StudentLeaveRequest',
        entityIds: leaveRequests.map((request) => request.id),
        templatePrefix: 'student-leave.requested',
      });
    }

    const filters = entityFilters
      .filter((filter) => filter.entityIds.length > 0)
      .map((filter) => ({
        entityType: filter.entityType,
        entityId: { in: filter.entityIds },
        templateKey: { startsWith: filter.templatePrefix },
      }));

    if (!filters.length) {
      return ok([]);
    }

    return ok(
      await this.prisma.notificationLog.findMany({
        where: { OR: filters },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    );
  }

  async markAsRead(userId: string, roles: string[], id: string) {
    const scope = await this.getPersonalInboxScope(userId, roles);
    const notification = await this.prisma.notificationLog.findUnique({ where: { id } });

    if (!scope || !notification || !this.isPersonalNotification(scope, userId, notification)) {
      throw new NotFoundException('Notifikasi tidak ditemukan');
    }

    return ok(
      await this.prisma.notificationLog.update({
        where: { id },
        data: { readAt: new Date() },
      }),
      'Notifikasi ditandai sudah dibaca.',
    );
  }

  private async getPersonalInboxScope(userId: string, roles: string[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        telegramId: true,
        teacherProfile: {
          select: { email: true, phone: true },
        },
      },
    });

    if (!user) {
      return null;
    }

    const recipients = [
      user.email,
      user.telegramId,
      user.teacherProfile?.email,
      user.teacherProfile?.phone,
    ];
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
      : roles.includes('guru') || roles.includes('wali_kelas')
        ? [
          'teacher.',
          'attendance.correction.',
          'teaching-plan.',
          'student-grade.',
          'student-leave.',
          'academic.announcement.',
        ]
        : roles.includes('orang_tua')
          ? ['attendance.summary.', 'student-leave.', 'academic.announcement.']
          : [];
    const blockedTemplates = roles.includes('kepala_sekolah')
      ? ['student-leave.']
      : [];

    if (roles.includes('orang_tua')) {
      const guardians = await this.prisma.guardian.findMany({
        where: { email: user.email, deletedAt: null, isActive: true },
        select: { email: true, phone: true },
      });
      recipients.push(...guardians.flatMap((guardian) => [
        guardian.email,
        guardian.phone,
      ]));
    }

    return {
      recipients: [...new Set(recipients.filter((recipient): recipient is string => Boolean(recipient)))],
      allowedTemplates,
      blockedTemplates,
    };
  }

  async createPrincipalInbox(input: { entityId: string; teacherName: string; title: string }) {
    const principals = await this.prisma.user.findMany({
      where: { deletedAt: null, roles: { some: { role: { name: 'kepala_sekolah' } } } },
      select: { id: true, name: true, email: true },
    });

    if (!principals.length) return;

    await Promise.all(principals.map((principal) => this.prisma.notificationLog.upsert({
      where: { dedupeKey: `teaching-plan.submitted.${input.entityId}.${principal.id}` },
      update: { readAt: null, status: NotificationStatus.SENT, message: `${input.teacherName} mengirim ${input.title} untuk direview.`, actionUrl: '/principal/review' },
      create: {
        channel: 'IN_APP',
        status: NotificationStatus.SENT,
        recipient: principal.email,
        recipientUserId: principal.id,
        recipientName: principal.name,
        subject: 'Perangkat ajar menunggu review',
        message: `${input.teacherName} mengirim ${input.title} untuk direview.`,
        templateKey: 'teaching-plan.submitted',
        dedupeKey: `teaching-plan.submitted.${input.entityId}.${principal.id}`,
        entityType: 'TeachingPlan',
        entityId: input.entityId,
        actionUrl: '/principal/review',
        attempts: 1,
        sentAt: new Date(),
      },
    })));
  }

  async createTeacherReviewInbox(input: { teacherId: string; entityId: string; title: string; approved: boolean; reviewNote?: string }) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: input.teacherId },
      select: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!teacher?.user) return;

    const templateKey = input.approved ? 'teaching-plan.approved' : 'teaching-plan.revision-requested';
    const message = input.approved
      ? `${input.title} telah disetujui Kepala Sekolah.`
      : `${input.title} perlu direvisi.${input.reviewNote ? ` Catatan: ${input.reviewNote}` : ''}`;

    await this.prisma.notificationLog.upsert({
      where: { dedupeKey: `${templateKey}.${input.entityId}.${teacher.user.id}` },
      update: { readAt: null, status: NotificationStatus.SENT, message, actionUrl: '/teacher/teaching-plans', sentAt: new Date() },
      create: {
        channel: 'IN_APP',
        status: NotificationStatus.SENT,
        recipient: teacher.user.email,
        recipientUserId: teacher.user.id,
        recipientName: teacher.user.name,
        subject: input.approved ? 'Perangkat ajar disetujui' : 'Revisi perangkat ajar',
        message,
        templateKey,
        dedupeKey: `${templateKey}.${input.entityId}.${teacher.user.id}`,
        entityType: 'TeachingPlan',
        entityId: input.entityId,
        actionUrl: '/teacher/teaching-plans',
        attempts: 1,
        sentAt: new Date(),
      },
    });
  }

  async createLateAttendanceRequestInbox(input: {
    agendaId: string;
    attendanceId: string;
    className: string;
    reason?: string | null;
    subjectName: string;
    teacherName: string;
    timeRange: string;
  }) {
    const recipients = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: {
          some: {
            role: {
              name: { in: ['kepala_sekolah', 'operator_sekolah'] },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        roles: { include: { role: true } },
      },
    });

    if (!recipients.length) return;

    const reasonText = input.reason?.trim() ? ` Alasan: ${input.reason.trim()}` : '';
    const message = `${input.teacherName} meminta izin melengkapi presensi terlambat ${input.className} · ${input.subjectName} (${input.timeRange}).${reasonText}`;

    await Promise.all(recipients.map((recipient) => {
      const roles = recipient.roles.map(({ role }) => role.name);
      const actionUrl = roles.includes('kepala_sekolah') ? '/principal/kbm?focus=notSubmitted' : '/admin/schedules';

      return this.prisma.notificationLog.upsert({
        where: { dedupeKey: `attendance.late-submit.requested.${input.attendanceId}.${recipient.id}` },
        update: {
          actionUrl,
          message,
          readAt: null,
          sentAt: new Date(),
          status: NotificationStatus.SENT,
        },
        create: {
          actionUrl,
          attempts: 1,
          channel: 'IN_APP',
          dedupeKey: `attendance.late-submit.requested.${input.attendanceId}.${recipient.id}`,
          entityId: input.attendanceId,
          entityType: 'Attendance',
          message,
          recipient: recipient.email,
          recipientName: recipient.name,
          recipientUserId: recipient.id,
          sentAt: new Date(),
          status: NotificationStatus.SENT,
          subject: 'Pengajuan presensi terlambat',
          templateKey: 'attendance.late-submit.requested',
        },
      });
    }));
  }

  async createPasswordResetRequestInbox(input: {
    userId: string;
    name: string;
    username?: string | null;
    email: string;
    roles: string[];
  }) {
    const recipients = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: {
          some: {
            role: {
              name: { in: ['root', 'operator_sekolah'] },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        roles: { include: { role: true } },
      },
    });

    if (!recipients.length) {
      return;
    }

    const identity = input.username ?? input.email;
    const roleText = input.roles.length ? input.roles.join(', ') : 'tanpa role';
    const message = `${input.name} (${identity}) meminta reset password. Role: ${roleText}.`;

    await Promise.all(
      recipients.map((recipient) => {
        const recipientRoles = recipient.roles.map(({ role }) => role.name);
        const isRoot = recipientRoles.includes('root');
        const isTeacherAccount = input.roles.some((role) =>
          ['guru', 'wali_kelas'].includes(role),
        );
        const actionUrl = isRoot
          ? '/admin/akses'
          : isTeacherAccount
            ? '/admin/guru'
            : '/admin/notifications';

        return this.prisma.notificationLog.upsert({
          where: {
            dedupeKey: `auth.password-reset.request.${input.userId}.${recipient.id}`,
          },
          update: {
            readAt: null,
            status: NotificationStatus.SENT,
            message,
            actionUrl,
            sentAt: new Date(),
          },
          create: {
            channel: 'IN_APP',
            status: NotificationStatus.SENT,
            recipient: recipient.email,
            recipientUserId: recipient.id,
            recipientName: recipient.name,
            subject: 'Request reset password',
            message,
            templateKey: 'auth.password-reset.request',
            dedupeKey: `auth.password-reset.request.${input.userId}.${recipient.id}`,
            entityType: 'User',
            entityId: input.userId,
            actionUrl,
            attempts: 1,
            sentAt: new Date(),
          },
        });
      }),
    );
  }

  async markEntityAsRead(userId: string, entityType: string, entityId: string) {
    await this.prisma.notificationLog.updateMany({
      where: { recipientUserId: userId, entityType, entityId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  private isPersonalNotification(
    scope: { recipients: string[]; allowedTemplates: string[]; blockedTemplates: string[] },
    userId: string,
    notification: { recipientUserId: string | null; recipient: string; templateKey: string | null },
  ) {
    if (scope.blockedTemplates.some((templateKey) => notification.templateKey?.startsWith(templateKey))) {
      return false;
    }

    return notification.recipientUserId === userId || (
      scope.recipients.includes(notification.recipient) &&
      scope.allowedTemplates.some((templateKey) => notification.templateKey?.startsWith(templateKey))
    );
  }

  async getTemplates() {
    return ok(
      await this.prisma.notificationTemplate.findMany({
        where: { deletedAt: null },
        orderBy: [{ channel: 'asc' }, { key: 'asc' }],
      }),
    );
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

    if (notification.channel === 'IN_APP') {
      throw new BadRequestException('Notifikasi inbox tidak diproses melalui queue provider');
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

    return ok(
      {
        notification: updatedNotification,
        job: {
          id: job.id,
          name: job.name,
          queue: job.queueName,
        },
      },
      'Retry notifikasi berhasil dikirim ke queue.',
    );
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

  private async getLogsByStatus(status: NotificationStatus) {
    return ok(
      await this.prisma.notificationLog.findMany({
        where: { status, channel: { not: 'IN_APP' } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    );
  }
}
