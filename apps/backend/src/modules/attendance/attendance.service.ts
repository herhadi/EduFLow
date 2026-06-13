import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AgendaStatus, AttendanceState, AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueProducerService } from '../../queue/queue-producer.service';
import { AuditService } from '../audit/audit.service';
import { OpenClassDto } from './dto/open-class.dto';
import { SubmitAttendanceDto } from './dto/submit-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueProducer: QueueProducerService,
    private readonly auditService: AuditService,
  ) {}

  async getAttendance(id: string, userId: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        agenda: { include: { class: true, subject: true, teacher: true } },
        items: {
          include: {
            student: true,
            enrollment: { include: { class: true } },
          },
          orderBy: { student: { name: 'asc' } },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance tidak ditemukan');
    }

    await this.ensureTeacherOwnsAgenda(userId, attendance.agenda.teacher.id);

    return { data: attendance };
  }

  async openClass(dto: OpenClassDto, userId: string) {
    const agenda = await this.prisma.dailyAgenda.findUnique({
      where: { id: dto.agendaId },
      include: { attendance: true },
    });

    if (!agenda) {
      throw new NotFoundException('Agenda tidak ditemukan');
    }


    await this.ensureTeacherOwnsAgenda(userId, agenda.teacherId);

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        classId: agenda.classId,
        schoolYearId: agenda.schoolYearId,
        isActive: true,
        deletedAt: null,
      },
      include: { student: true },
      orderBy: { student: { name: 'asc' } },
    });

    if (!enrollments.length) {
      throw new BadRequestException('Tidak ada siswa aktif di kelas ini');
    }

    const attendance = await this.prisma.$transaction(async (tx) => {
      const openedAttendance = await tx.attendance.upsert({
        where: { agendaId: agenda.id },
        create: {
          agendaId: agenda.id,
          classId: agenda.classId,
          state: AttendanceState.DRAFT,
          startedAt: new Date(),
          items: {
            create: enrollments.map((enrollment) => ({
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
        include: {
          items: { include: { student: true, enrollment: true } },
        },
      });

      await tx.dailyAgenda.update({
        where: { id: agenda.id },
        data: { status: AgendaStatus.IN_PROGRESS },
      });

      return openedAttendance;
    });

    await this.auditService.record({
      action: 'attendance.opened',
      entityType: 'Attendance',
      entityId: attendance.id,
      after: {
        attendanceId: attendance.id,
        agendaId: agenda.id,
        classId: agenda.classId,
        itemCount: attendance.items.length,
      },
    });

    return {
      data: attendance,
      message: 'Kelas dibuka dan attendance siap diisi.',
    };
  }

  async submit(dto: SubmitAttendanceDto, userId: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: dto.attendanceId },
      include: { agenda: true },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance tidak ditemukan');
    }


    await this.ensureTeacherOwnsAgenda(userId, attendance.agenda.teacherId);

    if (attendance.state !== AttendanceState.DRAFT) {
      throw new BadRequestException('Attendance tidak dalam state DRAFT');
    }

    const submittedAttendance = await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        await tx.attendanceItem.update({
          where: { id: item.attendanceItemId },
          data: {
            status: item.status,
            notes: item.notes,
          },
        });
      }

      const updatedAttendance = await tx.attendance.update({
        where: { id: attendance.id },
        data: {
          state: AttendanceState.SUBMITTED,
          submittedAt: new Date(),
          submittedById: userId,
          endedAt: new Date(),
          notes: dto.notes,
        },
        include: { items: true },
      });

      await tx.dailyAgenda.update({
        where: { id: attendance.agendaId },
        data: { status: AgendaStatus.COMPLETED },
      });

      return updatedAttendance;
    });

    const summaryJob = await this.queueProducer.addAttendanceSummaryDaily({
      agendaId: attendance.agendaId,
      attendanceId: attendance.id,
      classId: attendance.classId,
      schoolYearId: attendance.agenda.schoolYearId,
    });

    await this.auditService.record({
      action: 'attendance.submitted',
      entityType: 'Attendance',
      entityId: submittedAttendance.id,
      before: {
        state: attendance.state,
      },
      after: {
        state: submittedAttendance.state,
        itemCount: submittedAttendance.items.length,
        summaryJobId: summaryJob.id,
      },
    });

    return {
      data: {
        attendance: submittedAttendance,
        summaryJob: {
          id: summaryJob.id,
          name: summaryJob.name,
          queue: summaryJob.queueName,
        },
      },
      message: 'Attendance disubmit dan summary job terkirim.',
    };
  }

  private async ensureTeacherOwnsAgenda(userId: string, teacherId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, userId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (!teacher) {
      throw new BadRequestException('Agenda ini bukan milik guru yang sedang login');
    }
  }
}
