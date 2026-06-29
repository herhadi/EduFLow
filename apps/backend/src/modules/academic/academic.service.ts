import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AcademicCalendarEventType, AgendaStatus, SemesterType, TeacherAssignmentStatus } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Inject } from '@nestjs/common';
import { STORAGE_PROVIDER, StorageProvider } from '../../infrastructure/storage/storage-provider';
import { sortSchoolClasses } from '@eduflow/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CloneSchoolYearMasterDto } from './dto/clone-school-year-master.dto';
import { ConfigureTeacherAccountDto } from './dto/configure-teacher-account.dto';
import { CreateAcademicTimeSlotDto } from './dto/create-academic-time-slot.dto';
import { CreateAcademicCalendarEventDto } from './dto/create-academic-calendar-event.dto';
import { UpdateClassTimeSlotActivityDto } from './dto/update-class-time-slot-activity.dto';
import { UpdateAcademicCalendarEventDto } from './dto/update-academic-calendar-event.dto';
import { UpdateAcademicTimeSlotDto } from './dto/update-academic-time-slot.dto';
import { UpdateMyTeacherProfileDto } from './dto/update-my-teacher-profile.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { CreateBulkScheduleDto } from './dto/create-bulk-schedule.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { GenerateAgendaDto } from './dto/generate-agenda.dto';
import { GenerateBulkAgendaDto } from './dto/generate-bulk-agenda.dto';
import { SetClassHomeroomTeacherDto } from './dto/set-class-homeroom-teacher.dto';
import { SetTeacherSubjectsDto } from './dto/set-teacher-subjects.dto';
import { SetTeacherSchoolYearAssignmentDto } from './dto/set-teacher-school-year-assignment.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class AcademicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
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

  async getAcademicCalendarEvents(schoolYearId?: string) {
    return {
      data: await this.prisma.academicCalendarEvent.findMany({
        where: { deletedAt: null, schoolYearId },
        include: { semester: true },
        orderBy: [{ startsAt: 'asc' }, { createdAt: 'asc' }],
      }),
    };
  }

  async createAcademicCalendarEvent(dto: CreateAcademicCalendarEventDto) {
    const event = await this.validateAcademicCalendarEvent(dto);
    const created = await this.prisma.academicCalendarEvent.create({ data: event, include: { semester: true } });

    await this.auditService.record({
      action: 'academic-calendar.event.created',
      entityType: 'AcademicCalendarEvent',
      entityId: created.id,
      after: created,
    });

    return { data: created, message: 'Event Kaldik berhasil ditambahkan.' };
  }

  async updateAcademicCalendarEvent(id: string, dto: UpdateAcademicCalendarEventDto) {
    const existing = await this.prisma.academicCalendarEvent.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Event Kaldik tidak ditemukan');

    const event = await this.validateAcademicCalendarEvent({
      schoolYearId: existing.schoolYearId,
      semesterId: dto.semesterId === undefined ? existing.semesterId ?? undefined : dto.semesterId ?? undefined,
      title: dto.title ?? existing.title,
      description: dto.description === undefined ? existing.description ?? undefined : dto.description ?? undefined,
      type: dto.type ?? existing.type,
      startsAt: dto.startsAt ?? existing.startsAt.toISOString(),
      endsAt: dto.endsAt ?? existing.endsAt.toISOString(),
      blocksAgenda: dto.blocksAgenda ?? existing.blocksAgenda,
    });
    const updated = await this.prisma.academicCalendarEvent.update({ where: { id }, data: event, include: { semester: true } });

    await this.auditService.record({
      action: 'academic-calendar.event.updated',
      entityType: 'AcademicCalendarEvent',
      entityId: id,
      before: existing,
      after: updated,
    });

    return { data: updated, message: 'Event Kaldik berhasil diperbarui.' };
  }

  async deleteAcademicCalendarEvent(id: string) {
    const existing = await this.prisma.academicCalendarEvent.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Event Kaldik tidak ditemukan');

    const deleted = await this.prisma.academicCalendarEvent.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditService.record({
      action: 'academic-calendar.event.deleted',
      entityType: 'AcademicCalendarEvent',
      entityId: id,
      before: existing,
      after: deleted,
    });

    return { data: deleted, message: 'Event Kaldik dihapus.' };
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

  async getTeachers() {
    const teachers = await this.prisma.teacher.findMany({
        where: { deletedAt: null },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              name: true,
              roles: { include: { role: true } },
            },
          },
          subjects: { include: { subject: true } },
          yearAssignments: {
            include: { schoolYear: true, subjects: { include: { subject: true } } },
          },
        },
        orderBy: { name: 'asc' },
      });
    return { data: await Promise.all(teachers.map((teacher) => this.withTeacherPhotoUrl(teacher))) };
  }

  async uploadTeacherPhoto(id: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number }) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id, deletedAt: null } });
    if (!teacher) throw new NotFoundException('Guru tidak ditemukan');

    const key = `teachers/${id}/${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    const stored = await this.storage.upload({ buffer: file.buffer, key, name: file.originalname, mimeType: file.mimetype });
    const updated = await this.prisma.teacher.update({
      where: { id },
      data: { photoUrl: null, photoKey: stored.key, photoName: stored.name, photoMimeType: stored.mimeType, photoSize: stored.size },
    });
    if (teacher.photoKey) await this.storage.delete(teacher.photoKey).catch(() => undefined);
    await this.auditService.record({ action: 'teacher.photo.uploaded', entityType: 'Teacher', entityId: id, before: teacher, after: updated });
    return { data: await this.withTeacherPhotoUrl(updated), message: 'Foto guru berhasil diunggah.' };
  }

  async createTeacher(dto: CreateTeacherDto) {
    const name = dto.name.trim();
    const nip = dto.nip?.trim() || null;
    const email = dto.email?.trim().toLowerCase() || null;

    const existingTeacher = await this.prisma.teacher.findFirst({
      where: {
        OR: [
          ...(nip ? [{ nip }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingTeacher) {
      throw new BadRequestException('NIP atau email guru sudah digunakan');
    }

    const teacher = await this.prisma.teacher.create({
      data: {
        name,
        nip,
        phone: dto.phone?.trim() || null,
        email,
      },
      include: {
        user: { include: { roles: { include: { role: true } } } },
        subjects: { include: { subject: true } },
      },
    });

    await this.auditService.record({
      action: 'teacher.created',
      entityType: 'Teacher',
      entityId: teacher.id,
      after: teacher,
    });

    return { data: teacher, message: 'Guru berhasil ditambahkan.' };
  }

  async updateTeacher(id: string, dto: UpdateTeacherDto) {
    const existing = await this.prisma.teacher.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Guru tidak ditemukan');

    const teacher = await this.prisma.teacher.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.nip !== undefined && { nip: dto.nip.trim() || null }),
        ...(dto.nuptk !== undefined && { nuptk: dto.nuptk.trim() || null }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() || null }),
        ...(dto.email !== undefined && { email: dto.email.trim().toLowerCase() || null }),
        ...(dto.telegramId !== undefined && { telegramId: dto.telegramId.trim() || null }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl.trim() || null }),
      },
      include: { user: { include: { roles: { include: { role: true } } } }, subjects: { include: { subject: true } } },
    });
    await this.auditService.record({ action: 'teacher.updated', entityType: 'Teacher', entityId: id, before: existing, after: teacher });
    return { data: teacher, message: 'Identitas guru berhasil diperbarui.' };
  }

  async configureTeacherAccount(id: string, dto: ConfigureTeacherAccountDto) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, deletedAt: null },
      include: { user: true },
    });

    if (!teacher) {
      throw new NotFoundException('Guru tidak ditemukan');
    }

    const username = dto.username.trim().toLowerCase();
    const email =
      dto.email?.trim().toLowerCase() ??
      teacher.email?.trim().toLowerCase() ??
      `${username}@eduflow.local`;
    const requestedRoles = dto.roles.includes('wali_kelas')
      ? [...new Set([...dto.roles, 'guru'])]
      : dto.roles;
    const roles = await this.prisma.role.findMany({
      where: { name: { in: requestedRoles } },
    });

    if (roles.length !== new Set(requestedRoles).size) {
      throw new BadRequestException('Ada role yang tidak terdaftar');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
        id: teacher.userId ? { not: teacher.userId } : undefined,
      },
    });

    if (existingUser) {
      throw new BadRequestException('Username atau email sudah digunakan');
    }

    const password = this.getDefaultUserPassword();
    const user = await this.prisma.$transaction(async (tx) => {
      const savedUser = teacher.userId
        ? await tx.user.update({
            where: { id: teacher.userId },
            data: {
              email,
              username,
              name: teacher.name,
              deletedAt: null,
            },
          })
        : await tx.user.create({
            data: {
              email,
              username,
              name: teacher.name,
              password: await hash(password, 12),
            },
          });

      await tx.teacher.update({
        where: { id: teacher.id },
        data: { userId: savedUser.id },
      });

      await tx.userRole.deleteMany({ where: { userId: savedUser.id } });
      await Promise.all(
        roles.map((role) =>
          tx.userRole.create({
            data: { userId: savedUser.id, roleId: role.id },
          }),
        ),
      );

      return tx.user.findUniqueOrThrow({
        where: { id: savedUser.id },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          roles: { include: { role: true } },
        },
      });
    });

    await this.auditService.record({
      action: 'teacher.account.configured',
      entityType: 'Teacher',
      entityId: teacher.id,
      before: teacher,
      after: user,
    });

    return {
      data: {
        ...user,
        roles: user.roles.map(({ role }) => role.name),
      },
      message: 'Akun dan role guru berhasil disimpan.',
    };
  }

  async resetTeacherPassword(id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, deletedAt: null },
      include: { user: true },
    });
    if (!teacher) throw new NotFoundException('Guru tidak ditemukan');
    if (!teacher.user) throw new BadRequestException('Guru belum memiliki akun login');

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { userId: teacher.userId!, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'admin-password-reset' },
      });
      return tx.user.update({
        where: { id: teacher.userId! },
        data: {
          password: await hash(this.getDefaultUserPassword(), 12),
          failedLoginCount: 0,
          lockedUntil: null,
          passwordChangedAt: null,
        },
      });
    });

    await this.auditService.record({
      action: 'teacher.password.reset',
      entityType: 'Teacher',
      entityId: id,
      before: { userId: teacher.userId },
      after: { userId: updatedUser.id, resetToDefault: true },
    });
    return { data: { id: teacher.id }, message: 'Password guru direset ke password default.' };
  }

  async setTeacherSubjects(id: string, dto: SetTeacherSubjectsDto) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, deletedAt: null },
      include: { subjects: true },
    });

    if (!teacher) {
      throw new NotFoundException('Guru tidak ditemukan');
    }

    const subjectIds = [...new Set(dto.subjectIds)];
    const subjectCount = await this.prisma.subject.count({
      where: { id: { in: subjectIds }, deletedAt: null },
    });

    if (subjectCount !== subjectIds.length) {
      throw new BadRequestException('Ada mata pelajaran yang tidak ditemukan');
    }

    await this.prisma.$transaction([
      this.prisma.teacherSubject.deleteMany({ where: { teacherId: id } }),
      ...subjectIds.map((subjectId) =>
        this.prisma.teacherSubject.create({
          data: { teacherId: id, subjectId },
        }),
      ),
    ]);

    const result = await this.prisma.teacher.findUniqueOrThrow({
      where: { id },
      include: { subjects: { include: { subject: true } } },
    });

    await this.auditService.record({
      action: 'teacher.subjects.updated',
      entityType: 'Teacher',
      entityId: id,
      before: teacher.subjects,
      after: result.subjects,
    });

    return { data: result, message: 'Mapel ampu guru berhasil disimpan.' };
  }

  async getTeacherSchoolYearAssignments(teacherId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, deletedAt: null }, select: { id: true } });
    if (!teacher) throw new NotFoundException('Guru tidak ditemukan');

    return {
      data: await this.prisma.teacherSchoolYearAssignment.findMany({
        where: { teacherId },
        include: { schoolYear: true, subjects: { include: { subject: true } } },
        orderBy: { schoolYear: { startsAt: 'desc' } },
      }),
    };
  }

  async setTeacherSchoolYearAssignment(
    teacherId: string,
    schoolYearId: string,
    dto: SetTeacherSchoolYearAssignmentDto,
  ) {
    const subjectIds = [...new Set(dto.subjectIds)];
    const [teacher, schoolYear, subjectCount, before] = await Promise.all([
      this.prisma.teacher.findFirst({ where: { id: teacherId, deletedAt: null } }),
      this.prisma.schoolYear.findFirst({ where: { id: schoolYearId, deletedAt: null } }),
      this.prisma.subject.count({ where: { id: { in: subjectIds }, deletedAt: null } }),
      this.prisma.teacherSchoolYearAssignment.findUnique({
        where: { teacherId_schoolYearId: { teacherId, schoolYearId } },
        include: { subjects: { include: { subject: true } } },
      }),
    ]);
    if (!teacher) throw new NotFoundException('Guru tidak ditemukan');
    if (!schoolYear) throw new NotFoundException('Tahun ajaran tidak ditemukan');
    if (subjectCount !== subjectIds.length) throw new BadRequestException('Ada mata pelajaran yang tidak ditemukan');
    if (dto.status === TeacherAssignmentStatus.ACTIVE && !subjectIds.length) {
      throw new BadRequestException('Guru aktif harus memiliki minimal satu mapel ampu');
    }

    const assignment = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.teacherSchoolYearAssignment.upsert({
        where: { teacherId_schoolYearId: { teacherId, schoolYearId } },
        create: { teacherId, schoolYearId, status: dto.status, notes: dto.notes?.trim() || null },
        update: { status: dto.status, notes: dto.notes?.trim() || null },
      });
      await tx.teacherSchoolYearSubject.deleteMany({ where: { assignmentId: saved.id } });
      if (subjectIds.length) {
        await tx.teacherSchoolYearSubject.createMany({
          data: subjectIds.map((subjectId) => ({ assignmentId: saved.id, subjectId })),
        });
      }
      return tx.teacherSchoolYearAssignment.findUniqueOrThrow({
        where: { id: saved.id },
        include: { schoolYear: true, subjects: { include: { subject: true } } },
      });
    });

    await this.auditService.record({
      action: 'teacher.school-year-assignment.updated',
      entityType: 'TeacherSchoolYearAssignment',
      entityId: assignment.id,
      before,
      after: assignment,
    });
    return { data: assignment, message: 'Penugasan tahun ajaran guru berhasil disimpan.' };
  }

  async deleteTeacher(id: string) {
    const existingTeacher = await this.prisma.teacher.findFirst({
      where: { id, deletedAt: null },
      include: {
        schedules: {
          where: { deletedAt: null },
          select: { id: true },
        },
        homeroomClasses: {
          where: { deletedAt: null },
          select: { id: true, name: true },
        },
      },
    });

    if (!existingTeacher) {
      throw new NotFoundException('Guru tidak ditemukan');
    }

    const deletedAt = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.class.updateMany({
        where: { homeroomTeacherId: id, deletedAt: null },
        data: { homeroomTeacherId: null },
      });

      await tx.schedule.updateMany({
        where: { teacherId: id, deletedAt: null },
        data: { deletedAt },
      });

      return tx.teacher.update({
        where: { id },
        data: { isActive: false, deletedAt },
      });
    });

    await this.auditService.record({
      action: 'teacher.deleted',
      entityType: 'Teacher',
      entityId: result.id,
      before: existingTeacher,
      after: result,
    });

    return {
      data: result,
      message:
        'Guru berhasil dinonaktifkan. Jadwal aktif guru ikut dinonaktifkan, histori agenda tetap tersimpan.',
    };
  }

  async deleteTeacherPermanently(id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id },
      include: {
        schedules: { select: { id: true } },
        agendas: { select: { id: true } },
        homeroomClasses: { select: { id: true, name: true } },
        subjects: { select: { teacherId: true, subjectId: true } },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Guru tidak ditemukan');
    }

    if (teacher.schedules.length || teacher.agendas.length) {
      throw new BadRequestException(
        'Guru tidak bisa dihapus permanen karena sudah memiliki histori jadwal atau agenda. Gunakan Nonaktifkan.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.class.updateMany({
        where: { homeroomTeacherId: id },
        data: { homeroomTeacherId: null },
      });
      await tx.teacherSubject.deleteMany({ where: { teacherId: id } });

      return tx.teacher.delete({
        where: { id },
      });
    });

    await this.auditService.record({
      action: 'teacher.hard-deleted',
      entityType: 'Teacher',
      entityId: id,
      before: teacher,
      after: result,
    });

    return {
      data: result,
      message: 'Guru berhasil dihapus permanen.',
    };
  }

  async getStudents(classId?: string) {
    return {
      data: await this.prisma.student.findMany({
        where: {
          deletedAt: null,
          enrollments: classId
            ? { some: { classId, isActive: true, deletedAt: null } }
            : undefined,
        },
        include: {
          enrollments: {
            where: { isActive: true, deletedAt: null },
            include: { class: true, schoolYear: true },
          },
          guardians: {
            where: { deletedAt: null },
            include: { guardian: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
    };
  }

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
          revisions: { include: { semester: true, class: true, subject: true, teacher: true, timeSlot: true }, orderBy: { effectiveFrom: 'asc' } },
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startsAt: 'asc' }],
      }),
    };
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

  async getMySchedules(userId: string) {
    const teacher = await this.getTeacherAccount(userId);
    const today = this.toDateOnly(new Date().toISOString());
    const schedules = await this.prisma.schedule.findMany({
      where: {
        deletedAt: null,
        OR: [
          { teacherId: teacher.id },
          { revisions: { some: { teacherId: teacher.id } } },
        ],
      },
      include: {
        schoolYear: true,
        semester: true,
        class: true,
        subject: true,
        teacher: true,
        revisions: {
          include: { semester: true, class: true, subject: true, teacher: true, timeSlot: true },
          orderBy: { effectiveFrom: 'asc' },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startsAt: 'asc' }],
    });

    return {
      data: schedules
        .map((schedule) => this.getScheduleSnapshotAtDate(schedule, today))
        .filter((schedule) => schedule.teacherId === teacher.id)
        .sort((first, second) =>
          first.dayOfWeek - second.dayOfWeek ||
          first.startsAt.localeCompare(second.startsAt),
        ),
    };
  }

  async getMySubjects(userId: string) {
    const teacher = await this.getTeacherAccount(userId);

    return {
      data: await this.prisma.subject.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          teachers: { some: { teacherId: teacher.id } },
        },
        orderBy: { name: 'asc' },
      }),
    };
  }

  async getMyTeacherProfile(userId: string) {
    const teacherAccount = await this.getTeacherAccount(userId);
    const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { id: teacherAccount.id } });
    return { data: await this.withTeacherPhotoUrl(teacher) };
  }

  async updateMyTeacherProfile(userId: string, dto: UpdateMyTeacherProfileDto) {
    const teacher = await this.getTeacherAccount(userId);
    const updated = await this.prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl.trim() || null }),
        ...(dto.telegramId !== undefined && { telegramId: dto.telegramId.trim() || null }),
      },
    });
    return { data: updated, message: 'Profil guru berhasil diperbarui.' };
  }

  async getMyAgendas(userId: string, date?: string) {
    const teacher = await this.getTeacherAccount(userId);
    const agendaDate = date ? this.toDateOnly(date) : undefined;

    return {
      data: await this.prisma.dailyAgenda.findMany({
        where: { teacherId: teacher.id, date: agendaDate },
        include: {
          class: true,
          subject: true,
          teacher: true,
          schedule: true,
          attendance: {
            include: { items: true },
          },
        },
        orderBy: [{ date: 'asc' }, { schedule: { startsAt: 'asc' } }],
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
    const classIds = [...new Set(assignments.flatMap((assignment) => assignment.classIds))];
    const timeSlotIds = [...new Set(assignments.map((assignment) => assignment.timeSlotId))];
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
      where: { id, deletedAt: null }, include: { semester: true },
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
        semesterId: revisionSemester.id, classId: nextSchedule.classId, subjectId: nextSchedule.subjectId,
        teacherId: nextSchedule.teacherId, timeSlotId: nextSchedule.timeSlotId, dayOfWeek: nextSchedule.dayOfWeek,
        startsAt: nextSchedule.startsAt, endsAt: nextSchedule.endsAt,
        reason: reason?.trim() || null,
      },
      create: {
        scheduleId: id, semesterId: revisionSemester.id, effectiveFrom: revisionEffectiveFrom,
        classId: nextSchedule.classId, subjectId: nextSchedule.subjectId, teacherId: nextSchedule.teacherId,
        timeSlotId: nextSchedule.timeSlotId, dayOfWeek: nextSchedule.dayOfWeek, startsAt: nextSchedule.startsAt, endsAt: nextSchedule.endsAt,
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
    return { data: await this.prisma.scheduleRevision.findMany({ where: { scheduleId }, include: { semester: true, class: true, subject: true, teacher: true }, orderBy: { effectiveFrom: 'asc' } }) };
  }

  async cancelScheduleRevision(scheduleId: string, revisionId: string) {
    const revision = await this.prisma.scheduleRevision.findFirst({ where: { id: revisionId, scheduleId } });
    if (!revision) throw new NotFoundException('Revisi jadwal tidak ditemukan');
    const result = await this.prisma.scheduleRevision.delete({ where: { id: revisionId } });
    await this.auditService.record({ action: 'schedule.revision.cancelled', entityType: 'ScheduleRevision', entityId: revisionId, before: revision, after: null });
    return { data: result, message: 'Revisi jadwal dibatalkan.' };
  }

  async generateAgenda(id: string, dto: GenerateAgendaDto) {
    const schedule = await this.prisma.schedule.findFirst({ where: { id, deletedAt: null }, include: { revisions: { orderBy: { effectiveFrom: 'asc' } } } });

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

    const effectiveSchedule = this.getScheduleSnapshotAtDate(schedule, agendaDate);
    const semester = await this.prisma.semester.findFirstOrThrow({ where: { schoolYearId: schedule.schoolYearId, startsAt: { lte: agendaDate }, endsAt: { gte: agendaDate }, deletedAt: null } });
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

    const dates = this.getDateRange(startsAt, endsAt);

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
    const classIds = dto.classIds?.length
      ? new Set(dto.classIds)
      : dto.classId
        ? new Set([dto.classId])
        : null;
    const agendas = [];
    let skipped = 0;
    let calendarSkipped = 0;

    for (const agendaDate of dates) {
      if (blockedDates.has(agendaDate.toISOString().slice(0, 10))) {
        calendarSkipped += 1;
        continue;
      }

      const semester = semesters.find(
        (item) => item.startsAt <= agendaDate && item.endsAt >= agendaDate,
      );

      if (!semester) continue;

      const dayOfWeek = this.getDayOfWeek(agendaDate);
      const effectiveSchedules = schedules
        .map((schedule) => this.getScheduleSnapshotAtDate(schedule, agendaDate))
        .filter((schedule) =>
          schedule.dayOfWeek === dayOfWeek &&
          (!classIds || classIds.has(schedule.classId)),
        );

      for (const schedule of effectiveSchedules) {
        const existingAgenda = await this.prisma.dailyAgenda.findFirst({
          where: { scheduleId: schedule.id, date: agendaDate },
          include: { class: true, subject: true, teacher: true, attendance: true },
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

  async getAgendas(date?: string) {
    const agendaDate = date ? new Date(date) : undefined;

    return {
      data: await this.prisma.dailyAgenda.findMany({
        where: {
          date: agendaDate,
        },
        include: {
          class: true,
          subject: true,
          teacher: true,
          attendance: {
            include: { items: true },
          },
        },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
    };
  }

  private validateScheduleTime(startsAt: string, endsAt: string) {
    if (startsAt >= endsAt) {
      throw new BadRequestException('Jam mulai harus lebih awal dari jam selesai');
    }
  }

  private async getTeacherAccount(userId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (!teacher) {
      throw new NotFoundException('Akun ini belum terhubung dengan data guru aktif');
    }

    return teacher;
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

    if (!semester) {
      throw new BadRequestException('Semester tidak valid untuk tahun ajaran ini');
    }

    if (!schoolClass) {
      throw new BadRequestException('Kelas tidak valid untuk tahun ajaran ini');
    }

    if (!subject) {
      throw new BadRequestException('Mata pelajaran tidak valid');
    }

    if (!teacher) {
      throw new BadRequestException('Guru tidak valid');
    }

    const assignment = this.getEffectiveTeacherAssignment(
      teacher.yearAssignments,
      semester.schoolYear.startsAt,
    );
    const teacherSubject = assignment
      ? assignment.subjects.some(({ subjectId }) => subjectId === dto.subjectId)
      : await this.prisma.teacherSubject.findUnique({
        where: { teacherId_subjectId: { teacherId: dto.teacherId, subjectId: dto.subjectId } },
      });

    if ((assignment && assignment.status !== TeacherAssignmentStatus.ACTIVE) || !teacherSubject) {
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

    if (!semester) {
      throw new BadRequestException('Semester tidak valid untuk tahun ajaran ini');
    }

    if (classes.length !== classIds.length) {
      throw new BadRequestException('Ada kelas yang tidak valid untuk tahun ajaran ini');
    }

    if (!subject || !teacher || timeSlots.length !== timeSlotIds.length) {
      throw new BadRequestException('Guru, mata pelajaran, atau slot waktu tidak valid');
    }

    const yearAssignment = this.getEffectiveTeacherAssignment(
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
      .map((schedule) => this.getScheduleSnapshotAtDate(schedule, effectiveFrom))
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

  private getScheduleSnapshotAtDate(schedule: any, effectiveFrom: Date) {
    const revision = this.getEffectiveScheduleRevision(schedule.revisions, effectiveFrom);

    return revision ? { ...schedule, ...revision } : schedule;
  }

  private async createAgendaFromEffectiveSchedule(
    schedule: {
      id: string;
      schoolYearId: string;
      classId: string;
      subjectId: string;
      teacherId: string;
    },
    semesterId: string,
    agendaDate: Date,
  ) {
    return this.prisma.dailyAgenda.create({
      data: {
        scheduleId: schedule.id,
        schoolYearId: schedule.schoolYearId,
        semesterId,
        classId: schedule.classId,
        subjectId: schedule.subjectId,
        teacherId: schedule.teacherId,
        date: agendaDate,
        status: AgendaStatus.SCHEDULED,
      },
      include: {
        class: true,
        subject: true,
        teacher: true,
        attendance: true,
      },
    });
  }

  private getEffectiveScheduleRevision(
    revisions: Array<{ effectiveFrom: Date }> | undefined,
    effectiveFrom: Date,
  ) {
    return revisions
      ?.filter((item) => item.effectiveFrom <= effectiveFrom)
      .at(-1);
  }

  private getEffectiveTeacherAssignment<Assignment extends {
    schoolYear: { startsAt: Date };
  }>(assignments: Assignment[], schoolYearStartsAt: Date) {
    return assignments
      .filter((assignment) => assignment.schoolYear.startsAt <= schoolYearStartsAt)
      .sort((first, second) => second.schoolYear.startsAt.getTime() - first.schoolYear.startsAt.getTime())[0];
  }

  private async withTeacherPhotoUrl<T extends { photoKey?: string | null; photoName?: string | null }>(teacher: T) {
    if (!teacher.photoKey) return teacher;
    return {
      ...teacher,
      photoUrl: await this.storage.createDownloadUrl(teacher.photoKey, teacher.photoName ?? 'foto-guru'),
    };
  }

  private async validateAcademicCalendarEvent(dto: {
    schoolYearId: string;
    semesterId?: string;
    title: string;
    description?: string;
    type: AcademicCalendarEventType;
    startsAt: string;
    endsAt: string;
    blocksAgenda?: boolean;
  }) {
    const [schoolYear, semester] = await Promise.all([
      this.prisma.schoolYear.findFirst({ where: { id: dto.schoolYearId, deletedAt: null } }),
      dto.semesterId
        ? this.prisma.semester.findFirst({ where: { id: dto.semesterId, schoolYearId: dto.schoolYearId, deletedAt: null } })
        : null,
    ]);

    if (!schoolYear) throw new NotFoundException('Tahun ajaran tidak ditemukan');
    if (dto.semesterId && !semester) throw new BadRequestException('Semester tidak berada pada tahun ajaran yang dipilih');
    if (!dto.title.trim()) throw new BadRequestException('Judul event Kaldik wajib diisi');

    const startsAt = this.toDateOnly(dto.startsAt);
    const endsAt = this.toDateOnly(dto.endsAt);
    if (endsAt < startsAt) throw new BadRequestException('Tanggal akhir tidak boleh lebih awal dari tanggal mulai');
    if (startsAt < this.toDateOnly(schoolYear.startsAt.toISOString()) || endsAt > this.toDateOnly(schoolYear.endsAt.toISOString())) {
      throw new BadRequestException('Rentang event harus berada dalam tahun ajaran yang dipilih');
    }

    return {
      schoolYearId: dto.schoolYearId,
      semesterId: dto.semesterId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      type: dto.type,
      startsAt,
      endsAt,
      blocksAgenda: dto.blocksAgenda ?? true,
    };
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
    return new Set(events.flatMap((event) => this.getDateRange(event.startsAt, event.endsAt)
      .map((date) => date.toISOString().slice(0, 10))));
  }

  private toDateOnly(value: string) {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private getDayOfWeek(date: Date) {
    const day = date.getUTCDay();
    return day === 0 ? 7 : day;
  }

  private getDateRange(startsAt: Date, endsAt: Date) {
    const dates: Date[] = [];
    const current = new Date(startsAt);

    while (current <= endsAt) {
      dates.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
  }

  private getDefaultUserPassword() {
    return this.configService.get<string>('DEFAULT_USER_PASSWORD') ?? '123456';
  }
}
