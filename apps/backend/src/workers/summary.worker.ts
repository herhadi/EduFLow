import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_JOBS, QUEUES } from '@eduflow/shared';
import { AttendanceStatus, NotificationStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor(QUEUES.ATTENDANCE_SUMMARY)
export class SummaryWorker extends WorkerHost {
  private readonly logger = new Logger(SummaryWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    this.logJob('queue.job.started', job);

    try {
      if (job.name === QUEUE_JOBS.ATTENDANCE_SUMMARY_DAILY) {
        const created = await this.createParentAttendanceInbox(job);
        this.logJob('queue.job.completed', job);

        return {
          processed: true,
          jobName: job.name,
          created,
          message: 'Summary attendance diproses dan inbox wali murid dibuat.',
        };
      }

      const result = {
        processed: true,
        jobName: job.name,
        message: 'Summary attendance dilewati karena job tidak dikenali.',
      };

      this.logJob('queue.job.completed', job);
      return result;
    } catch (error) {
      this.logJob('queue.job.failed', job, error);
      throw error;
    }
  }

  private logJob(event: string, job: Job, error?: unknown) {
    this.logger[error ? 'error' : 'log'](
      JSON.stringify({
        event,
        queueName: QUEUES.ATTENDANCE_SUMMARY,
        jobName: job.name,
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        correlationId: job.data?.correlationId,
        error: error instanceof Error ? error.message : undefined,
      }),
    );
  }

  private async createParentAttendanceInbox(job: Job) {
    const attendanceId = job.data?.attendanceId as string | undefined;

    if (!attendanceId) {
      return 0;
    }

    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        agenda: {
          include: {
            class: true,
            subject: true,
            teacher: true,
            substituteTeacher: true,
            schedule: true,
          },
        },
        items: {
          include: {
            student: {
              include: {
                guardians: {
                  where: { deletedAt: null },
                  include: { guardian: true },
                },
              },
            },
          },
        },
      },
    });

    if (!attendance) {
      return 0;
    }

    let created = 0;

    for (const item of attendance.items) {
      const guardianRecipients = this.uniqueActiveGuardianRecipients(
        item.student.guardians.map((relation) => relation.guardian),
      );

      for (const { guardian, recipient } of guardianRecipients) {
        const recipientUser = guardian.email === recipient
          ? await this.prisma.user.findFirst({
              where: { email: guardian.email, deletedAt: null },
              select: { id: true, name: true },
            })
          : null;
        const statusLabel = this.getAttendanceStatusLabel(item.status);
        const teacherName = attendance.agenda.substituteTeacher?.name ?? attendance.agenda.teacher.name;
        const message = `${item.student.name} tercatat ${statusLabel} pada ${attendance.agenda.subject.name} (${attendance.agenda.class.name}) bersama ${teacherName}.`;

        await this.prisma.notificationLog.upsert({
          where: {
            dedupeKey: `attendance.summary.daily.${attendance.id}.${item.studentId}.${recipient}`,
          },
          update: {
            readAt: null,
            status: NotificationStatus.SENT,
            recipient,
            recipientUserId: recipientUser?.id ?? null,
            recipientName: recipientUser?.name ?? guardian.name,
            message,
            actionUrl: '/parent/reports',
            sentAt: new Date(),
          },
          create: {
            channel: 'IN_APP',
            status: NotificationStatus.SENT,
            recipient,
            recipientUserId: recipientUser?.id ?? null,
            recipientName: recipientUser?.name ?? guardian.name,
            subject: 'Ringkasan presensi anak',
            message,
            templateKey: 'attendance.summary.daily',
            dedupeKey: `attendance.summary.daily.${attendance.id}.${item.studentId}.${recipient}`,
            entityType: 'Attendance',
            entityId: attendance.id,
            actionUrl: '/parent/reports',
            attempts: 1,
            sentAt: new Date(),
          },
        });
        created += 1;
      }
    }

    return created;
  }

  private uniqueActiveGuardianRecipients<
    T extends { email: string | null; phone: string | null; isActive: boolean; deletedAt: Date | null },
  >(guardians: T[]) {
    return Array.from(
      new Map(
        guardians
          .filter((guardian) => guardian.isActive && !guardian.deletedAt)
          .map((guardian) => {
            const recipient = guardian.email ?? guardian.phone;
            return recipient ? [recipient, { guardian, recipient }] : null;
          })
          .filter((entry): entry is [string, { guardian: T; recipient: string }] => Boolean(entry)),
      ).values(),
    );
  }

  private getAttendanceStatusLabel(status: AttendanceStatus) {
    const labels: Record<AttendanceStatus, string> = {
      PRESENT: 'Hadir',
      SICK: 'Sakit',
      EXCUSED: 'Izin',
      ABSENT: 'Alpha',
    };

    return labels[status];
  }
}
