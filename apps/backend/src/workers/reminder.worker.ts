import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { QUEUE_JOBS, QUEUES } from '@eduflow/shared';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QueueProducerService } from '../queue/queue-producer.service';

@Processor(QUEUES.TEACHER_REMINDER)
export class ReminderWorker extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(ReminderWorker.name);
  private readonly reminderOffsetMinutes = 5;
  private readonly defaultTimezoneOffsetMinutes = 7 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueProducer: QueueProducerService,
  ) {
    super();
  }

  async onModuleInit() {
    try {
      await this.enqueueUpcomingAgendaReminders();
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'teacher.reminder.bootstrap.failed',
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  async process(job: Job) {
    this.logJob('queue.job.started', job);

    try {
      const result = job.name === QUEUE_JOBS.TEACHER_REMINDER_BEFORE_CLASS
        ? await this.processBeforeClassReminder(job)
        : { processed: false, jobName: job.name, message: 'Job reminder tidak dikenal.' };

      this.logJob('queue.job.completed', job);
      return result;
    } catch (error) {
      this.logJob('queue.job.failed', job, error);
      throw error;
    }
  }

  private async enqueueUpcomingAgendaReminders() {
    const today = this.toDateOnly(new Date());
    const endsAt = new Date(today);
    endsAt.setUTCDate(endsAt.getUTCDate() + 14);

    const agendas = await this.prisma.dailyAgenda.findMany({
      where: {
        date: { gte: today, lte: endsAt },
        status: { not: 'CANCELLED' },
      },
      include: {
        schedule: { include: { revisions: { orderBy: { effectiveFrom: 'asc' } } } },
      },
    });

    await Promise.all(
      agendas.map((agenda) => {
        const startsAt = this.getEffectiveAgendaStartsAt(agenda);

        if (!startsAt) {
          return null;
        }

        return this.enqueueBeforeClassReminder(agenda.id, agenda.date, startsAt);
      }),
    );
  }

  private async processBeforeClassReminder(job: Job) {
    const agendaId = job.data?.agendaId as string | undefined;

    if (!agendaId) {
      return { processed: false, message: 'agendaId tidak tersedia.' };
    }

    const agenda = await this.prisma.dailyAgenda.findUnique({
      where: { id: agendaId },
      include: {
        class: true,
        subject: true,
        teacher: { include: { user: true } },
        substituteTeacher: { include: { user: true } },
        schedule: { include: { revisions: { orderBy: { effectiveFrom: 'asc' } } } },
      },
    });

    if (!agenda || agenda.status === 'CANCELLED') {
      return { processed: false, agendaId, message: 'Agenda tidak aktif atau sudah dibatalkan.' };
    }

    const recipientTeacher = agenda.substituteTeacher ?? agenda.teacher;
    const recipientUser = recipientTeacher.user;
    const telegramId = recipientUser?.telegramId ?? recipientTeacher.telegramId;

    if (!telegramId) {
      return { processed: false, agendaId, message: 'Guru belum mengaktifkan Telegram.' };
    }

    const currentStartsAt = this.getEffectiveAgendaStartsAt(agenda);

    if (!currentStartsAt) {
      return { processed: false, agendaId, message: 'Jam mulai agenda tidak ditemukan.' };
    }

    const earliestAgenda = await this.getFirstAgendaForTeacherOnDate(
      recipientTeacher.id,
      agenda.date,
    );

    if (!earliestAgenda || earliestAgenda.id !== agenda.id) {
      return {
        processed: false,
        agendaId,
        message: 'Agenda bukan jam pelajaran pertama guru pada tanggal tersebut.',
      };
    }

    const dateKey = agenda.date.toISOString().slice(0, 10);
    const dedupeKey = `teacher.reminder.before-class.${recipientTeacher.id}.${dateKey}`;
    const existingNotification = await this.prisma.notificationLog.findUnique({
      where: { dedupeKey },
    });

    if (
      existingNotification &&
      (
        existingNotification.status === NotificationStatus.PENDING ||
        existingNotification.status === NotificationStatus.SENT
      )
    ) {
      return { processed: false, agendaId, notificationId: existingNotification.id, message: 'Reminder sudah dibuat.' };
    }

    const message = [
      `Halo, ${recipientUser?.name ?? recipientTeacher.name}.`,
      '',
      `Pengingat KBM: ${agenda.class.name} - ${agenda.subject.name} mulai pukul ${currentStartsAt}.`,
      'Mohon bersiap membuka kelas dan mengisi presensi sesuai agenda hari ini.',
    ].join('\n');

    const notification = await this.prisma.notificationLog.upsert({
      where: { dedupeKey },
      update: {
        status: NotificationStatus.PENDING,
        recipient: telegramId,
        recipientUserId: recipientUser?.id,
        recipientName: recipientUser?.name ?? recipientTeacher.name,
        subject: 'Pengingat jam pelajaran pertama',
        message,
        attempts: { increment: 1 },
        lastError: null,
        failedAt: null,
        readAt: null,
      },
      create: {
        channel: 'TELEGRAM',
        status: NotificationStatus.PENDING,
        recipient: telegramId,
        recipientUserId: recipientUser?.id,
        recipientName: recipientUser?.name ?? recipientTeacher.name,
        subject: 'Pengingat jam pelajaran pertama',
        message,
        templateKey: 'teacher.reminder.before-class',
        dedupeKey,
        entityType: 'DailyAgenda',
        entityId: agenda.id,
        actionUrl: '/teacher/attendance',
        attempts: 1,
      },
    });

    await this.queueProducer.addNotificationSend('TELEGRAM', {
      notificationId: notification.id,
      channel: 'TELEGRAM',
      recipient: telegramId,
      templateKey: notification.templateKey,
      dedupeKey,
    });

    return {
      processed: true,
      agendaId,
      notificationId: notification.id,
      message: 'Reminder Telegram guru dibuat.',
    };
  }

  private async getFirstAgendaForTeacherOnDate(teacherId: string, date: Date) {
    const agendas = await this.prisma.dailyAgenda.findMany({
      where: {
        date,
        status: { not: 'CANCELLED' },
        OR: [
          { teacherId, substituteTeacherId: null },
          { substituteTeacherId: teacherId },
        ],
      },
      include: {
        schedule: { include: { revisions: { orderBy: { effectiveFrom: 'asc' } } } },
      },
    });

    return agendas
      .map((agenda) => ({ agenda, startsAt: this.getEffectiveAgendaStartsAt(agenda) }))
      .filter((item): item is { agenda: typeof agendas[number]; startsAt: string } => Boolean(item.startsAt))
      .sort((first, second) => first.startsAt.localeCompare(second.startsAt))[0]?.agenda;
  }

  private async enqueueBeforeClassReminder(agendaId: string, agendaDate: Date, startsAt: string) {
    const reminderAt = this.getReminderDateTime(agendaDate, startsAt);
    const classStartsAt = new Date(reminderAt.getTime() + (this.reminderOffsetMinutes * 60_000));

    if (classStartsAt.getTime() <= Date.now()) {
      return;
    }

    const delay = Math.max(0, reminderAt.getTime() - Date.now());

    await this.queueProducer.addTeacherReminderBeforeClass(
      { agendaId },
      delay,
      `teacher-reminder-before-class:${agendaId}`,
    );
  }

  private getEffectiveAgendaStartsAt(agenda: {
    date: Date;
    schedule?: {
      startsAt: string;
      revisions?: Array<{ effectiveFrom: Date; startsAt: string }>;
    } | null;
  }) {
    const revision = agenda.schedule?.revisions
      ?.filter((item) => item.effectiveFrom <= agenda.date)
      .at(-1);

    return revision?.startsAt ?? agenda.schedule?.startsAt ?? null;
  }

  private getReminderDateTime(date: Date, startsAt: string) {
    const [hoursText, minutesText] = startsAt.split(':');
    const hours = Number(hoursText);
    const minutes = Number(minutesText);
    const timezoneOffsetMinutes = Number(process.env.SCHOOL_TIMEZONE_OFFSET_MINUTES ?? this.defaultTimezoneOffsetMinutes);
    const localStartUtcMs = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hours,
      minutes,
    ) - (timezoneOffsetMinutes * 60_000);

    return new Date(localStartUtcMs - (this.reminderOffsetMinutes * 60_000));
  }

  private toDateOnly(value: Date) {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private logJob(event: string, job: Job, error?: unknown) {
    this.logger[error ? 'error' : 'log'](
      JSON.stringify({
        event,
        queueName: QUEUES.TEACHER_REMINDER,
        jobName: job.name,
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        correlationId: job.data?.correlationId,
        error: error instanceof Error ? error.message : undefined,
      }),
    );
  }
}
