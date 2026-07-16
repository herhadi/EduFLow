import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SemesterType } from '@prisma/client';
import { sortSchoolClasses } from '@eduflow/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CloneSchoolYearMasterDto } from '../dto/clone-school-year-master.dto';
import { CreateAcademicTimeSlotDto } from '../dto/create-academic-time-slot.dto';
import { CreateClassDto } from '../dto/create-class.dto';
import { CreateSchoolYearDto } from '../dto/create-school-year.dto';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { SetClassHomeroomTeacherDto } from '../dto/set-class-homeroom-teacher.dto';
import { UpdateAcademicTimeSlotDto } from '../dto/update-academic-time-slot.dto';
import { UpdateClassTimeSlotActivityDto } from '../dto/update-class-time-slot-activity.dto';

@Injectable()
export class AcademicMasterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getSchoolYears() {
    return {
      data: await this.prisma.schoolYear.findMany({
        where: { deletedAt: null },
        orderBy: { startsAt: 'desc' },
      }),
    };
  }

  async createSchoolYear(dto: CreateSchoolYearDto) {
    const name = dto.name.trim();
    const [startYearText, endYearText] = name.split('/');
    const startYear = Number(startYearText);
    const endYear = Number(endYearText);

    if (endYear !== startYear + 1) {
      throw new BadRequestException('Tahun ajaran harus berurutan, misalnya 2026/2027');
    }

    const existingSchoolYear = await this.prisma.schoolYear.findUnique({
      where: { name },
    });

    if (existingSchoolYear) {
      throw new BadRequestException('Tahun ajaran sudah tersedia');
    }

    const schoolYear = await this.prisma.$transaction(async (transaction) => {
      const schoolYear = await transaction.schoolYear.create({
        data: {
          name,
          startsAt: new Date(Date.UTC(startYear, 6, 1)),
          endsAt: new Date(Date.UTC(endYear, 5, 30, 23, 59, 59, 999)),
        },
      });

      await transaction.semester.createMany({
        data: [
          {
            schoolYearId: schoolYear.id,
            type: SemesterType.ODD,
            startsAt: new Date(Date.UTC(startYear, 6, 1)),
            endsAt: new Date(Date.UTC(startYear, 11, 31, 23, 59, 59, 999)),
          },
          {
            schoolYearId: schoolYear.id,
            type: SemesterType.EVEN,
            startsAt: new Date(Date.UTC(endYear, 0, 1)),
            endsAt: new Date(Date.UTC(endYear, 5, 30, 23, 59, 59, 999)),
          },
        ],
      });

      return transaction.schoolYear.findUniqueOrThrow({
        where: { id: schoolYear.id },
        include: { semesters: { orderBy: { startsAt: 'asc' } } },
      });
    });

    await this.auditService.record({
      action: 'school-year.created',
      entityType: 'SchoolYear',
      entityId: schoolYear.id,
      after: schoolYear,
    });

    return { data: schoolYear, message: 'Tahun ajaran berhasil ditambahkan.' };
  }

  async cloneSchoolYearMaster(dto: CloneSchoolYearMasterDto) {
    if (dto.sourceSchoolYearId === dto.targetSchoolYearId) {
      throw new BadRequestException('Tahun sumber dan target tidak boleh sama.');
    }

    const includeClasses = dto.includeClasses ?? true;
    const includeTimeSlots = dto.includeTimeSlots ?? true;
    const includeClassActivities = dto.includeClassActivities ?? true;

    if (!includeClasses && !includeTimeSlots && !includeClassActivities) {
      throw new BadRequestException('Pilih minimal satu data master untuk disalin.');
    }

    const [sourceSchoolYear, targetSchoolYear] = await Promise.all([
      this.prisma.schoolYear.findFirst({ where: { id: dto.sourceSchoolYearId, deletedAt: null } }),
      this.prisma.schoolYear.findFirst({ where: { id: dto.targetSchoolYearId, deletedAt: null } }),
    ]);

    if (!sourceSchoolYear || !targetSchoolYear) {
      throw new NotFoundException('Tahun ajaran sumber atau target tidak ditemukan.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const classIdMap = new Map<string, string>();
      const timeSlotIdMap = new Map<string, string>();
      let classes = 0;
      let timeSlots = 0;
      let classActivities = 0;

      const sourceClasses = await tx.class.findMany({
        where: { schoolYearId: sourceSchoolYear.id, deletedAt: null },
        orderBy: [{ grade: 'asc' }, { name: 'asc' }],
      });

      if (includeClasses || includeClassActivities) {
        for (const sourceClass of sourceClasses) {
          const targetClass = await tx.class.upsert({
            where: {
              schoolYearId_name: {
                schoolYearId: targetSchoolYear.id,
                name: sourceClass.name,
              },
            },
            update: {
              code: sourceClass.code,
              grade: sourceClass.grade,
              deletedAt: null,
            },
            create: {
              schoolYearId: targetSchoolYear.id,
              name: sourceClass.name,
              code: sourceClass.code,
              grade: sourceClass.grade,
            },
          });
          classIdMap.set(sourceClass.id, targetClass.id);
          classes += 1;
        }
      }

      const sourceTimeSlots = await tx.academicTimeSlot.findMany({
        where: { schoolYearId: sourceSchoolYear.id, deletedAt: null, isActive: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startsAt: 'asc' }],
      });

      if (includeTimeSlots || includeClassActivities) {
        for (const sourceSlot of sourceTimeSlots) {
          const targetSlot = await tx.academicTimeSlot.upsert({
            where: {
              schoolYearId_dayOfWeek_startsAt_endsAt: {
                schoolYearId: targetSchoolYear.id,
                dayOfWeek: sourceSlot.dayOfWeek,
                startsAt: sourceSlot.startsAt,
                endsAt: sourceSlot.endsAt,
              },
            },
            update: {
              periodNumber: sourceSlot.periodNumber,
              name: sourceSlot.name,
              type: sourceSlot.type,
              isAssignable: sourceSlot.isAssignable,
              isActive: sourceSlot.isActive,
              deletedAt: null,
            },
            create: {
              schoolYearId: targetSchoolYear.id,
              dayOfWeek: sourceSlot.dayOfWeek,
              periodNumber: sourceSlot.periodNumber,
              name: sourceSlot.name,
              type: sourceSlot.type,
              startsAt: sourceSlot.startsAt,
              endsAt: sourceSlot.endsAt,
              isAssignable: sourceSlot.isAssignable,
              isActive: sourceSlot.isActive,
            },
          });
          timeSlotIdMap.set(sourceSlot.id, targetSlot.id);
          timeSlots += 1;
        }
      }

      if (includeClassActivities) {
        const sourceActivities = await tx.classTimeSlotActivity.findMany({
          where: {
            classId: { in: sourceClasses.map((sourceClass) => sourceClass.id) },
            timeSlotId: { in: sourceTimeSlots.map((sourceSlot) => sourceSlot.id) },
          },
        });

        for (const sourceActivity of sourceActivities) {
          const classId = classIdMap.get(sourceActivity.classId);
          const timeSlotId = timeSlotIdMap.get(sourceActivity.timeSlotId);

          if (!classId || !timeSlotId) continue;

          await tx.classTimeSlotActivity.upsert({
            where: { classId_timeSlotId: { classId, timeSlotId } },
            update: { type: sourceActivity.type },
            create: { classId, timeSlotId, type: sourceActivity.type },
          });
          classActivities += 1;
        }
      }

      return { classes, timeSlots, classActivities };
    });

    await this.auditService.record({
      action: 'school-year.master.cloned',
      entityType: 'SchoolYear',
      entityId: targetSchoolYear.id,
      before: { sourceSchoolYear, targetSchoolYear },
      after: { ...result, includeClasses, includeTimeSlots, includeClassActivities },
    });

    return {
      data: result,
      message: `Master tahun ajaran disalin: ${result.classes} kelas, ${result.timeSlots} slot jam, ${result.classActivities} aktivitas kelas.`,
    };
  }

  async getSemesters(schoolYearId?: string) {
    return {
      data: await this.prisma.semester.findMany({
        where: { deletedAt: null, schoolYearId },
        include: { schoolYear: true },
        orderBy: [{ startsAt: 'desc' }, { type: 'asc' }],
      }),
    };
  }

  async getClasses(schoolYearId?: string) {
    const classes = await this.prisma.class.findMany({
      where: { deletedAt: null, schoolYearId },
      include: { schoolYear: true, homeroomTeacher: true },
    });

    return {
      data: sortSchoolClasses(classes),
    };
  }

  async createClass(dto: CreateClassDto) {
    const schoolYear = await this.prisma.schoolYear.findFirst({
      where: { id: dto.schoolYearId, deletedAt: null },
    });

    if (!schoolYear) {
      throw new NotFoundException('Tahun ajaran tidak ditemukan');
    }

    const name = dto.name.trim();
    const existingClass = await this.prisma.class.findFirst({
      where: { schoolYearId: dto.schoolYearId, name, deletedAt: null },
    });

    if (existingClass) {
      throw new BadRequestException('Nama kelas sudah digunakan pada tahun ajaran ini');
    }

    const schoolClass = await this.prisma.class.create({
      data: {
        schoolYearId: dto.schoolYearId,
        name,
        code: dto.code?.trim() || name.replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
        grade: dto.grade?.trim() || undefined,
      },
      include: { schoolYear: true, homeroomTeacher: true },
    });

    await this.auditService.record({
      action: 'class.created',
      entityType: 'Class',
      entityId: schoolClass.id,
      after: schoolClass,
    });

    return { data: schoolClass, message: 'Kelas berhasil ditambahkan.' };
  }

  async deleteClass(id: string) {
    const schoolClass = await this.prisma.class.findFirst({
      where: { id, deletedAt: null },
      include: {
        enrollments: { where: { deletedAt: null }, select: { id: true } },
        schedules: { where: { deletedAt: null }, select: { id: true } },
        agendas: { select: { id: true } },
      },
    });

    if (!schoolClass) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    if (schoolClass.enrollments.length || schoolClass.schedules.length || schoolClass.agendas.length) {
      throw new BadRequestException(
        'Kelas sudah dipakai siswa, jadwal, atau agenda. Pindahkan data terkait sebelum menghapus kelas.',
      );
    }

    const result = await this.prisma.class.update({
      where: { id },
      data: { deletedAt: new Date(), homeroomTeacherId: null },
    });

    await this.auditService.record({
      action: 'class.deleted',
      entityType: 'Class',
      entityId: id,
      before: schoolClass,
      after: result,
    });

    return { data: result, message: 'Kelas berhasil dihapus.' };
  }

  async setClassHomeroomTeacher(
    id: string,
    dto: SetClassHomeroomTeacherDto,
  ) {
    const schoolClass = await this.prisma.class.findFirst({
      where: { id, deletedAt: null },
      include: { schoolYear: true, homeroomTeacher: true },
    });

    if (!schoolClass) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    if (dto.teacherId) {
      const teacher = await this.prisma.teacher.findFirst({
        where: { id: dto.teacherId, deletedAt: null },
        include: {
          subjects: true,
          yearAssignments: {
            include: { schoolYear: true, subjects: true },
          },
          user: { include: { roles: { include: { role: true } } } },
        },
      });

      if (!teacher) {
        throw new NotFoundException('Guru tidak ditemukan');
      }

      const effectiveAssignment = teacher.yearAssignments
        .filter((assignment) => assignment.schoolYear.startsAt <= schoolClass.schoolYear.startsAt)
        .sort((first, second) => second.schoolYear.startsAt.getTime() - first.schoolYear.startsAt.getTime())[0];
      const hasTeachingSubject = effectiveAssignment
        ? effectiveAssignment.status === 'ACTIVE' && effectiveAssignment.subjects.length > 0
        : teacher.subjects.length > 0;

      if (!hasTeachingSubject) {
        throw new BadRequestException(
          'Wali kelas harus guru mapel. Atur penugasan tahun ajaran dan mapel ampu guru terlebih dahulu.',
        );
      }

      const roleNames =
        teacher.user?.roles.map(({ role }) => role.name) ?? [];

      if (!roleNames.includes('guru')) {
        throw new BadRequestException(
          'Wali kelas harus memiliki role guru.',
        );
      }
    }

    const result = await this.prisma.class.update({
      where: { id },
      data: { homeroomTeacherId: dto.teacherId ?? null },
      include: { schoolYear: true, homeroomTeacher: true },
    });

    await this.auditService.record({
      action: 'class.homeroom-teacher.updated',
      entityType: 'Class',
      entityId: id,
      before: schoolClass,
      after: result,
    });

    return { data: result, message: 'Wali kelas berhasil disimpan.' };
  }

  async getSubjects() {
    return {
      data: await this.prisma.subject.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      }),
    };
  }

  async createSubject(dto: CreateSubjectDto) {
    const name = dto.name.trim();
    const code = dto.code?.trim().toUpperCase() || undefined;
    const existingSubject = await this.prisma.subject.findFirst({
      where: {
        deletedAt: null,
        OR: [{ name }, ...(code ? [{ code }] : [])],
      },
    });

    if (existingSubject) {
      throw new BadRequestException('Nama atau kode mata pelajaran sudah digunakan');
    }

    const subject = await this.prisma.subject.create({
      data: { name, code, isActive: true },
    });

    await this.auditService.record({
      action: 'subject.created',
      entityType: 'Subject',
      entityId: subject.id,
      after: subject,
    });

    return { data: subject, message: 'Mata pelajaran berhasil ditambahkan.' };
  }

  async deleteSubject(id: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, deletedAt: null },
      include: {
        schedules: { where: { deletedAt: null }, select: { id: true } },
        agendas: { select: { id: true } },
      },
    });

    if (!subject) {
      throw new NotFoundException('Mata pelajaran tidak ditemukan');
    }

    if (subject.schedules.length || subject.agendas.length) {
      throw new BadRequestException(
        'Mata pelajaran sudah dipakai jadwal atau agenda. Gunakan data tersebut sampai histori selesai.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.teacherSubject.deleteMany({ where: { subjectId: id } });
      return tx.subject.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      });
    });

    await this.auditService.record({
      action: 'subject.deleted',
      entityType: 'Subject',
      entityId: id,
      before: subject,
      after: result,
    });

    return { data: result, message: 'Mata pelajaran berhasil dihapus.' };
  }

  async getTimeSlots(schoolYearId?: string) {
    return {
      data: await this.prisma.academicTimeSlot.findMany({
        where: { schoolYearId, deletedAt: null, isActive: true },
        include: { schoolYear: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startsAt: 'asc' }],
      }),
    };
  }

  async createTimeSlot(dto: CreateAcademicTimeSlotDto) {
    this.validateScheduleTime(dto.startsAt, dto.endsAt);
    this.validateTimeSlotTypeRules(dto.type, dto.dayOfWeek);

    const timeSlot = await this.prisma.academicTimeSlot.create({
      data: {
        ...dto,
        name: dto.name.trim(),
        isAssignable: dto.isAssignable ?? dto.type === 'LESSON',
      },
      include: { schoolYear: true },
    });

    await this.auditService.record({
      action: 'academic-time-slot.created',
      entityType: 'AcademicTimeSlot',
      entityId: timeSlot.id,
      after: timeSlot,
    });

    return { data: timeSlot, message: 'Slot waktu berhasil ditambahkan.' };
  }

  async updateTimeSlot(id: string, dto: UpdateAcademicTimeSlotDto) {
    this.validateScheduleTime(dto.startsAt, dto.endsAt);
    this.validateTimeSlotTypeRules(dto.type, dto.dayOfWeek);

    const existing = await this.prisma.academicTimeSlot.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Slot waktu tidak ditemukan.');
    }

    const updated = await this.prisma.academicTimeSlot.update({
      where: { id },
      data: {
        dayOfWeek: dto.dayOfWeek,
        periodNumber: dto.periodNumber ?? null,
        name: dto.name.trim(),
        type: dto.type,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        isAssignable: dto.isAssignable ?? dto.type === 'LESSON',
        isActive: dto.isActive ?? existing.isActive,
      },
      include: { schoolYear: true },
    });

    await this.auditService.record({
      action: 'academic-time-slot.updated',
      entityType: 'AcademicTimeSlot',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return { data: updated, message: 'Slot waktu berhasil diperbarui.' };
  }

  async deleteTimeSlot(id: string) {
    const existing = await this.prisma.academicTimeSlot.findFirst({
      where: { id, deletedAt: null },
      include: {
        schedules: { where: { deletedAt: null }, select: { id: true } },
        scheduleRevisions: { select: { id: true } },
        classActivities: { select: { id: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Slot waktu tidak ditemukan.');
    }

    if (
      existing.schedules.length ||
      existing.scheduleRevisions.length ||
      existing.classActivities.length
    ) {
      throw new BadRequestException(
        'Slot waktu sudah dipakai jadwal atau aktivitas kelas. Ubah slot yang ada daripada menghapusnya.',
      );
    }

    const deleted = await this.prisma.academicTimeSlot.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      include: { schoolYear: true },
    });

    await this.auditService.record({
      action: 'academic-time-slot.deleted',
      entityType: 'AcademicTimeSlot',
      entityId: deleted.id,
      before: existing,
      after: deleted,
    });

    return { data: deleted, message: 'Slot waktu berhasil dihapus.' };
  }

  async getClassTimeSlotActivities(classId: string) {
    return {
      data: await this.prisma.classTimeSlotActivity.findMany({
        where: { classId },
      }),
    };
  }

  async updateClassTimeSlotActivity(
    classId: string,
    timeSlotId: string,
    dto: UpdateClassTimeSlotActivityDto,
  ) {
    const activity = await this.prisma.classTimeSlotActivity.upsert({
      where: { classId_timeSlotId: { classId, timeSlotId } },
      update: { type: dto.type },
      create: { classId, timeSlotId, type: dto.type },
    });

    await this.auditService.record({
      action: 'class-time-slot-activity.updated',
      entityType: 'ClassTimeSlotActivity',
      entityId: activity.id,
      after: activity,
    });

    return { data: activity, message: 'Kegiatan jeda kelas berhasil disimpan.' };
  }

  private validateScheduleTime(startsAt: string, endsAt: string) {
    if (startsAt >= endsAt) {
      throw new BadRequestException('Jam mulai harus lebih awal dari jam selesai');
    }
  }

  private validateTimeSlotTypeRules(type: string, dayOfWeek: number) {
    if (type === 'CEREMONY' && dayOfWeek !== 1) {
      throw new BadRequestException('Slot Upacara hanya boleh ditempatkan pada hari Senin.');
    }
  }
}
