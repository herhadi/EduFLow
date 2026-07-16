import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueProducerService } from '../../../queue/queue-producer.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { GenerateAgendaDto } from '../dto/generate-agenda.dto';
import { GenerateBulkAgendaDto } from '../dto/generate-bulk-agenda.dto';
import {
  buildDailyAgendaCreateData,
  findSemesterForDate,
  getAgendaDateKey,
  getAgendaKey,
  getClassIdFilter,
  getEffectiveSchedulesForDate,
} from './agenda-generation-utils';
import { getDateRange, getReminderDateTime, getScheduleSnapshotAtDate } from './schedule-utils';

@Injectable()
export class AgendaGenerationService {
  private readonly logger = new Logger(AgendaGenerationService.name);
  private readonly reminderOffsetMinutes = 5;
  private readonly defaultTimezoneOffsetMinutes = 7 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly queueProducer: QueueProducerService,
  ) {}

  async generateAgenda(id: string, dto: GenerateAgendaDto) {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id, deletedAt: null },
      include: { revisions: { orderBy: { effectiveFrom: 'asc' } } },
    });

    if (!schedule) {
      throw new NotFoundException('Jadwal tidak ditemukan');
    }

    const agendaDate = this.toDateOnly(dto.date);
    const existingAgenda = await this.prisma.dailyAgenda.findFirst({
      where: {
        scheduleId: schedule.id,
        date: agendaDate,
      },
      include: {
        class: true,
        subject: true,
        teacher: true,
        attendance: true,
      },
    });

    if (existingAgenda) {
      return {
        data: existingAgenda,
        message: 'Agenda sudah ada, generate dilewati.',
      };
    }

    if (await this.isAgendaBlockedByCalendar(schedule.schoolYearId, agendaDate)) {
      throw new BadRequestException('Tanggal ini diblokir oleh Kaldik, agenda tidak dapat dibuat');
    }

    const effectiveSchedule = getScheduleSnapshotAtDate(schedule, agendaDate);
    const semester = await this.prisma.semester.findFirstOrThrow({
      where: {
        schoolYearId: schedule.schoolYearId,
        startsAt: { lte: agendaDate },
        endsAt: { gte: agendaDate },
        deletedAt: null,
      },
    });
    const agenda = await this.createAgendaFromEffectiveSchedule(effectiveSchedule, semester.id, agendaDate);

    await this.auditService.record({
      action: 'agenda.generated',
      entityType: 'DailyAgenda',
      entityId: agenda.id,
      after: {
        agendaId: agenda.id,
        scheduleId: schedule.id,
        date: agenda.date,
        classId: agenda.classId,
        subjectId: agenda.subjectId,
        teacherId: agenda.teacherId,
      },
    });

    return { data: agenda, message: 'Agenda berhasil digenerate.' };
  }

  async generateBulkAgenda(dto: GenerateBulkAgendaDto) {
    const startsAt = this.toDateOnly(dto.startsAt);
    const endsAt = this.toDateOnly(dto.endsAt);

    if (endsAt < startsAt) {
      throw new BadRequestException('Tanggal akhir tidak boleh lebih awal dari tanggal mulai');
    }

    const dates = getDateRange(startsAt, endsAt);

    if (dates.length > 31) {
      throw new BadRequestException('Generate agenda manual maksimal 31 hari per proses');
    }

    const semesters = await this.prisma.semester.findMany({
      where: {
        schoolYearId: dto.schoolYearId,
        startsAt: { lte: endsAt },
        endsAt: { gte: startsAt },
        deletedAt: null,
      },
      orderBy: { startsAt: 'asc' },
    });

    if (!semesters.length) {
      throw new BadRequestException('Rentang tanggal tidak berada dalam tahun ajaran aktif');
    }

    const schoolYearId = semesters[0].schoolYearId;
    const blockedDates = await this.getBlockedAgendaDates(schoolYearId, startsAt, endsAt);
    const schedules = await this.prisma.schedule.findMany({
      where: {
        schoolYearId,
        deletedAt: null,
        isActive: true,
      },
      include: {
        revisions: { orderBy: { effectiveFrom: 'asc' } },
      },
    });
    const classIds = getClassIdFilter(dto);
    const agendas = [];
    let skipped = 0;
    let calendarSkipped = 0;

    for (const agendaDate of dates) {
      if (blockedDates.has(getAgendaDateKey(agendaDate))) {
        calendarSkipped += 1;
        continue;
      }

      const semester = findSemesterForDate(semesters, agendaDate);

      if (!semester) continue;

      const effectiveSchedules = getEffectiveSchedulesForDate(schedules, agendaDate, classIds);

      for (const schedule of effectiveSchedules) {
        const existingAgenda = await this.prisma.dailyAgenda.findFirst({
          where: { scheduleId: schedule.id, date: agendaDate },
          include: { class: true, subject: true, teacher: true, substituteTeacher: true, attendance: true },
        });

        if (existingAgenda) {
          skipped += 1;
          agendas.push(existingAgenda);
          continue;
        }

        agendas.push(await this.createAgendaFromEffectiveSchedule(schedule, semester.id, agendaDate));
      }
    }

    await this.auditService.record({
      action: 'agenda.bulk-generated',
      entityType: 'DailyAgenda',
      entityId: agendas.map((agenda) => agenda.id).join(','),
      after: {
        startsAt,
        endsAt,
        classId: dto.classId ?? null,
        classIds: dto.classIds ?? null,
        schoolYearId,
        generated: agendas.length - skipped,
        skipped,
        calendarSkipped,
      },
    });

    return {
      data: agendas,
      message: `${agendas.length - skipped} agenda dibuat, ${skipped} sudah ada, ${calendarSkipped} hari dilewati oleh Kaldik.`,
    };
  }

  async getAgendaCoverage(input: {
    schoolYearId?: string;
    startsAt?: string;
    endsAt?: string;
    classId?: string;
  }) {
    if (!input.schoolYearId || !input.startsAt || !input.endsAt) {
      throw new BadRequestException('Tahun ajaran, tanggal mulai, dan tanggal akhir wajib diisi');
    }

    const startsAt = this.toDateOnly(input.startsAt);
    const endsAt = this.toDateOnly(input.endsAt);
    if (endsAt < startsAt) throw new BadRequestException('Tanggal akhir tidak boleh lebih awal dari tanggal mulai');

    const dates = getDateRange(startsAt, endsAt);
    const blockedDates = await this.getBlockedAgendaDates(input.schoolYearId, startsAt, endsAt);
    const schedules = await this.prisma.schedule.findMany({
      where: {
        schoolYearId: input.schoolYearId,
        deletedAt: null,
        isActive: true,
        ...(input.classId ? { classId: input.classId } : {}),
      },
      include: { revisions: { orderBy: { effectiveFrom: 'asc' } } },
    });
    const existingAgendas = await this.prisma.dailyAgenda.findMany({
      where: {
        schoolYearId: input.schoolYearId,
        date: { gte: startsAt, lte: endsAt },
        ...(input.classId ? { classId: input.classId } : {}),
      },
      select: { scheduleId: true, date: true },
    });
    const agendaKeys = new Set(existingAgendas
      .filter((agenda): agenda is { scheduleId: string; date: Date } => Boolean(agenda.scheduleId))
      .map((agenda) => getAgendaKey(agenda.scheduleId, agenda.date)));
    const missing: Array<{
      date: string;
      scheduleId: string;
      classId: string;
      subjectId: string;
      teacherId: string;
      startsAt: string;
      endsAt: string;
    }> = [];
    let expected = 0;
    let blockedDateCount = 0;

    for (const date of dates) {
      const dateKey = getAgendaDateKey(date);
      if (blockedDates.has(dateKey)) {
        blockedDateCount += 1;
        continue;
      }

      const effectiveSchedules = getEffectiveSchedulesForDate(schedules, date);

      for (const schedule of effectiveSchedules) {
        expected += 1;
        if (!agendaKeys.has(getAgendaKey(schedule.id, date))) {
          missing.push({
            date: dateKey,
            scheduleId: schedule.id,
            classId: schedule.classId,
            subjectId: schedule.subjectId,
            teacherId: schedule.teacherId,
            startsAt: schedule.startsAt,
            endsAt: schedule.endsAt,
          });
        }
      }
    }

    return {
      data: {
        expected,
        existing: expected - missing.length,
        missing: missing.length,
        blockedDates: blockedDateCount,
        items: missing.slice(0, 50),
      },
    };
  }

  private async createAgendaFromEffectiveSchedule(
    schedule: {
      id: string;
      schoolYearId: string;
      classId: string;
      subjectId: string;
      teacherId: string;
      startsAt: string;
    },
    semesterId: string,
    agendaDate: Date,
  ) {
    const agenda = await this.prisma.dailyAgenda.create({
      data: buildDailyAgendaCreateData(schedule, semesterId, agendaDate),
      include: {
        class: true,
        subject: true,
        teacher: true,
        substituteTeacher: true,
        attendance: true,
      },
    });

    await this.enqueueTeacherReminderBeforeClass(agenda.id, agenda.date, schedule.startsAt);

    return agenda;
  }

  private async enqueueTeacherReminderBeforeClass(agendaId: string, agendaDate: Date, startsAt: string) {
    try {
      const reminderAt = getReminderDateTime({
        date: agendaDate,
        startsAt,
        timezoneOffsetMinutes: this.getSchoolTimezoneOffsetMinutes(),
        reminderOffsetMinutes: this.reminderOffsetMinutes,
      });
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
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'teacher.reminder.enqueue.failed',
          agendaId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  private async isAgendaBlockedByCalendar(schoolYearId: string, date: Date) {
    const blockedEvent = await this.prisma.academicCalendarEvent.findFirst({
      where: {
        schoolYearId,
        blocksAgenda: true,
        deletedAt: null,
        startsAt: { lte: date },
        endsAt: { gte: date },
      },
      select: { id: true },
    });
    return Boolean(blockedEvent);
  }

  private async getBlockedAgendaDates(schoolYearId: string, startsAt: Date, endsAt: Date) {
    const events = await this.prisma.academicCalendarEvent.findMany({
      where: {
        schoolYearId,
        blocksAgenda: true,
        deletedAt: null,
        startsAt: { lte: endsAt },
        endsAt: { gte: startsAt },
      },
      select: { startsAt: true, endsAt: true },
    });
    return new Set(events.flatMap((event) => getDateRange(event.startsAt, event.endsAt)
      .map((date) => date.toISOString().slice(0, 10))));
  }

  private toDateOnly(value: string) {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private getSchoolTimezoneOffsetMinutes() {
    return Number(
      this.configService.get<string>('SCHOOL_TIMEZONE_OFFSET_MINUTES') ?? this.defaultTimezoneOffsetMinutes,
    );
  }
}
