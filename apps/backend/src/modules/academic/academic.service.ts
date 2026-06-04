import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AgendaStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { GenerateAgendaDto } from './dto/generate-agenda.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

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
        include: { schoolYear: true },
        orderBy: { name: 'asc' },
      }),
    };
  }

  async getSubjects() {
    return {
      data: await this.prisma.subject.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      }),
    };
  }

  async getTeachers() {
    return {
      data: await this.prisma.teacher.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      }),
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

    return { data: schedule, message: 'Jadwal berhasil diperbarui.' };
  }

  async deleteSchedule(id: string) {
    await this.getSchedule(id);

    const schedule = await this.prisma.schedule.update({
      where: { id },
      data: { deletedAt: new Date() },
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
  }

  private toDateOnly(value: string) {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }
}
