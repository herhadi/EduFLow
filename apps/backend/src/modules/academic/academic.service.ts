import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
}

