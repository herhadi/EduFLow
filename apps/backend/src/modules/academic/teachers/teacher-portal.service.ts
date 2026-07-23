import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { getScheduleSnapshotAtDate } from '../schedules/schedule-utils';

@Injectable()
export class TeacherPortalService {
  private readonly defaultTimezoneOffsetMinutes = 7 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getMyHomeroom(userId: string) {
    const teacher = await this.getTeacherAccount(userId);
    const todayDate = this.getTodayDateOnly();
    const monthStart = new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth() + 1, 1));

    const schoolClass = await this.prisma.class.findFirst({
      where: {
        homeroomTeacherId: teacher.id,
        deletedAt: null,
        schoolYear: {
          deletedAt: null,
          startsAt: { lte: todayDate },
          endsAt: { gte: todayDate },
        },
      },
      include: { schoolYear: true },
      orderBy: { name: 'asc' },
    });

    if (!schoolClass) {
      return {
        data: {
          class: null,
          students: [],
          summary: this.emptyAttendanceSummary(),
          monthSummary: this.emptyAttendanceSummary(),
          riskStudents: [],
        },
      };
    }

    const [students, todayItems, monthItems] = await Promise.all([
      this.prisma.student.findMany({
        where: {
          deletedAt: null,
          enrollments: {
            some: {
              classId: schoolClass.id,
              schoolYearId: schoolClass.schoolYearId,
              isActive: true,
              deletedAt: null,
            },
          },
        },
        include: {
          enrollments: {
            where: {
              classId: schoolClass.id,
              schoolYearId: schoolClass.schoolYearId,
              isActive: true,
              deletedAt: null,
            },
            include: { class: true, schoolYear: true },
          },
          guardians: {
            where: { deletedAt: null },
            include: { guardian: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.attendanceItem.findMany({
        where: {
          attendance: {
            classId: schoolClass.id,
            agenda: { date: todayDate },
          },
        },
        include: { student: true },
      }),
      this.prisma.attendanceItem.findMany({
        where: {
          attendance: {
            classId: schoolClass.id,
            agenda: {
              date: {
                gte: monthStart,
                lt: nextMonthStart,
              },
            },
          },
        },
        include: { student: true },
      }),
    ]);

    const monthByStudent = new Map<string, ReturnType<typeof this.emptyAttendanceSummary>>();
    for (const item of monthItems) {
      const current = monthByStudent.get(item.studentId) ?? this.emptyAttendanceSummary();
      this.addAttendanceStatus(current, item.status);
      monthByStudent.set(item.studentId, current);
    }

    const todayByStudent = new Map(todayItems.map((item) => [item.studentId, item.status]));
    const enrichedStudents = students.map((student) => {
      const monthSummary = monthByStudent.get(student.id) ?? this.emptyAttendanceSummary();
      return {
        ...student,
        todayStatus: todayByStudent.get(student.id) ?? null,
        monthSummary,
      };
    });

    const riskStudents = enrichedStudents
      .filter((student) => student.monthSummary.absent + student.monthSummary.sick + student.monthSummary.excused > 0)
      .sort((first, second) =>
        (second.monthSummary.absent * 3 + second.monthSummary.sick + second.monthSummary.excused) -
        (first.monthSummary.absent * 3 + first.monthSummary.sick + first.monthSummary.excused),
      )
      .slice(0, 8);

    return {
      data: {
        class: schoolClass,
        students: enrichedStudents,
        summary: this.countAttendanceItems(todayItems),
        monthSummary: this.countAttendanceItems(monthItems),
        riskStudents,
      },
    };
  }

  async getMySchedules(userId: string) {
    const teacher = await this.getTeacherAccount(userId);
    const today = this.getTodayDateOnly();
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
        timeSlot: true,
        revisions: {
          include: { semester: true, class: true, subject: true, teacher: true, timeSlot: true },
          orderBy: { effectiveFrom: 'asc' },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startsAt: 'asc' }],
    });

    return {
      data: schedules
        .map((schedule) => getScheduleSnapshotAtDate(schedule, today))
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

  async getMyAgendas(userId: string, date?: string) {
    const teacher = await this.getTeacherAccount(userId);
    const agendaDate = date ? this.toDateOnly(date) : undefined;

    const agendas = await this.prisma.dailyAgenda.findMany({
      where: {
        date: agendaDate,
        OR: [
          { teacherId: teacher.id },
          { substituteTeacherId: teacher.id },
        ],
      },
      include: {
        class: true,
        subject: true,
        teacher: true,
        substituteTeacher: true,
        schedule: true,
        attendance: {
          include: { items: true },
        },
      },
      orderBy: [{ date: 'asc' }, { schedule: { startsAt: 'asc' } }],
    });

    return {
      data: agendas.map((agenda) => ({
        ...agenda,
        canManageAttendance: agenda.substituteTeacherId
          ? agenda.substituteTeacherId === teacher.id
          : agenda.teacherId === teacher.id,
      })),
    };
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

  private emptyAttendanceSummary() {
    return {
      total: 0,
      present: 0,
      sick: 0,
      excused: 0,
      absent: 0,
    };
  }

  private countAttendanceItems(items: Array<{ status: string }>) {
    const summary = this.emptyAttendanceSummary();
    for (const item of items) {
      this.addAttendanceStatus(summary, item.status);
    }
    return summary;
  }

  private addAttendanceStatus(summary: ReturnType<typeof this.emptyAttendanceSummary>, status: string) {
    summary.total += 1;
    if (status === 'PRESENT') summary.present += 1;
    if (status === 'SICK') summary.sick += 1;
    if (status === 'EXCUSED') summary.excused += 1;
    if (status === 'ABSENT') summary.absent += 1;
  }

  private toDateOnly(value: string) {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private getTodayDateOnly() {
    const timezoneOffsetMinutes = this.getSchoolTimezoneOffsetMinutes();
    const localNow = new Date(Date.now() + timezoneOffsetMinutes * 60_000);
    return new Date(Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate(),
    ));
  }

  private getSchoolTimezoneOffsetMinutes() {
    return Number(
      this.configService.get<string>('SCHOOL_TIMEZONE_OFFSET_MINUTES') ?? this.defaultTimezoneOffsetMinutes,
    );
  }
}
