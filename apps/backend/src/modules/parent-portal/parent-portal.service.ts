import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
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

    const guardian = await this.prisma.guardian.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { phone: normalizedContact },
          { telegramId: normalizedContact },
          { email: normalizedContact },
        ],
      },
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

    if (!guardian) {
      throw new NotFoundException('Data wali murid tidak ditemukan');
    }

    const studentIds = guardian.students.map((relation) => relation.studentId);
    const today = this.getTodayRange();
    const historyRange = this.getHistoryRange(30);

    const [todayItems, historyItems] = await Promise.all([
      this.prisma.attendanceItem.findMany({
        where: {
          studentId: { in: studentIds },
          attendance: {
            agenda: { date: { gte: today.startOfDay, lt: today.endOfDay } },
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
              date: { gte: historyRange.startOfDay, lt: historyRange.endOfDay },
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
    ]);

    const students = guardian.students.map((relation) => {
      const studentTodayItems = todayItems.filter(
        (item) => item.studentId === relation.studentId,
      );
      const studentHistoryItems = historyItems.filter(
        (item) => item.studentId === relation.studentId,
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
      };
    });

    return {
      data: {
        guardian: {
          id: guardian.id,
          name: guardian.name,
          phone: guardian.phone,
          telegramId: guardian.telegramId,
          email: guardian.email,
        },
        date: this.formatDateOnly(today.startOfDay),
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

  private getTodayRange() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return { startOfDay, endOfDay };
  }

  private getHistoryRange(days: number) {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const startOfDay = new Date(endOfDay);
    startOfDay.setDate(startOfDay.getDate() - days);
    startOfDay.setHours(0, 0, 0, 0);

    return { startOfDay, endOfDay };
  }

  private formatDateOnly(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
