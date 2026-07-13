import { Injectable, NotFoundException } from '@nestjs/common';
import { AssessmentStatus, AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type AttendanceSummary = {
  present: number;
  sick: number;
  excused: number;
  absent: number;
  total: number;
};

@Injectable()
export class ParentPortalService {
  constructor(private readonly prisma: PrismaService) {}

  async getPortalByContact(contact: string) {
    const normalizedContact = contact.trim();

    if (!normalizedContact) {
      throw new NotFoundException('Kontak wali murid tidak ditemukan');
    }

    const guardians = await this.prisma.guardian.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { phone: normalizedContact },
          { email: normalizedContact },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        students: {
          where: { deletedAt: null },
          include: {
            student: {
              include: {
                enrollments: {
                  where: { deletedAt: null, isActive: true },
                  include: { class: true, schoolYear: true },
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    const guardian = guardians[0];

    if (!guardian) {
      throw new NotFoundException('Data wali murid tidak ditemukan');
    }

    const guardianStudents = guardians.flatMap((entry) => entry.students);
    const uniqueStudentRelations = Array.from(
      new Map(guardianStudents.map((relation) => [relation.studentId, relation])).values(),
    ).sort((left, right) => {
      if (left.isPrimary !== right.isPrimary) {
        return left.isPrimary ? -1 : 1;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    });
    const studentIds = uniqueStudentRelations.map((relation) => relation.studentId);
    const today = this.getSchoolTodayRange();
    const historyRange = this.getSchoolHistoryRange(30);

    const [todayItems, historyItems, gradeScores] = await Promise.all([
      this.prisma.attendanceItem.findMany({
        where: {
          studentId: { in: studentIds },
          attendance: {
            agenda: { date: { gte: today.dateOnly, lt: today.nextDateOnly } },
          },
        },
        include: {
          attendance: {
            include: {
              agenda: {
                include: { class: true, subject: true, teacher: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.attendanceItem.findMany({
        where: {
          studentId: { in: studentIds },
          attendance: {
            agenda: {
              date: { gte: historyRange.startDateOnly, lt: historyRange.nextDateOnly },
            },
          },
        },
        include: {
          attendance: {
            include: {
              agenda: {
                include: { class: true, subject: true, teacher: true },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 100,
      }),
      this.prisma.assessmentScore.findMany({
        where: {
          studentId: { in: studentIds },
          score: { not: null },
          assessment: {
            status: { in: [AssessmentStatus.SUBMITTED, AssessmentStatus.LOCKED] },
            deletedAt: null,
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
        },
        orderBy: [{ assessment: { assessmentDate: 'desc' } }],
        take: 100,
      }),
    ]);

    const students = uniqueStudentRelations.map((relation) => {
      const studentTodayItems = todayItems.filter(
        (item) => item.studentId === relation.studentId,
      );
      const studentHistoryItems = historyItems.filter(
        (item) => item.studentId === relation.studentId,
      );
      const studentGradeScores = gradeScores.filter(
        (score) => score.studentId === relation.studentId,
      );
      const activeEnrollment = relation.student.enrollments[0] ?? null;

      return {
        id: relation.student.id,
        name: relation.student.name,
        nis: relation.student.nis,
        nisn: relation.student.nisn,
        relation: relation.relation,
        isPrimary: relation.isPrimary,
        activeClass: activeEnrollment
          ? {
              id: activeEnrollment.class.id,
              name: activeEnrollment.class.name,
              grade: activeEnrollment.class.grade,
              schoolYear: activeEnrollment.schoolYear.name,
            }
          : null,
        todaySummary: this.countAttendanceItems(studentTodayItems),
        dailySummary: studentTodayItems.map((item) =>
          this.toAttendanceRecord(item),
        ),
        history: studentHistoryItems.map((item) => this.toAttendanceRecord(item)),
        grades: this.toGradeSummary(studentGradeScores),
      };
    });

    return {
      data: {
        guardian: {
          id: guardian.id,
          name: guardian.name,
          phone: guardian.phone,
          email: guardian.email,
        },
        date: this.formatUtcDateOnly(today.dateOnly),
        summary: this.countAttendanceItems(todayItems),
        students,
      },
    };
  }

  private toAttendanceRecord(item: {
    id: string;
    status: AttendanceStatus;
    notes: string | null;
    attendance: {
      state: string;
      agenda: {
        date: Date;
        status: string;
        class: { name: string };
        subject: { name: string };
        teacher: { name: string };
      };
    };
  }) {
    return {
      id: item.id,
      date: this.formatDateOnly(item.attendance.agenda.date),
      className: item.attendance.agenda.class.name,
      subjectName: item.attendance.agenda.subject.name,
      teacherName: item.attendance.agenda.teacher.name,
      agendaStatus: item.attendance.agenda.status,
      attendanceState: item.attendance.state,
      status: item.status,
      notes: item.notes,
    };
  }

  private countAttendanceItems(
    items: Array<{ status: AttendanceStatus }>,
  ): AttendanceSummary {
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

        summary.total += 1;
        return summary;
      },
      { present: 0, sick: 0, excused: 0, absent: 0, total: 0 },
    );
  }

  private toGradeSummary(
    scores: Array<{
      id: string;
      score: unknown;
      notes: string | null;
      assessment: {
        title: string;
        type: string;
        assessmentDate: Date;
        maxScore: unknown;
        class: { name: string };
        subject: { name: string };
        teacher: { name: string };
      };
    }>,
  ) {
    const records = scores.map((score) => ({
      id: score.id,
      date: this.formatDateOnly(score.assessment.assessmentDate),
      title: score.assessment.title,
      type: score.assessment.type,
      className: score.assessment.class.name,
      subjectName: score.assessment.subject.name,
      teacherName: score.assessment.teacher.name,
      score: Number(score.score),
      maxScore: Number(score.assessment.maxScore),
      notes: score.notes,
    }));
    const averageScore = records.length
      ? Math.round((records.reduce((total, record) => total + record.score, 0) / records.length) * 100) / 100
      : null;

    return {
      available: records.length > 0,
      averageScore,
      latestScore: records[0]?.score ?? null,
      records: records.slice(0, 10),
    };
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

    return { dateOnly, nextDateOnly };
  }

  private getSchoolHistoryRange(days: number) {
    const { dateOnly, nextDateOnly } = this.getSchoolTodayRange();
    const startDateOnly = new Date(dateOnly);
    startDateOnly.setUTCDate(startDateOnly.getUTCDate() - days + 1);

    return { startDateOnly, nextDateOnly };
  }

  private getSchoolTimezoneOffsetMinutes() {
    const configuredOffset = Number(process.env.SCHOOL_TIMEZONE_OFFSET_MINUTES ?? 420);

    return Number.isFinite(configuredOffset) ? configuredOffset : 420;
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
