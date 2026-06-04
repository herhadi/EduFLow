import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ActivityItem {
  id: string;
  time: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  source: 'audit' | 'notification';
  actor?: string | null;
  metadata?: unknown;
}

@Injectable()
export class AuditService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDemoActivities();
  }

  async getActivityTrail() {
    const [auditLogs, notifications] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.notificationLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const activities: ActivityItem[] = [
      ...auditLogs.map((log) => ({
        id: `audit:${log.id}`,
        time: log.createdAt.toISOString(),
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        description: this.describeAudit(log.action, log.entityType),
        source: 'audit' as const,
        actor: log.userId,
        metadata: {
          before: log.before,
          after: log.after,
        },
      })),
      ...notifications.map((notification) => ({
        id: `notification:${notification.id}`,
        time:
          notification.sentAt?.toISOString() ??
          notification.failedAt?.toISOString() ??
          notification.createdAt.toISOString(),
        action:
          notification.status === 'SENT'
            ? 'notification.sent'
            : notification.status === 'FAILED'
              ? 'notification.failed'
              : 'notification.pending',
        entityType: notification.entityType ?? 'Notification',
        entityId: notification.entityId ?? notification.id,
        description:
          notification.status === 'SENT'
            ? `${notification.templateKey ?? 'Notifikasi'} dikirim ke ${
                notification.recipientName ?? notification.recipient
              }`
            : notification.status === 'FAILED'
              ? `${notification.templateKey ?? 'Notifikasi'} gagal dikirim ke ${
                  notification.recipientName ?? notification.recipient
                }`
              : `${notification.templateKey ?? 'Notifikasi'} menunggu diproses`,
        source: 'notification' as const,
        actor: null,
        metadata: {
          channel: notification.channel,
          status: notification.status,
          attempts: notification.attempts,
          lastError: notification.lastError,
        },
      })),
    ];

    activities.sort(
      (first, second) =>
        new Date(second.time).getTime() - new Date(first.time).getTime(),
    );

    return { data: activities.slice(0, 100) };
  }

  async record(data: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        before: data.before === undefined ? undefined : JSON.parse(JSON.stringify(data.before)),
        after: data.after === undefined ? undefined : JSON.parse(JSON.stringify(data.after)),
      },
    });
  }

  private describeAudit(action: string, entityType: string) {
    const descriptions: Record<string, string> = {
      'attendance.submitted': 'Guru submit presensi',
      'attendance.opened': 'Guru membuka kelas',
      'attendance.approved': 'Operator approve presensi',
      'schedule.created': 'Jadwal dibuat',
      'schedule.updated': 'Jadwal diubah',
      'schedule.deleted': 'Jadwal dinonaktifkan',
      'agenda.generated': 'Agenda harian digenerate',
      'notification.retry': 'Notifikasi gagal dikirim ulang ke queue',
    };

    return descriptions[action] ?? `${entityType} mengalami aktivitas ${action}`;
  }

  private async ensureDemoActivities() {
    const existingCount = await this.prisma.auditLog.count();

    if (existingCount > 0) {
      return;
    }

    const today = new Date();
    today.setHours(8, 1, 0, 0);

    const activities = [
      {
        action: 'attendance.submitted',
        entityType: 'Attendance',
        entityId: 'demo-attendance-0801',
        after: { description: 'Guru A submit presensi' },
        createdAt: new Date(today),
      },
      {
        action: 'attendance.approved',
        entityType: 'Attendance',
        entityId: 'demo-attendance-0815',
        after: { description: 'Operator approve presensi' },
        createdAt: addMinutes(today, 14),
      },
      {
        action: 'schedule.updated',
        entityType: 'Schedule',
        entityId: 'demo-schedule-0900',
        after: { description: 'Jadwal diubah' },
        createdAt: addMinutes(today, 59),
      },
    ];

    await Promise.all(
      activities.map((activity) =>
        this.prisma.auditLog.create({
          data: activity,
        }),
      ),
    );
  }
}

function addMinutes(date: Date, minutes: number) {
  const nextDate = new Date(date);
  nextDate.setMinutes(nextDate.getMinutes() + minutes);
  return nextDate;
}
