import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgendaStatus } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConfigureTeacherAccountDto } from './dto/configure-teacher-account.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { GenerateAgendaDto } from './dto/generate-agenda.dto';
import { SetClassHomeroomTeacherDto } from './dto/set-class-homeroom-teacher.dto';
import { SetTeacherSubjectsDto } from './dto/set-teacher-subjects.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class AcademicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async getSchoolYears() {
    return {
      data: await this.prisma.schoolYear.findMany({
        where: { deletedAt: null },
        orderBy: { startsAt: 'desc' },
      }),
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
    return {
      data: await this.prisma.class.findMany({
        where: { deletedAt: null, schoolYearId },
        include: { schoolYear: true, homeroomTeacher: true },
        orderBy: { name: 'asc' },
      }),
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
      include: { homeroomTeacher: true },
    });

    if (!schoolClass) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    if (dto.teacherId) {
      const teacher = await this.prisma.teacher.findFirst({
        where: { id: dto.teacherId, deletedAt: null },
        include: {
          subjects: true,
          user: { include: { roles: { include: { role: true } } } },
        },
      });

      if (!teacher) {
        throw new NotFoundException('Guru tidak ditemukan');
      }

      if (!teacher.subjects.length) {
        throw new BadRequestException(
          'Wali kelas harus guru mapel. Atur mapel ampu guru terlebih dahulu.',
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
    return {
      data: await this.prisma.teacher.findMany({
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
        },
        orderBy: { name: 'asc' },
      }),
    };
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

    const password = dto.password ?? this.getDefaultUserPassword();
    const user = await this.prisma.$transaction(async (tx) => {
      const savedUser = teacher.userId
        ? await tx.user.update({
            where: { id: teacher.userId },
            data: {
              email,
              username,
              name: teacher.name,
              deletedAt: null,
              ...(dto.password ? { password: await hash(password, 12) } : {}),
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

  async updateSchedule(id: string, dto: UpdateScheduleDto) {
    const existingSchedule = await this.prisma.schedule.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingSchedule) {
      throw new NotFoundException('Jadwal tidak ditemukan');
    }

    const nextSchedule = { ...existingSchedule, ...dto };
    this.validateScheduleTime(nextSchedule.startsAt, nextSchedule.endsAt);
    await this.ensureScheduleRelations(nextSchedule);

    const schedule = await this.prisma.schedule.update({
      where: { id },
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
      action: 'schedule.updated',
      entityType: 'Schedule',
      entityId: schedule.id,
      before: existingSchedule,
      after: schedule,
    });

    return { data: schedule, message: 'Jadwal berhasil diperbarui.' };
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

  async generateAgenda(id: string, dto: GenerateAgendaDto) {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id, deletedAt: null },
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

    const agenda = await this.prisma.dailyAgenda.create({
      data: {
        scheduleId: schedule.id,
        schoolYearId: schedule.schoolYearId,
        semesterId: schedule.semesterId,
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

    const teacherSubject = await this.prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId: dto.teacherId,
          subjectId: dto.subjectId,
        },
      },
    });

    if (!teacherSubject) {
      throw new BadRequestException('Guru belum diatur mengampu mata pelajaran ini');
    }
  }

  private toDateOnly(value: string) {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private getDefaultUserPassword() {
    return this.configService.get<string>('DEFAULT_USER_PASSWORD') ?? '123456';
  }
}
