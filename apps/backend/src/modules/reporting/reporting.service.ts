import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AgendaStatus, AssessmentStatus, AttendanceState, AttendanceStatus } from '@prisma/client';
import { STORAGE_PROVIDER, StorageProvider } from '../../infrastructure/storage/storage-provider';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportExportService } from './report-export.service';

type ExportFormat = 'excel' | 'pdf';
type ReportType =
  | 'attendance-summary'
  | 'teacher-teaching'
  | 'empty-classes'
  | 'student-attendance';
type AttendanceSummaryReport = {
  total: number;
  present: number;
  sick: number;
  excused: number;
  absent: number;
};

const lateSubmitToleranceMinutes = 15;

@Injectable()
export class ReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportExportService: ReportExportService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async getOperationalToday() {
    const { dateOnly, nextDateOnly, startOfDay, endOfDay } = this.getSchoolTodayRange();
    const agendaDateWhere = {
      gte: dateOnly,
      lt: nextDateOnly,
    };

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
          date: agendaDateWhere,
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
          date: agendaDateWhere,
        },
        distinct: ['teacherId'],
        select: { teacherId: true },
      }),
      this.prisma.attendance.findMany({
        where: {
          agenda: { date: agendaDateWhere },
          submittedById: { not: null },
        },
        distinct: ['submittedById'],
        select: { submittedById: true },
      }),
      this.prisma.attendanceItem.findMany({
        where: {
          attendance: {
            agenda: { date: agendaDateWhere },
            submittedAt: { not: null },
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
    const isSubmittedAttendance = (attendance?: { state: AttendanceState; submittedAt: Date | null } | null) =>
      Boolean(attendance?.submittedAt) ||
      Boolean(attendance && submittedStates.includes(attendance.state));

    const notSubmitted = agendas.filter((agenda) => {
      if (!agenda.attendance) {
        return agenda.status !== AgendaStatus.COMPLETED;
      }

      return !isSubmittedAttendance(agenda.attendance);
    }).length;
    const checklistMissing = agendas.filter((agenda) => {
      if (!agenda.attendance || !isSubmittedAttendance(agenda.attendance)) {
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
    const todayItems = await Promise.all(agendas.map(async (agenda) => ({
        deadlineAt: this.getAgendaDeadline(agenda.date, agenda.schedule?.endsAt)?.toISOString() ?? null,
        agendaId: agenda.id,
        className: agenda.class.name,
        subjectName: agenda.subject.name,
        teacherName: agenda.teacher.name,
        substituteTeacherName: agenda.substituteTeacher?.name ?? null,
        startsAt: agenda.schedule?.startsAt ?? null,
        endsAt: agenda.schedule?.endsAt ?? null,
        status: agenda.status,
        attendanceState: agenda.attendance?.state ?? null,
        isLateSubmitted: this.isLateSubmit(agenda.date, agenda.schedule?.endsAt, agenda.attendance?.submittedAt ?? null),
        isPastDue: this.isPastDue(agenda.date, agenda.schedule?.endsAt, agenda.attendance?.submittedAt ?? null),
        submittedAt: agenda.attendance?.submittedAt?.toISOString() ?? null,
        teacherPresent: agenda.attendance?.teacherPresent ?? null,
        studentAttendanceDone: agenda.attendance?.studentAttendanceDone ?? null,
        materialFilled: agenda.attendance?.materialFilled ?? null,
        classPhotoDone: agenda.attendance?.classPhotoDone ?? null,
        materialNotes: agenda.attendance?.notes ?? null,
        issueNotes: agenda.attendance?.issueNotes ?? null,
        classPhotoName: agenda.attendance?.classPhotoName ?? null,
        classPhotoSize: agenda.attendance?.classPhotoSize ?? null,
        classPhotoTakenAt: agenda.attendance?.classPhotoTakenAt?.toISOString() ?? null,
        classPhotoLatitude: agenda.attendance?.classPhotoLatitude ?? null,
        classPhotoLongitude: agenda.attendance?.classPhotoLongitude ?? null,
        classPhotoAccuracy: agenda.attendance?.classPhotoAccuracy ?? null,
        classPhotoUrl: await this.createClassPhotoUrl(agenda.attendance),
      })));
    const followUpItems = todayItems
      .filter(
        (agenda) =>
          agenda.status === AgendaStatus.EMPTY ||
          !agenda.attendanceState ||
          !isSubmittedAttendance({ state: agenda.attendanceState as AttendanceState, submittedAt: agenda.submittedAt ? new Date(agenda.submittedAt) : null }) ||
          (agenda.attendanceState && ![agenda.teacherPresent, agenda.studentAttendanceDone, agenda.materialFilled, agenda.classPhotoDone].every(Boolean)) ||
          Boolean(agenda.issueNotes),
      )
      .slice(0, 8);

    const studentAttendance = this.countAttendanceItems(attendanceItems);
    const totalTeachers = totalTeachingTeachers.length;
    const submittedTeacherCount = submittedTeachers.length;

    return {
      data: {
        date: this.formatUtcDateOnly(dateOnly),
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
          todayItems,
        },
      },
    };
  }

  private async createClassPhotoUrl(attendance?: {
    classPhotoKey?: string | null;
    classPhotoMimeType?: string | null;
    classPhotoName?: string | null;
  } | null) {
    if (!attendance?.classPhotoKey) {
      return null;
    }

    return this.storage.createDownloadUrl(attendance.classPhotoKey, attendance.classPhotoName ?? 'foto-kelas', {
      contentType: attendance.classPhotoMimeType ?? undefined,
      disposition: 'inline',
    }).catch(() => null);
  }

  private getAgendaDeadline(date: Date, endsAt?: string | null) {
    if (!endsAt) return null;

    const [hoursText, minutesText] = endsAt.split(':');
    const hours = Number(hoursText);
    const minutes = Number(minutesText);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return null;
    }

    const utc = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hours,
      minutes + lateSubmitToleranceMinutes - this.getSchoolTimezoneOffsetMinutes(),
    );

    return new Date(utc);
  }

  private isPastDue(date: Date, endsAt: string | null | undefined, submittedAt: Date | null) {
    const deadline = this.getAgendaDeadline(date, endsAt);
    return Boolean(deadline && !submittedAt && Date.now() > deadline.getTime());
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

  async getStudentReport({
    classId,
    from,
    status,
    to,
  }: {
    classId?: string;
    from?: string;
    status?: string;
    to?: string;
  }) {
    const { startOfDay, endOfDay } = this.getReportRange(from, to, 30);
    const normalizedStatus = this.normalizeAttendanceStatus(status);
    const [items, enrolledStudents, gradeScores] = await Promise.all([
      this.prisma.attendanceItem.findMany({
        where: {
          ...(normalizedStatus ? { status: normalizedStatus } : {}),
          attendance: {
            agenda: {
              date: { gte: startOfDay, lt: endOfDay },
            },
            ...(classId ? { classId } : {}),
          },
        },
        include: {
          student: {
            include: {
              guardians: {
                where: { deletedAt: null },
                include: { guardian: true },
              },
            },
          },
          attendance: {
            include: {
              agenda: {
                include: { class: true, subject: true, teacher: true },
              },
            },
          },
        },
        orderBy: [
          { student: { name: 'asc' } },
          { attendance: { agenda: { date: 'desc' } } },
        ],
      }),
      classId
        ? this.prisma.student.findMany({
            where: {
              deletedAt: null,
              enrollments: {
                some: { classId, isActive: true, deletedAt: null },
              },
            },
            include: {
              guardians: {
                where: { deletedAt: null },
                include: { guardian: true },
              },
              enrollments: {
                where: { classId, isActive: true, deletedAt: null },
                include: { class: true, schoolYear: true },
              },
            },
            orderBy: { name: 'asc' },
          })
        : Promise.resolve([]),
      this.prisma.assessmentScore.findMany({
        where: {
          score: { not: null },
          assessment: {
            assessmentDate: { gte: startOfDay, lt: endOfDay },
            status: { in: [AssessmentStatus.SUBMITTED, AssessmentStatus.LOCKED] },
            deletedAt: null,
            ...(classId ? { classId } : {}),
          },
        },
        include: {
          assessment: {
            include: {
              class: true,
              subject: true,
              teacher: true,
            },
          },
          student: {
            include: {
              guardians: {
                where: { deletedAt: null },
                include: { guardian: true },
              },
            },
          },
        },
        orderBy: [{ assessment: { assessmentDate: 'desc' } }],
      }),
    ]);

    const studentMap = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        nis: string | null;
        nisn: string | null;
        classId: string | null;
        className: string | null;
        guardianName: string | null;
        guardianContact: string | null;
        summary: AttendanceSummaryReport;
        riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
        riskReason: string;
        dailyGrades: {
          available: boolean;
          averageScore: number | null;
          latestScore: number | null;
          records: Array<unknown>;
        };
        latestRecords: Array<{
          id: string;
          date: string;
          className: string;
          subjectName: string;
          teacherName: string;
          status: AttendanceStatus;
          notes: string | null;
        }>;
      }
    >();

    for (const item of items) {
      const guardian = item.student.guardians.find((entry) => entry.isPrimary) ?? item.student.guardians[0];
      const current = studentMap.get(item.studentId) ?? {
        studentId: item.studentId,
        studentName: item.student.name,
        nis: item.student.nis,
        nisn: item.student.nisn,
        classId: item.attendance.agenda.classId,
        className: item.attendance.agenda.class.name,
        guardianName: guardian?.guardian.name ?? null,
        guardianContact: guardian?.guardian.phone ?? guardian?.guardian.email ?? null,
        summary: this.emptyAttendanceSummary(),
        riskLevel: 'LOW' as const,
        riskReason: 'Kehadiran relatif aman',
        dailyGrades: {
          available: false,
          averageScore: null,
          latestScore: null,
          records: [],
        },
        latestRecords: [],
      };

      this.addAttendanceStatus(current.summary, item.status);

      if (current.latestRecords.length < 5) {
        current.latestRecords.push({
          id: item.id,
          date: this.formatDateOnly(item.attendance.agenda.date),
          className: item.attendance.agenda.class.name,
          subjectName: item.attendance.agenda.subject.name,
          teacherName: item.attendance.agenda.teacher.name,
          status: item.status,
          notes: item.notes,
        });
      }

      studentMap.set(item.studentId, current);
    }

    for (const score of gradeScores) {
      const guardian = score.student.guardians.find((entry) => entry.isPrimary) ?? score.student.guardians[0];
      const current = studentMap.get(score.studentId) ?? {
        studentId: score.studentId,
        studentName: score.student.name,
        nis: score.student.nis,
        nisn: score.student.nisn,
        classId: score.assessment.classId,
        className: score.assessment.class.name,
        guardianName: guardian?.guardian.name ?? null,
        guardianContact: guardian?.guardian.phone ?? guardian?.guardian.email ?? null,
        summary: this.emptyAttendanceSummary(),
        riskLevel: 'LOW' as const,
        riskReason: 'Kehadiran relatif aman',
        dailyGrades: {
          available: false,
          averageScore: null,
          latestScore: null,
          records: [],
        },
        latestRecords: [],
      };
      const numericScore = Number(score.score);
      const gradeRecords = current.dailyGrades.records as Array<{
        id: string;
        date: string;
        title: string;
        type: string;
        className: string;
        subjectName: string;
        teacherName: string;
        score: number;
        maxScore: number;
        notes: string | null;
      }>;

      gradeRecords.push({
        id: score.id,
        date: this.formatDateOnly(score.assessment.assessmentDate),
        title: score.assessment.title,
        type: score.assessment.type,
        className: score.assessment.class.name,
        subjectName: score.assessment.subject.name,
        teacherName: score.assessment.teacher.name,
        score: numericScore,
        maxScore: Number(score.assessment.maxScore),
        notes: score.notes,
      });

      const totalScore = gradeRecords.reduce((total, record) => total + record.score, 0);
      current.dailyGrades = {
        available: true,
        averageScore: gradeRecords.length ? Math.round((totalScore / gradeRecords.length) * 100) / 100 : null,
        latestScore: gradeRecords[0]?.score ?? null,
        records: gradeRecords.slice(0, 5),
      };
      studentMap.set(score.studentId, current);
    }

    for (const student of enrolledStudents) {
      if (studentMap.has(student.id)) {
        continue;
      }

      const guardian = student.guardians.find((entry) => entry.isPrimary) ?? student.guardians[0];
      const enrollment = student.enrollments[0];
      studentMap.set(student.id, {
        studentId: student.id,
        studentName: student.name,
        nis: student.nis,
        nisn: student.nisn,
        classId: enrollment?.classId ?? classId ?? null,
        className: enrollment?.class.name ?? null,
        guardianName: guardian?.guardian.name ?? null,
        guardianContact: guardian?.guardian.phone ?? guardian?.guardian.email ?? null,
        summary: this.emptyAttendanceSummary(),
        riskLevel: 'LOW',
        riskReason: 'Belum ada presensi pada rentang ini',
        dailyGrades: {
          available: false,
          averageScore: null,
          latestScore: null,
          records: [],
        },
        latestRecords: [],
      });
    }

    const students = Array.from(studentMap.values()).map((student) => ({
      ...student,
      summary: {
        ...student.summary,
        total:
          student.summary.present +
          student.summary.sick +
          student.summary.excused +
          student.summary.absent,
      },
      ...this.getStudentRisk(student.summary),
    }));
    const summary = students.reduce(
      (total, student) => {
        total.present += student.summary.present;
        total.sick += student.summary.sick;
        total.excused += student.summary.excused;
        total.absent += student.summary.absent;
        total.total += student.summary.total;
        total.highRisk += student.riskLevel === 'HIGH' ? 1 : 0;
        total.mediumRisk += student.riskLevel === 'MEDIUM' ? 1 : 0;
        return total;
      },
      {
        total: 0,
        present: 0,
        sick: 0,
        excused: 0,
        absent: 0,
        highRisk: 0,
        mediumRisk: 0,
      },
    );

    return {
      data: {
        from: this.formatDateOnly(startOfDay),
        to: this.formatDateOnly(new Date(endOfDay.getTime() - 1)),
        classId: classId ?? null,
        status: normalizedStatus ?? null,
        summary,
        students: students.sort((left, right) => {
          if (right.summary.absent !== left.summary.absent) {
            return right.summary.absent - left.summary.absent;
          }

          return left.studentName.localeCompare(right.studentName);
        }),
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
        this.addAttendanceStatus(summary, item.status);

        return summary;
      },
      this.emptyAttendanceSummary(),
    );
  }

  private emptyAttendanceSummary(): AttendanceSummaryReport {
    return {
      total: 0,
      present: 0,
      sick: 0,
      excused: 0,
      absent: 0,
    };
  }

  private addAttendanceStatus(
    summary: AttendanceSummaryReport,
    status: AttendanceStatus,
  ) {
    summary.total += 1;

    if (status === AttendanceStatus.PRESENT) {
      summary.present += 1;
    }

    if (status === AttendanceStatus.SICK) {
      summary.sick += 1;
    }

    if (status === AttendanceStatus.EXCUSED) {
      summary.excused += 1;
    }

    if (status === AttendanceStatus.ABSENT) {
      summary.absent += 1;
    }
  }

  private getStudentRisk(summary: AttendanceSummaryReport) {
    if (summary.absent >= 3) {
      return {
        riskLevel: 'HIGH' as const,
        riskReason: `Alpha ${summary.absent} kali pada rentang ini`,
      };
    }

    if (summary.absent >= 1 || summary.sick + summary.excused >= 4) {
      return {
        riskLevel: 'MEDIUM' as const,
        riskReason:
          summary.absent >= 1
            ? `Alpha ${summary.absent} kali pada rentang ini`
            : `Sakit/izin ${summary.sick + summary.excused} kali pada rentang ini`,
      };
    }

    return {
      riskLevel: 'LOW' as const,
      riskReason: summary.total > 0 ? 'Kehadiran relatif aman' : 'Belum ada presensi pada rentang ini',
    };
  }

  private normalizeAttendanceStatus(status?: string) {
    if (!status) {
      return null;
    }

    const allowedStatuses: AttendanceStatus[] = [
      AttendanceStatus.PRESENT,
      AttendanceStatus.SICK,
      AttendanceStatus.EXCUSED,
      AttendanceStatus.ABSENT,
    ];

    if (!allowedStatuses.includes(status as AttendanceStatus)) {
      throw new BadRequestException('Status presensi tidak valid');
    }

    return status as AttendanceStatus;
  }

  private getTodayRange() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return { startOfDay, endOfDay };
  }

  private getSchoolTodayRange() {
    const timezoneOffsetMinutes = this.getSchoolTimezoneOffsetMinutes();
    const localNow = new Date(Date.now() + timezoneOffsetMinutes * 60_000);
    const dateOnly = new Date(Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate(),
    ));
    const nextDateOnly = new Date(dateOnly);
    nextDateOnly.setUTCDate(nextDateOnly.getUTCDate() + 1);

    const startOfDay = new Date(dateOnly.getTime() - timezoneOffsetMinutes * 60_000);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    return { dateOnly, nextDateOnly, startOfDay, endOfDay };
  }

  private getSchoolTimezoneOffsetMinutes() {
    const configuredOffset = Number(process.env.SCHOOL_TIMEZONE_OFFSET_MINUTES ?? 420);

    return Number.isFinite(configuredOffset) ? configuredOffset : 420;
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
    const deadline = this.getAgendaDeadline(agendaDate, scheduleEndsAt);
    return Boolean(deadline && submittedAt && submittedAt.getTime() > deadline.getTime());
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

  private formatUtcDateOnly(date: Date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
