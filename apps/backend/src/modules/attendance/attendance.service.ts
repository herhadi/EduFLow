import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import {
  AgendaStatus,
  AttendanceState,
  AttendanceStatus,
  Prisma,
  StudentLeaveRequestStatus,
  StudentLeaveRequestType,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { STORAGE_PROVIDER, StorageProvider } from '../../infrastructure/storage/storage-provider';
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
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async getAttendance(id: string, userId: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        agenda: { include: { class: true, subject: true, teacher: true, substituteTeacher: true } },
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

    await this.ensureTeacherOwnsAgenda(userId, attendance.agenda);

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

    await this.ensureTeacherOwnsAgenda(userId, agenda);

    if (agenda.attendance?.submittedAt || this.isSubmittedState(agenda.attendance?.state)) {
      throw new BadRequestException('Presensi agenda ini sudah disubmit');
    }

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
      const leaveMap = await this.getApprovedLeaveMap(
        tx,
        agenda.date,
        enrollments.map((enrollment) => enrollment.studentId),
      );

      const openedAttendance = await tx.attendance.upsert({
        where: { agendaId: agenda.id },
        create: {
          agendaId: agenda.id,
          classId: agenda.classId,
          state: AttendanceState.DRAFT,
          startedAt: new Date(),
          items: {
            create: enrollments.map((enrollment) => {
              const leave = leaveMap.get(enrollment.studentId);

              return {
                studentId: enrollment.studentId,
                enrollmentId: enrollment.id,
                status: leave?.status ?? AttendanceStatus.PRESENT,
                notes: leave?.reason,
              };
            }),
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

      await this.applyApprovedLeavesToAttendance(
        tx,
        openedAttendance.id,
        agenda.date,
        enrollments.map((enrollment) => enrollment.studentId),
      );

      await tx.dailyAgenda.update({
        where: { id: agenda.id },
        data: { status: AgendaStatus.IN_PROGRESS },
      });

      return tx.attendance.findUniqueOrThrow({
        where: { id: openedAttendance.id },
        include: {
          items: {
            include: { student: true, enrollment: true },
            orderBy: { student: { name: 'asc' } },
          },
        },
      });
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

    await this.ensureTeacherOwnsAgenda(userId, attendance.agenda);

    if (attendance.submittedAt || this.isSubmittedState(attendance.state)) {
      throw new BadRequestException('Attendance sudah pernah disubmit');
    }

    if (attendance.state !== AttendanceState.DRAFT) {
      throw new BadRequestException('Attendance tidak dalam state DRAFT');
    }

    const submittedAttendance = await this.prisma.$transaction(async (tx) => {
      const existingItems = await tx.attendanceItem.findMany({
        where: { attendanceId: attendance.id },
        select: { id: true, studentId: true },
      });
      const studentIdByItemId = new Map(
        existingItems.map((item) => [item.id, item.studentId]),
      );
      const leaveMap = await this.getApprovedLeaveMap(
        tx,
        attendance.agenda.date,
        existingItems.map((item) => item.studentId),
      );

      for (const item of dto.items) {
        const studentId = studentIdByItemId.get(item.attendanceItemId);
        const leave = studentId ? leaveMap.get(studentId) : undefined;

        await tx.attendanceItem.update({
          where: { id: item.attendanceItemId },
          data: {
            status: leave?.status ?? item.status,
            notes: leave?.reason ?? item.notes,
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
          teacherPresent: dto.teacherPresent ?? true,
          studentAttendanceDone: dto.studentAttendanceDone ?? true,
          materialFilled: dto.materialFilled ?? false,
          classPhotoDone: dto.classPhotoDone ?? Boolean(attendance.classPhotoKey),
          issueNotes: dto.issueNotes?.trim() || null,
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

  async uploadClassPhoto(
    attendanceId: string,
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { agenda: true },
    });
    if (!attendance) throw new NotFoundException('Attendance tidak ditemukan');
    await this.ensureTeacherOwnsAgenda(userId, attendance.agenda);
    if (attendance.state !== AttendanceState.DRAFT) throw new BadRequestException('Foto kelas hanya dapat diunggah saat presensi dibuka');

    const key = `attendance/${attendance.agendaId}/${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    const stored = await this.storage.upload({ buffer: file.buffer, key, name: file.originalname, mimeType: file.mimetype });
    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        classPhotoKey: stored.key,
        classPhotoName: stored.name,
        classPhotoMimeType: stored.mimeType,
        classPhotoSize: stored.size,
        classPhotoUploadedAt: new Date(),
      },
      include: {
        items: { include: { student: true, enrollment: true } },
      },
    });
    if (attendance.classPhotoKey) await this.storage.delete(attendance.classPhotoKey).catch(() => undefined);
    await this.auditService.record({ action: 'attendance.class-photo-uploaded', entityType: 'Attendance', entityId: attendance.id, before: attendance, after: updated, userId });
    return { data: updated, message: 'Foto kelas berhasil diunggah.' };
  }

  private async ensureTeacherOwnsAgenda(
    userId: string,
    agenda: { teacherId: string; substituteTeacherId?: string | null },
  ) {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        userId,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });

    if (!teacher) {
      throw new BadRequestException('Agenda ini bukan milik guru yang sedang login');
    }

    const activeTeacherId = agenda.substituteTeacherId ?? agenda.teacherId;

    if (teacher.id !== activeTeacherId) {
      throw new BadRequestException('Presensi agenda ini dialihkan ke guru pengganti');
    }
  }

  private isSubmittedState(state?: AttendanceState | null) {
    const submittedStates: AttendanceState[] = [
      AttendanceState.SUBMITTED,
      AttendanceState.APPROVED,
      AttendanceState.CORRECTED,
      AttendanceState.LOCKED,
    ];

    return Boolean(state && submittedStates.includes(state));
  }

  private getLeaveAttendanceStatus(type: StudentLeaveRequestType) {
    return type === StudentLeaveRequestType.SICK
      ? AttendanceStatus.SICK
      : AttendanceStatus.EXCUSED;
  }

  private async getApprovedLeaveMap(
    tx: Prisma.TransactionClient,
    date: Date,
    studentIds: string[],
  ) {
    const leaveMap = new Map<string, { status: AttendanceStatus; reason: string }>();

    if (!studentIds.length) {
      return leaveMap;
    }

    const leaves = await tx.studentLeaveRequest.findMany({
      where: {
        deletedAt: null,
        status: StudentLeaveRequestStatus.APPROVED,
        studentId: { in: studentIds },
        dateFrom: { lte: date },
        dateTo: { gte: date },
      },
      select: {
        studentId: true,
        type: true,
        reason: true,
      },
      orderBy: { reviewedAt: 'desc' },
    });

    for (const leave of leaves) {
      if (leaveMap.has(leave.studentId)) continue;

      leaveMap.set(leave.studentId, {
        status: this.getLeaveAttendanceStatus(leave.type),
        reason: leave.reason,
      });
    }

    return leaveMap;
  }

  private async applyApprovedLeavesToAttendance(
    tx: Prisma.TransactionClient,
    attendanceId: string,
    date: Date,
    studentIds: string[],
  ) {
    const leaveMap = await this.getApprovedLeaveMap(tx, date, studentIds);

    await Promise.all(
      Array.from(leaveMap.entries()).map(([studentId, leave]) =>
        tx.attendanceItem.updateMany({
          where: { attendanceId, studentId },
          data: {
            status: leave.status,
            notes: leave.reason,
          },
        }),
      ),
    );
  }
}
