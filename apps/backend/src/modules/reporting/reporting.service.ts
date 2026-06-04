import { Injectable } from '@nestjs/common';
import { AgendaStatus, AttendanceState, AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

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

  private formatDateOnly(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
