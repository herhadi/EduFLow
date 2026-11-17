import { BadRequestException, Injectable } from '@nestjs/common';
import { ok } from '../../core/response/api-response';
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
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getAuditCalendar(month: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? '')) {
      throw new BadRequestException('Format bulan harus YYYY-MM');
    }

    const [year, monthNumber] = month.split('-').map(Number);
    const start = new Date(`${month}-01T00:00:00+07:00`);
    const end = new Date(Date.UTC(year, monthNumber, 1) - 7 * 60 * 60 * 1000);

    const rows = await this.prisma.$queryRaw<Array<{ day: string; count: number }>>`
      SELECT day, SUM(total)::int AS count
      FROM (
        SELECT TO_CHAR("createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS day, COUNT(*)::int AS total
        FROM "AuditLog"
        WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
        GROUP BY 1
        UNION ALL
        SELECT TO_CHAR("createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS day, COUNT(*)::int AS total
        FROM "LoginAudit"
        WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
        GROUP BY 1
        UNION ALL
        SELECT TO_CHAR(COALESCE("sentAt", "failedAt", "createdAt") AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS day, COUNT(*)::int AS total
        FROM "NotificationLog"
        WHERE COALESCE("sentAt", "failedAt", "createdAt") >= ${start}
          AND COALESCE("sentAt", "failedAt", "createdAt") < ${end}
        GROUP BY 1
      ) activity_days
      GROUP BY day
      ORDER BY day
    `;

    return ok(rows.map((row) => ({ date: row.day, count: Number(row.count) })));
  }

  async getActivityTrail(date?: string) {
    const dateRange = this.getDateRange(date);
    const [auditLogs, notifications] = await Promise.all([
      this.prisma.auditLog.findMany({
        ...(dateRange ? { where: { createdAt: dateRange } } : {}),
        orderBy: { createdAt: 'desc' },
        take: dateRange ? 500 : 100,
      }),
      this.prisma.notificationLog.findMany({
        ...(dateRange ? {
          where: {
            OR: [
              { sentAt: dateRange },
              { failedAt: dateRange },
              { sentAt: null, failedAt: null, createdAt: dateRange },
            ],
          },
        } : {}),
        orderBy: { createdAt: 'desc' },
        take: dateRange ? 500 : 100,
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
        metadata: { before: log.before, after: log.after },
      })),
      ...notifications.map((notification) => ({
        id: `notification:${notification.id}`,
        time: (notification.sentAt ?? notification.failedAt ?? notification.createdAt).toISOString(),
        action: notification.status === 'SENT' ? 'notification.sent' : notification.status === 'FAILED' ? 'notification.failed' : 'notification.pending',
        entityType: notification.entityType ?? 'Notification',
        entityId: notification.entityId ?? notification.id,
        description: notification.status === 'SENT'
          ? `${notification.templateKey ?? 'Notifikasi'} dikirim ke ${notification.recipientName ?? notification.recipient}`
          : notification.status === 'FAILED'
            ? `${notification.templateKey ?? 'Notifikasi'} gagal dikirim ke ${notification.recipientName ?? notification.recipient}`
            : `${notification.templateKey ?? 'Notifikasi'} menunggu diproses`,
        source: 'notification' as const,
        actor: null,
        metadata: { channel: notification.channel, status: notification.status, attempts: notification.attempts, lastError: notification.lastError },
      })),
    ];

    activities.sort((first, second) => new Date(second.time).getTime() - new Date(first.time).getTime());
    return ok(activities.slice(0, dateRange ? 500 : 100));
  }

  async getLoginAudit(date?: string) {
    const logs = await this.prisma.loginAudit.findMany({
      ...(this.getDateRange(date) ? { where: { createdAt: this.getDateRange(date)! } } : {}),
      orderBy: { createdAt: 'desc' },
      take: date ? 500 : 200,
      include: {
        user: {
          select: {
            id: true, username: true, name: true,
            roles: { select: { role: { select: { name: true } } } },
          },
        },
      },
    });

    return ok(logs.map((log) => ({
      id: log.id, email: log.email, status: log.status, ipAddress: log.ipAddress,
      userAgent: log.userAgent, reason: log.reason, createdAt: log.createdAt.toISOString(),
      user: log.user ? {
        id: log.user.id, username: log.user.username, name: log.user.name,
        roles: log.user.roles.map(({ role }) => role.name),
      } : null,
    })));
  }

  async record(data: {
    userId?: string | null; action: string; entityType: string; entityId: string;
    before?: unknown; after?: unknown;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId, action: data.action, entityType: data.entityType, entityId: data.entityId,
        before: data.before === undefined ? undefined : JSON.parse(JSON.stringify(data.before)),
        after: data.after === undefined ? undefined : JSON.parse(JSON.stringify(data.after)),
      },
    });
  }

  private getDateRange(date?: string) {
    if (!date) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Format tanggal harus YYYY-MM-DD');
    const [year, month, day] = date.split('-').map(Number);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) {
      throw new BadRequestException('Tanggal tidak valid');
    }
    const start = new Date(`${date}T00:00:00+07:00`);
    return { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
  }

  private describeAudit(action: string, entityType: string) {
    const descriptions: Record<string, string> = {
      'attendance.submitted': 'Guru submit presensi', 'attendance.opened': 'Guru membuka kelas',
      'attendance.approved': 'Operator approve presensi', 'schedule.created': 'Jadwal dibuat',
      'schedule.updated': 'Jadwal diubah', 'schedule.deleted': 'Jadwal dinonaktifkan',
      'agenda.generated': 'Agenda harian digenerate', 'notification.retry': 'Notifikasi gagal dikirim ulang ke queue',
    };
    return descriptions[action] ?? `${entityType} mengalami aktivitas ${action}`;
  }
}
