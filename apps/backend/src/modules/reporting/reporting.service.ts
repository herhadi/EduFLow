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
          attendance: {
            include: { items: true },
          },
        },
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
