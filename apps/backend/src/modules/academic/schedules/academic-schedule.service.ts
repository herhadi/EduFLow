import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TeacherAssignmentStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateBulkScheduleDto } from '../dto/create-bulk-schedule.dto';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { getEffectiveTeacherAssignment, getScheduleSnapshotAtDate } from './schedule-utils';

@Injectable()
export class AcademicScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getSchedules(classId?: string) {
    return {
      data: await this.prisma.schedule.findMany({
        where: { deletedAt: null, classId },
        include: {
          schoolYear: true,
          semester: true,
          class: true,
          subject: true,
          teacher: true,
          timeSlot: true,
          revisions: {
            include: { semester: true, class: true, subject: true, teacher: true, timeSlot: true },
            orderBy: { effectiveFrom: 'asc' },
          },
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startsAt: 'asc' }],
      }),
    };
  }

  async getSchedule(id: string) {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id, deletedAt: null },
      include: {
        schoolYear: true,
        semester: true,
        class: true,
        subject: true,
        teacher: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Jadwal tidak ditemukan');
    }

    return { data: schedule };
  }

  async createSchedule(dto: CreateScheduleDto) {
    this.validateScheduleTime(dto.startsAt, dto.endsAt);
    await this.ensureScheduleRelations(dto);

    const schedule = await this.prisma.schedule.create({
      data: dto,
      include: {
        schoolYear: true,
        semester: true,
        class: true,
        subject: true,
        teacher: true,
      },
    });

    await this.auditService.record({
      action: 'schedule.created',
      entityType: 'Schedule',
      entityId: schedule.id,
      after: schedule,
    });

    return { data: schedule, message: 'Jadwal berhasil dibuat.' };
  }

  async createBulkSchedule(dto: CreateBulkScheduleDto) {
    const assignments = dto.assignments.map((assignment) => ({
      timeSlotId: assignment.timeSlotId,
      classIds: [...new Set(assignment.classIds)],
    }));
    const timeSlots = await this.ensureBulkScheduleRelations({
      ...dto,
      assignments,
    });

    for (const timeSlot of timeSlots) {
      const assignment = assignments.find((item) => item.timeSlotId === timeSlot.id);
      await this.ensureScheduleAvailability(
        {
          schoolYearId: dto.schoolYearId,
          semesterId: dto.semesterId,
          teacherId: dto.teacherId,
          classIds: assignment?.classIds ?? [],
        },
        timeSlot,
      );
    }

    const schedules = await this.prisma.$transaction(
      timeSlots.flatMap((timeSlot) =>
        (assignments.find((item) => item.timeSlotId === timeSlot.id)?.classIds ?? []).map((classId) =>
          this.prisma.schedule.create({
            data: {
              schoolYearId: dto.schoolYearId,
              semesterId: dto.semesterId,
              classId,
              subjectId: dto.subjectId,
              teacherId: dto.teacherId,
              timeSlotId: timeSlot.id,
              dayOfWeek: timeSlot.dayOfWeek,
              startsAt: timeSlot.startsAt,
              endsAt: timeSlot.endsAt,
            },
            include: {
              schoolYear: true,
              semester: true,
              class: true,
              subject: true,
              teacher: true,
              timeSlot: true,
            },
          }),
        ),
      ),
    );

    await this.auditService.record({
      action: 'schedule.bulk-created',
      entityType: 'Schedule',
      entityId: schedules.map((schedule) => schedule.id).join(','),
      after: {
        teacherId: dto.teacherId,
        subjectId: dto.subjectId,
        assignments,
      },
    });

    return {
      data: schedules,
      message: `${schedules.length} sesi jadwal berhasil dibuat.`,
    };
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto) {
    const existingSchedule = await this.prisma.schedule.findFirst({
      where: { id, deletedAt: null },
      include: { semester: true },
    });

    if (!existingSchedule) {
      throw new NotFoundException('Jadwal tidak ditemukan');
    }

    const { effectiveFrom, reason, ...scheduleChanges } = dto;
    const nextSchedule = { ...existingSchedule, ...scheduleChanges };
    this.validateScheduleTime(nextSchedule.startsAt, nextSchedule.endsAt);
    await this.ensureScheduleRelations(nextSchedule);

    const revisionSemester = await this.prisma.semester.findUniqueOrThrow({
      where: { id: nextSchedule.semesterId },
    });
    const revisionEffectiveFrom = effectiveFrom
      ? this.toDateOnly(effectiveFrom)
      : revisionSemester.startsAt;

    if (revisionEffectiveFrom < revisionSemester.startsAt || revisionEffectiveFrom > revisionSemester.endsAt) {
      throw new BadRequestException('Tanggal revisi harus berada dalam semester yang dipilih');
    }
    await this.ensureScheduleRevisionAvailability(id, nextSchedule, revisionEffectiveFrom);

    const revision = await this.prisma.scheduleRevision.upsert({
      where: { scheduleId_effectiveFrom: { scheduleId: id, effectiveFrom: revisionEffectiveFrom } },
      update: {
        semesterId: revisionSemester.id,
        classId: nextSchedule.classId,
        subjectId: nextSchedule.subjectId,
        teacherId: nextSchedule.teacherId,
        timeSlotId: nextSchedule.timeSlotId,
        dayOfWeek: nextSchedule.dayOfWeek,
        startsAt: nextSchedule.startsAt,
        endsAt: nextSchedule.endsAt,
        reason: reason?.trim() || null,
      },
      create: {
        scheduleId: id,
        semesterId: revisionSemester.id,
        effectiveFrom: revisionEffectiveFrom,
        classId: nextSchedule.classId,
        subjectId: nextSchedule.subjectId,
        teacherId: nextSchedule.teacherId,
        timeSlotId: nextSchedule.timeSlotId,
        dayOfWeek: nextSchedule.dayOfWeek,
        startsAt: nextSchedule.startsAt,
        endsAt: nextSchedule.endsAt,
        reason: reason?.trim() || null,
      },
      include: { semester: true, class: true, subject: true, teacher: true, timeSlot: true },
    });

    await this.auditService.record({
      action: 'schedule.updated',
      entityType: 'Schedule',
      entityId: id,
      before: existingSchedule,
      after: revision,
    });

    return { data: { ...existingSchedule, revisions: [revision] }, message: 'Revisi jadwal berhasil disimpan.' };
  }

  async deleteSchedule(id: string) {
    const existingSchedule = await this.getSchedule(id);

    const schedule = await this.prisma.schedule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      action: 'schedule.deleted',
      entityType: 'Schedule',
      entityId: schedule.id,
      before: existingSchedule.data,
      after: schedule,
    });

    return { data: schedule, message: 'Jadwal berhasil dinonaktifkan.' };
  }

  async getScheduleRevisions(scheduleId: string) {
    return {
      data: await this.prisma.scheduleRevision.findMany({
        where: { scheduleId },
        include: { semester: true, class: true, subject: true, teacher: true },
        orderBy: { effectiveFrom: 'asc' },
      }),
    };
  }

  async cancelScheduleRevision(scheduleId: string, revisionId: string) {
    const revision = await this.prisma.scheduleRevision.findFirst({ where: { id: revisionId, scheduleId } });
    if (!revision) throw new NotFoundException('Revisi jadwal tidak ditemukan');

    const result = await this.prisma.scheduleRevision.delete({ where: { id: revisionId } });
    await this.auditService.record({
      action: 'schedule.revision.cancelled',
      entityType: 'ScheduleRevision',
      entityId: revisionId,
      before: revision,
      after: null,
    });
    return { data: result, message: 'Revisi jadwal dibatalkan.' };
  }

  private validateScheduleTime(startsAt: string, endsAt: string) {
    if (startsAt >= endsAt) {
      throw new BadRequestException('Jam mulai harus lebih awal dari jam selesai');
    }
  }

  private async ensureScheduleRelations(dto: {
    schoolYearId: string;
    semesterId: string;
    classId: string;
    subjectId: string;
    teacherId: string;
  }) {
    const [semester, schoolClass, subject, teacher] = await Promise.all([
      this.prisma.semester.findFirst({
        where: {
          id: dto.semesterId,
          schoolYearId: dto.schoolYearId,
          deletedAt: null,
        },
        include: { schoolYear: true },
      }),
      this.prisma.class.findFirst({
        where: {
          id: dto.classId,
          schoolYearId: dto.schoolYearId,
          deletedAt: null,
        },
      }),
      this.prisma.subject.findFirst({
        where: { id: dto.subjectId, deletedAt: null },
      }),
      this.prisma.teacher.findFirst({
        where: { id: dto.teacherId, deletedAt: null },
        include: {
          yearAssignments: {
            include: { schoolYear: true, subjects: true },
          },
        },
      }),
    ]);

    if (!semester) throw new BadRequestException('Semester tidak valid untuk tahun ajaran ini');
    if (!schoolClass) throw new BadRequestException('Kelas tidak valid untuk tahun ajaran ini');
    if (!subject) throw new BadRequestException('Mata pelajaran tidak valid');
    if (!teacher) throw new BadRequestException('Guru tidak valid');

    const assignment = getEffectiveTeacherAssignment(
      teacher.yearAssignments,
      semester.schoolYear.startsAt,
    );
    const teacherSubject = assignment
      ? assignment.subjects.some(({ subjectId }) => subjectId === dto.subjectId)
      : await this.prisma.teacherSubject.findUnique({
        where: { teacherId_subjectId: { teacherId: dto.teacherId, subjectId: dto.subjectId } },
      });

    if (
      (assignment && assignment.status !== TeacherAssignmentStatus.ACTIVE) ||
      !teacherSubject
    ) {
      throw new BadRequestException('Guru belum diatur mengampu mata pelajaran ini');
    }
  }

  private async ensureBulkScheduleRelations(dto: CreateBulkScheduleDto) {
    const classIds = [...new Set(dto.assignments.flatMap((assignment) => assignment.classIds))];
    const timeSlotIds = [...new Set(dto.assignments.map((assignment) => assignment.timeSlotId))];
    const [semester, classes, subject, teacher, timeSlots] = await Promise.all([
      this.prisma.semester.findFirst({
        where: {
          id: dto.semesterId,
          schoolYearId: dto.schoolYearId,
          deletedAt: null,
        },
        include: { schoolYear: true },
      }),
      this.prisma.class.findMany({
        where: {
          id: { in: classIds },
          schoolYearId: dto.schoolYearId,
          deletedAt: null,
        },
      }),
      this.prisma.subject.findFirst({
        where: { id: dto.subjectId, deletedAt: null, isActive: true },
      }),
      this.prisma.teacher.findFirst({
        where: { id: dto.teacherId, deletedAt: null, isActive: true },
        include: {
          subjects: true,
          yearAssignments: {
            include: { schoolYear: true, subjects: true },
          },
          user: { include: { roles: { include: { role: true } } } },
        },
      }),
      this.prisma.academicTimeSlot.findMany({
        where: {
          id: { in: timeSlotIds },
          schoolYearId: dto.schoolYearId,
          deletedAt: null,
          isActive: true,
          isAssignable: true,
        },
      }),
    ]);

    if (!semester) throw new BadRequestException('Semester tidak valid untuk tahun ajaran ini');

    if (classes.length !== classIds.length) {
      throw new BadRequestException('Ada kelas yang tidak valid untuk tahun ajaran ini');
    }

    if (!subject || !teacher || timeSlots.length !== timeSlotIds.length) {
      throw new BadRequestException('Guru, mata pelajaran, atau slot waktu tidak valid');
    }

    const yearAssignment = getEffectiveTeacherAssignment(
      teacher.yearAssignments,
      semester.schoolYear.startsAt,
    );
    if (
      (yearAssignment && yearAssignment.status !== TeacherAssignmentStatus.ACTIVE) ||
      (yearAssignment
        ? !yearAssignment.subjects.some(({ subjectId }) => subjectId === dto.subjectId)
        : !teacher.subjects.some(({ subjectId }) => subjectId === dto.subjectId))
    ) {
      throw new BadRequestException('Guru belum diatur mengampu mata pelajaran ini');
    }

    return timeSlots;
  }

  private async ensureScheduleAvailability(
    dto: Pick<CreateBulkScheduleDto, 'schoolYearId' | 'semesterId' | 'teacherId'> & { classIds: string[] },
    timeSlot: { dayOfWeek: number; startsAt: string; endsAt: string },
  ) {
    const conflict = await this.prisma.schedule.findFirst({
      where: {
        schoolYearId: dto.schoolYearId,
        dayOfWeek: timeSlot.dayOfWeek,
        deletedAt: null,
        isActive: true,
        startsAt: { lt: timeSlot.endsAt },
        endsAt: { gt: timeSlot.startsAt },
        OR: [{ classId: { in: dto.classIds } }, { teacherId: dto.teacherId }],
      },
      include: { class: true, teacher: true },
    });

    if (conflict) {
      throw new BadRequestException(
        `Jadwal bentrok dengan ${conflict.class.name} (${conflict.startsAt}-${conflict.endsAt}) atau jadwal guru ${conflict.teacher.name}`,
      );
    }
  }

  private async ensureScheduleRevisionAvailability(
    scheduleId: string,
    nextSchedule: {
      schoolYearId: string;
      semesterId: string;
      classId: string;
      teacherId: string;
      dayOfWeek: number;
      startsAt: string;
      endsAt: string;
    },
    effectiveFrom: Date,
  ) {
    const schedules = await this.prisma.schedule.findMany({
      where: {
        id: { not: scheduleId },
        schoolYearId: nextSchedule.schoolYearId,
        deletedAt: null,
        isActive: true,
      },
      include: {
        class: true,
        teacher: true,
        revisions: {
          where: { effectiveFrom: { lte: effectiveFrom } },
          include: { class: true, teacher: true },
          orderBy: { effectiveFrom: 'asc' },
        },
      },
    });

    const conflict = schedules
      .map((schedule) => getScheduleSnapshotAtDate(schedule, effectiveFrom))
      .find((schedule) =>
        schedule.dayOfWeek === nextSchedule.dayOfWeek &&
        schedule.startsAt < nextSchedule.endsAt &&
        schedule.endsAt > nextSchedule.startsAt &&
        (schedule.classId === nextSchedule.classId || schedule.teacherId === nextSchedule.teacherId),
      );

    if (conflict) {
      throw new BadRequestException(
        `Revisi jadwal bentrok dengan ${conflict.class.name} (${conflict.startsAt}-${conflict.endsAt}) atau jadwal guru ${conflict.teacher.name}`,
      );
    }
  }

  private toDateOnly(value: string) {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }
}
