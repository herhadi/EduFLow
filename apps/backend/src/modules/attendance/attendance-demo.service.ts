import { Injectable } from '@nestjs/common';
import { AgendaStatus, AttendanceState, AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueProducerService } from '../../queue/queue-producer.service';

@Injectable()
export class AttendanceDemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueProducer: QueueProducerService,
  ) {}

  async runTeacherFlow() {
    const demo = await this.ensureDemoData();
    const steps: string[] = [];

    const reminderJob = await this.queueProducer.addTeacherReminderBeforeClass({
      agendaId: demo.agenda.id,
      teacherId: demo.teacher.id,
      classId: demo.class.id,
    });
    steps.push('Guru mendapat reminder');

    const attendance = await this.prisma.attendance.upsert({
      where: { agendaId: demo.agenda.id },
      create: {
        agendaId: demo.agenda.id,
        classId: demo.class.id,
        state: AttendanceState.DRAFT,
        startedAt: new Date(),
        items: {
          create: demo.enrollments.map((enrollment) => ({
            studentId: enrollment.studentId,
            enrollmentId: enrollment.id,
            status: AttendanceStatus.PRESENT,
          })),
        },
      },
      update: {
        state: AttendanceState.DRAFT,
        startedAt: new Date(),
      },
      include: { items: true },
    });

    await this.prisma.dailyAgenda.update({
      where: { id: demo.agenda.id },
      data: { status: AgendaStatus.IN_PROGRESS },
    });
    steps.push('Guru buka kelas');
    steps.push('Attendance terbuat');

    const submittedAttendance = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        state: AttendanceState.SUBMITTED,
        submittedAt: new Date(),
        endedAt: new Date(),
      },
      include: { items: true },
    });

    await this.prisma.dailyAgenda.update({
      where: { id: demo.agenda.id },
      data: { status: AgendaStatus.COMPLETED },
    });
    steps.push('Guru submit');

    const summaryJob = await this.queueProducer.addAttendanceSummaryDaily({
      agendaId: demo.agenda.id,
      attendanceId: submittedAttendance.id,
      classId: demo.class.id,
      schoolYearId: demo.schoolYear.id,
    });
    steps.push('Summary terkirim');
    steps.push('SELESAI');

    return {
      data: {
        steps,
        reminderJob: {
          id: reminderJob.id,
          name: reminderJob.name,
          queue: reminderJob.queueName,
        },
        attendance: {
          id: submittedAttendance.id,
          state: submittedAttendance.state,
          itemCount: submittedAttendance.items.length,
        },
        summaryJob: {
          id: summaryJob.id,
          name: summaryJob.name,
          queue: summaryJob.queueName,
        },
      },
      message: 'Demo alur guru sampai summary selesai.',
    };
  }

  private async ensureDemoData() {
    const schoolYear = await this.prisma.schoolYear.upsert({
      where: { name: '2026/2027' },
      create: {
        name: '2026/2027',
        startsAt: new Date('2026-07-01T00:00:00.000Z'),
        endsAt: new Date('2027-06-30T00:00:00.000Z'),
      },
      update: {},
    });

    const semester = await this.prisma.semester.upsert({
      where: {
        schoolYearId_type: {
          schoolYearId: schoolYear.id,
          type: 'ODD',
        },
      },
      create: {
        schoolYearId: schoolYear.id,
        type: 'ODD',
        startsAt: new Date('2026-07-01T00:00:00.000Z'),
        endsAt: new Date('2026-12-20T00:00:00.000Z'),
      },
      update: {},
    });

    const schoolClass = await this.prisma.class.upsert({
      where: {
        schoolYearId_name: {
          schoolYearId: schoolYear.id,
          name: 'VII-A',
        },
      },
      create: {
        schoolYearId: schoolYear.id,
        name: 'VII-A',
        grade: 'VII',
      },
      update: {},
    });

    const subject = await this.prisma.subject.upsert({
      where: { code: 'MAT' },
      create: { name: 'Matematika', code: 'MAT' },
      update: {},
    });

    const teacher = await this.prisma.teacher.create({
      data: { name: `Guru Demo ${Date.now()}` },
    });

    const schedule = await this.prisma.schedule.create({
      data: {
        schoolYearId: schoolYear.id,
        semesterId: semester.id,
        classId: schoolClass.id,
        subjectId: subject.id,
        teacherId: teacher.id,
        dayOfWeek: 1,
        startsAt: '07:00',
        endsAt: '08:30',
      },
    });

    const agenda = await this.prisma.dailyAgenda.create({
      data: {
        scheduleId: schedule.id,
        schoolYearId: schoolYear.id,
        semesterId: semester.id,
        classId: schoolClass.id,
        subjectId: subject.id,
        teacherId: teacher.id,
        date: new Date(),
      },
    });

    const students = await Promise.all(
      ['Alya Demo', 'Bima Demo', 'Citra Demo'].map((name) =>
        this.prisma.student.create({ data: { name } }),
      ),
    );

    const enrollments = await Promise.all(
      students.map((student) =>
        this.prisma.studentEnrollment.create({
          data: {
            studentId: student.id,
            classId: schoolClass.id,
            schoolYearId: schoolYear.id,
          },
        }),
      ),
    );

    return {
      schoolYear,
      semester,
      class: schoolClass,
      subject,
      teacher,
      schedule,
      agenda,
      students,
      enrollments,
    };
  }
}
