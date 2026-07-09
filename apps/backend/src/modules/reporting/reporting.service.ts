import { BadRequestException, Injectable } from '@nestjs/common';
import { AgendaStatus, AttendanceState, AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportExportService } from './report-export.service';

type ExportFormat = 'excel' | 'pdf';
type ReportType =
  | 'attendance-summary'
  | 'teacher-teaching'
  | 'empty-classes'
  | 'student-attendance';

@Injectable()
export class ReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportExportService: ReportExportService,
  ) {}

  async getOperationalToday() {
    const { startOfDay, endOfDay } = this.getTodayRange();

    const [
      agendas,
      totalTeachingTeachers,
      submittedTeachers,
      attendanceItems,
      reminderSent,
      summarySent,
      failedNotifications,
    ] = await Promise.all([
      this.prisma.dailyAgenda.findMany({
        where: {
          date: {
            gte: startOfDay,
            lt: endOfDay,
          },
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
        orderBy: [{ class: { name: 'asc' } }, { schedule: { startsAt: 'asc' } }],
      }),
      this.prisma.dailyAgenda.findMany({
        where: {
          date: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
        distinct: ['teacherId'],
        select: { teacherId: true },
      }),
      this.prisma.attendance.findMany({
        where: {
          submittedAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
          submittedById: { not: null },
        },
        distinct: ['submittedById'],
        select: { submittedById: true },
      }),
      this.prisma.attendanceItem.findMany({
        where: {
          attendance: {
            submittedAt: {
              gte: startOfDay,
              lt: endOfDay,
            },
          },
        },
        select: { status: true },
      }),
      this.prisma.notificationLog.count({
        where: {
          status: 'SENT',
          templateKey: 'teacher.reminder.before-class',
          sentAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
      this.prisma.notificationLog.count({
        where: {
          status: 'SENT',
          templateKey: 'attendance.summary.daily',
          sentAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
      this.prisma.notificationLog.count({
        where: {
          status: 'FAILED',
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
    ]);

    const inProgress = agendas.filter(
      (agenda) => agenda.status === AgendaStatus.IN_PROGRESS,
    ).length;
    const completed = agendas.filter(
      (agenda) => agenda.status === AgendaStatus.COMPLETED,
    ).length;
    const empty = agendas.filter((agenda) => agenda.status === AgendaStatus.EMPTY).length;
    const submittedStates: AttendanceState[] = [
      AttendanceState.SUBMITTED,
      AttendanceState.APPROVED,
      AttendanceState.CORRECTED,
      AttendanceState.LOCKED,
    ];

    const notSubmitted = agendas.filter((agenda) => {
      if (!agenda.attendance) {
        return agenda.status !== AgendaStatus.COMPLETED;
      }

      return !submittedStates.includes(agenda.attendance.state);
    }).length;
    const checklistMissing = agendas.filter((agenda) => {
      if (!agenda.attendance || !submittedStates.includes(agenda.attendance.state)) {
        return false;
      }

      return (
        agenda.attendance.teacherPresent !== true ||
        agenda.attendance.studentAttendanceDone !== true ||
        agenda.attendance.materialFilled !== true ||
        agenda.attendance.classPhotoDone !== true
      );
    });
    const withIssueNotes = agendas.filter((agenda) => agenda.attendance?.issueNotes);
    const substituteAgendas = agendas.filter((agenda) => agenda.substituteTeacher);
    const followUpItems = agendas
      .filter(
        (agenda) =>
          agenda.status === AgendaStatus.EMPTY ||
          !agenda.attendance ||
          !submittedStates.includes(agenda.attendance.state) ||
          checklistMissing.some((item) => item.id === agenda.id) ||
          Boolean(agenda.attendance?.issueNotes),
      )
      .slice(0, 8)
      .map((agenda) => ({
        agendaId: agenda.id,
        className: agenda.class.name,
        subjectName: agenda.subject.name,
        teacherName: agenda.teacher.name,
        substituteTeacherName: agenda.substituteTeacher?.name ?? null,
        startsAt: agenda.schedule?.startsAt ?? null,
        endsAt: agenda.schedule?.endsAt ?? null,
        status: agenda.status,
        attendanceState: agenda.attendance?.state ?? null,
        issueNotes: agenda.attendance?.issueNotes ?? null,
      }));

    const studentAttendance = this.countAttendanceItems(attendanceItems);
    const totalTeachers = totalTeachingTeachers.length;
    const submittedTeacherCount = submittedTeachers.length;

    return {
      data: {
        date: this.formatDateOnly(startOfDay),
        classes: {
          totalToday: agendas.length,
          inProgress,
          completed,
          empty,
          notSubmitted,
        },
        teachers: {
          totalTeaching: totalTeachers,
          submitted: submittedTeacherCount,
          notSubmitted: Math.max(totalTeachers - submittedTeacherCount, 0),
        },
        students: studentAttendance,
        notifications: {
          reminderSent,
          summarySent,
          failed: failedNotifications,
        },
        kbm: {
          checklist: {
            teacherPresent: agendas.filter(
              (agenda) => agenda.attendance?.teacherPresent === true,
            ).length,
            studentAttendanceDone: agendas.filter(
              (agenda) => agenda.attendance?.studentAttendanceDone === true,
            ).length,
            materialFilled: agendas.filter(
              (agenda) => agenda.attendance?.materialFilled === true,
            ).length,
            classPhotoDone: agendas.filter(
              (agenda) => agenda.attendance?.classPhotoDone === true,
            ).length,
            missing: checklistMissing.length,
            withIssueNotes: withIssueNotes.length,
          },
          substitutes: {
            total: substituteAgendas.length,
            items: substituteAgendas.slice(0, 5).map((agenda) => ({
              agendaId: agenda.id,
              className: agenda.class.name,
              subjectName: agenda.subject.name,
              teacherName: agenda.teacher.name,
              substituteTeacherName: agenda.substituteTeacher?.name ?? null,
              startsAt: agenda.schedule?.startsAt ?? null,
              endsAt: agenda.schedule?.endsAt ?? null,
            })),
          },
          followUpItems,
        },
      },
    };
  }

  async exportReport({
    date,
    format,
    reportType,
  }: {
    date?: string;
    format: ExportFormat;
    reportType: string;
  }) {
    const normalizedReportType = this.normalizeReportType(reportType);
    const reportDate = date ? this.toDateOnly(date) : this.getTodayRange().startOfDay;
    const rows = await this.getReportRows(normalizedReportType, reportDate);
    const reportName = this.getReportName(normalizedReportType);
    const dateLabel = this.formatDateOnly(reportDate);

    if (format === 'pdf') {
      return {
        buffer: await this.reportExportService.toPdf(`${reportName} ${dateLabel}`, rows),
        contentType: 'application/pdf',
        filename: `${normalizedReportType}-${dateLabel}.pdf`,
      };
    }

    return {
      buffer: this.reportExportService.toExcel(`${reportName} ${dateLabel}`, rows),
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${normalizedReportType}-${dateLabel}.xlsx`,
    };
  }

  async getTeacherPerformance({
    from,
    to,
  }: {
    from?: string;
    to?: string;
  }) {
    const { startOfDay, endOfDay } = this.getReportRange(from, to, 30);
    const agendas = await this.prisma.dailyAgenda.findMany({
      where: {
        date: { gte: startOfDay, lt: endOfDay },
        status: { not: AgendaStatus.CANCELLED },
      },
      include: {
        teacher: true,
        class: true,
        subject: true,
        schedule: true,
        attendance: true,
      },
      orderBy: [{ teacher: { name: 'asc' } }, { date: 'desc' }],
    });

    const teacherMap = new Map<
      string,
      {
        teacherId: string;
        teacherName: string;
        totalSessions: number;
        submittedSessions: number;
        lateSubmissions: number;
        emptyClasses: number;
        notSubmitted: number;
        latestSessions: Array<{
          agendaId: string;
          date: string;
          className: string;
          subjectName: string;
          agendaStatus: string;
          attendanceState: string | null;
          submittedAt: string | null;
          isLate: boolean;
        }>;
      }
    >();

    for (const agenda of agendas) {
      const performance = teacherMap.get(agenda.teacherId) ?? {
        teacherId: agenda.teacherId,
        teacherName: agenda.teacher.name,
        totalSessions: 0,
        submittedSessions: 0,
        lateSubmissions: 0,
        emptyClasses: 0,
        notSubmitted: 0,
        latestSessions: [],
      };
      const isSubmitted = Boolean(agenda.attendance?.submittedAt);
      const isLate = this.isLateSubmit(
        agenda.date,
        agenda.schedule?.endsAt,
        agenda.attendance?.submittedAt ?? null,
      );

      performance.totalSessions += 1;
      performance.submittedSessions += isSubmitted ? 1 : 0;
      performance.lateSubmissions += isLate ? 1 : 0;
      performance.emptyClasses += agenda.status === AgendaStatus.EMPTY ? 1 : 0;
      performance.notSubmitted += isSubmitted ? 0 : 1;

      if (performance.latestSessions.length < 5) {
        performance.latestSessions.push({
          agendaId: agenda.id,
          date: this.formatDateOnly(agenda.date),
          className: agenda.class.name,
          subjectName: agenda.subject.name,
          agendaStatus: agenda.status,
          attendanceState: agenda.attendance?.state ?? null,
          submittedAt: agenda.attendance?.submittedAt?.toISOString() ?? null,
          isLate,
        });
      }

      teacherMap.set(agenda.teacherId, performance);
    }

    const teachers = Array.from(teacherMap.values())
      .map((performance) => ({
        ...performance,
        onTimeSubmissions: Math.max(
          performance.submittedSessions - performance.lateSubmissions,
          0,
        ),
        submitRate:
          performance.totalSessions > 0
            ? Math.round(
                (performance.submittedSessions / performance.totalSessions) * 100,
              )
            : 0,
      }))
      .sort((left, right) => {
        if (right.lateSubmissions !== left.lateSubmissions) {
          return right.lateSubmissions - left.lateSubmissions;
        }

        if (right.emptyClasses !== left.emptyClasses) {
          return right.emptyClasses - left.emptyClasses;
        }

        return right.totalSessions - left.totalSessions;
      });

    return {
      data: {
        from: this.formatDateOnly(startOfDay),
        to: this.formatDateOnly(new Date(endOfDay.getTime() - 1)),
        totalTeachers: teachers.length,
        totalSessions: teachers.reduce(
          (total, teacher) => total + teacher.totalSessions,
          0,
        ),
        totalLateSubmissions: teachers.reduce(
          (total, teacher) => total + teacher.lateSubmissions,
          0,
        ),
        totalEmptyClasses: teachers.reduce(
          (total, teacher) => total + teacher.emptyClasses,
          0,
        ),
        teachers,
      },
    };
  }

  private async getReportRows(reportType: ReportType, date: Date) {
    if (reportType === 'attendance-summary') {
      return this.getAttendanceSummaryRows(date);
    }

    if (reportType === 'teacher-teaching') {
      return this.getTeacherTeachingRows(date);
    }

    if (reportType === 'empty-classes') {
      return this.getEmptyClassRows(date);
    }

    return this.getStudentAttendanceRows(date);
  }

  private async getAttendanceSummaryRows(date: Date) {
    const { startOfDay, endOfDay } = this.getDateRange(date);
    const agendas = await this.prisma.dailyAgenda.findMany({
      where: { date: { gte: startOfDay, lt: endOfDay } },
      include: {
        class: true,
        subject: true,
        teacher: true,
        attendance: { include: { items: true } },
      },
      orderBy: [{ class: { name: 'asc' } }, { createdAt: 'asc' }],
    });

    return agendas.map((agenda) => {
      const summary = this.countAttendanceItems(agenda.attendance?.items ?? []);

      return {
        tanggal: this.formatDateOnly(agenda.date),
        kelas: agenda.class.name,
        mapel: agenda.subject.name,
        guru: agenda.teacher.name,
        status_agenda: agenda.status,
        status_presensi: agenda.attendance?.state ?? 'BELUM_DIBUAT',
        hadir: summary.present,
        sakit: summary.sick,
        izin: summary.excused,
        alpha: summary.absent,
      };
    });
  }

  private async getTeacherTeachingRows(date: Date) {
    const { startOfDay, endOfDay } = this.getDateRange(date);
    const agendas = await this.prisma.dailyAgenda.findMany({
      where: { date: { gte: startOfDay, lt: endOfDay } },
      include: {
        class: true,
        subject: true,
        teacher: true,
        attendance: true,
      },
      orderBy: [{ teacher: { name: 'asc' } }, { createdAt: 'asc' }],
    });

    return agendas.map((agenda) => ({
      tanggal: this.formatDateOnly(agenda.date),
      guru: agenda.teacher.name,
      kelas: agenda.class.name,
      mapel: agenda.subject.name,
      status_agenda: agenda.status,
      status_presensi: agenda.attendance?.state ?? 'BELUM_DIBUAT',
      submit_pada: agenda.attendance?.submittedAt?.toISOString() ?? null,
    }));
  }

  private async getEmptyClassRows(date: Date) {
    const { startOfDay, endOfDay } = this.getDateRange(date);
    const agendas = await this.prisma.dailyAgenda.findMany({
      where: {
        date: { gte: startOfDay, lt: endOfDay },
        status: AgendaStatus.EMPTY,
      },
      include: {
        class: true,
        subject: true,
        teacher: true,
      },
      orderBy: [{ class: { name: 'asc' } }, { createdAt: 'asc' }],
    });

    return agendas.map((agenda) => ({
      tanggal: this.formatDateOnly(agenda.date),
      kelas: agenda.class.name,
      mapel: agenda.subject.name,
      guru: agenda.teacher.name,
      status: agenda.status,
    }));
  }

  private async getStudentAttendanceRows(date: Date) {
    const { startOfDay, endOfDay } = this.getDateRange(date);
    const items = await this.prisma.attendanceItem.findMany({
      where: {
        attendance: {
          agenda: { date: { gte: startOfDay, lt: endOfDay } },
        },
      },
      include: {
        student: true,
        attendance: {
          include: {
            agenda: {
              include: { class: true, subject: true, teacher: true },
            },
          },
        },
      },
      orderBy: [{ student: { name: 'asc' } }, { createdAt: 'asc' }],
    });

    return items.map((item) => ({
      tanggal: this.formatDateOnly(item.attendance.agenda.date),
      siswa: item.student.name,
      nis: item.student.nis,
      nisn: item.student.nisn,
      kelas: item.attendance.agenda.class.name,
      mapel: item.attendance.agenda.subject.name,
      guru: item.attendance.agenda.teacher.name,
      status: item.status,
      catatan: item.notes,
    }));
  }

  private countAttendanceItems(items: Array<{ status: AttendanceStatus }>) {
    return items.reduce(
      (summary, item) => {
        if (item.status === AttendanceStatus.PRESENT) {
          summary.present += 1;
        }

        if (item.status === AttendanceStatus.SICK) {
          summary.sick += 1;
        }

        if (item.status === AttendanceStatus.EXCUSED) {
          summary.excused += 1;
        }

        if (item.status === AttendanceStatus.ABSENT) {
          summary.absent += 1;
        }

        return summary;
      },
      {
        present: 0,
        sick: 0,
        excused: 0,
        absent: 0,
      },
    );
  }

  private getTodayRange() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return { startOfDay, endOfDay };
  }

  private getDateRange(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return { startOfDay, endOfDay };
  }

  private toDateOnly(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Tanggal report tidak valid');
    }

    date.setHours(0, 0, 0, 0);
    return date;
  }

  private getReportRange(from: string | undefined, to: string | undefined, days: number) {
    const endDate = to ? this.toDateOnly(to) : new Date();
    endDate.setHours(0, 0, 0, 0);

    const startDate = from ? this.toDateOnly(from) : new Date(endDate);

    if (!from) {
      startDate.setDate(startDate.getDate() - days + 1);
    }

    startDate.setHours(0, 0, 0, 0);

    const endOfDay = new Date(endDate);
    endOfDay.setDate(endOfDay.getDate() + 1);

    if (startDate > endOfDay) {
      throw new BadRequestException('Rentang tanggal tidak valid');
    }

    return { startOfDay: startDate, endOfDay };
  }

  private isLateSubmit(
    agendaDate: Date,
    scheduleEndsAt: string | null | undefined,
    submittedAt: Date | null,
  ) {
    if (!scheduleEndsAt || !submittedAt) {
      return false;
    }

    const dueAt = this.combineDateAndTime(agendaDate, scheduleEndsAt);

    if (!dueAt) {
      return false;
    }

    return submittedAt > dueAt;
  }

  private combineDateAndTime(date: Date, time: string) {
    const [hour, minute] = time.split(':').map((part) => Number(part));

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }

    const combinedDate = new Date(date);
    combinedDate.setHours(hour, minute, 0, 0);

    return combinedDate;
  }

  private normalizeReportType(reportType: string): ReportType {
    const allowedReportTypes: ReportType[] = [
      'attendance-summary',
      'teacher-teaching',
      'empty-classes',
      'student-attendance',
    ];

    if (!allowedReportTypes.includes(reportType as ReportType)) {
      throw new BadRequestException('Tipe report tidak valid');
    }

    return reportType as ReportType;
  }

  private getReportName(reportType: ReportType) {
    const names: Record<ReportType, string> = {
      'attendance-summary': 'Rekap Kehadiran',
      'teacher-teaching': 'Rekap Guru Mengajar',
      'empty-classes': 'Kelas Kosong',
      'student-attendance': 'Presensi Siswa',
    };

    return names[reportType];
  }

  private formatDateOnly(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
