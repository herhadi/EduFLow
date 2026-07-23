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
import { NotificationService } from '../notification/notification.service';
import { OpenClassDto } from './dto/open-class.dto';
import { RequestLateAttendanceDto } from './dto/request-late-attendance.dto';
import { SubmitAttendanceDto } from './dto/submit-attendance.dto';

const schoolTimezoneOffsetMinutes = Number(process.env.SCHOOL_TIMEZONE_OFFSET_MINUTES ?? 420);

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueProducer: QueueProducerService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
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

    if (this.isPastSchoolDate(attendance.agenda.date)) {
      throw new BadRequestException('Presensi sudah melewati tanggal agenda. Ajukan koreksi/presensi terlambat ke Kepala Sekolah atau operator.');
    }

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

  async requestLateSubmit(attendanceId: string, userId: string, dto: RequestLateAttendanceDto) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        agenda: {
          include: {
            class: true,
            schedule: true,
            subject: true,
            teacher: true,
            substituteTeacher: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance tidak ditemukan');
    }

    await this.ensureTeacherOwnsAgenda(userId, attendance.agenda);

    if (!this.isPastSchoolDate(attendance.agenda.date)) {
      throw new BadRequestException('Presensi masih dapat diselesaikan hari ini tanpa pengajuan terlambat');
    }

    if (attendance.submittedAt || this.isSubmittedState(attendance.state)) {
      throw new BadRequestException('Attendance sudah pernah disubmit');
    }

    const teacherName = attendance.agenda.substituteTeacher?.name ?? attendance.agenda.teacher.name;
    const timeRange = this.formatScheduleRange(attendance.agenda.schedule?.startsAt, attendance.agenda.schedule?.endsAt);

    await this.notificationService.createLateAttendanceRequestInbox({
      agendaId: attendance.agendaId,
      attendanceId: attendance.id,
      className: attendance.agenda.class.name,
      reason: dto.reason,
      subjectName: attendance.agenda.subject.name,
      teacherName,
      timeRange,
    });

    await this.auditService.record({
      action: 'attendance.late-submit.requested',
      entityType: 'Attendance',
      entityId: attendance.id,
      after: {
        agendaId: attendance.agendaId,
        reason: dto.reason?.trim() || null,
      },
      userId,
    });

    return {
      data: { attendanceId: attendance.id, agendaId: attendance.agendaId },
      message: 'Pengajuan presensi terlambat dikirim ke Kepala Sekolah dan operator.',
    };
  }

  async uploadClassPhoto(
    attendanceId: string,
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    metadata?: Record<string, string | undefined>,
  ) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { agenda: true },
    });
    if (!attendance) throw new NotFoundException('Attendance tidak ditemukan');
    await this.ensureTeacherOwnsAgenda(userId, attendance.agenda);
    if (attendance.state !== AttendanceState.DRAFT) throw new BadRequestException('Foto kelas hanya dapat diunggah saat presensi dibuka');

    const key = `attendance/${attendance.agendaId}/${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    const stored = await this.storage.upload({
      buffer: file.buffer,
      disposition: 'inline',
      key,
      name: file.originalname,
      mimeType: file.mimetype,
    });
    const photoMetadata = this.normalizeClassPhotoMetadata(metadata);
    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        classPhotoKey: stored.key,
        classPhotoName: stored.name,
        classPhotoMimeType: stored.mimeType,
        classPhotoSize: stored.size,
        classPhotoUploadedAt: new Date(),
        classPhotoTakenAt: photoMetadata.takenAt,
        classPhotoLatitude: photoMetadata.latitude,
        classPhotoLongitude: photoMetadata.longitude,
        classPhotoAccuracy: photoMetadata.accuracy,
      },
      include: {
        items: { include: { student: true, enrollment: true } },
      },
    });
    if (attendance.classPhotoKey) await this.storage.delete(attendance.classPhotoKey).catch(() => undefined);
    await this.auditService.record({ action: 'attendance.class-photo-uploaded', entityType: 'Attendance', entityId: attendance.id, before: attendance, after: updated, userId });
    return { data: updated, message: 'Foto kelas berhasil diunggah.' };
  }

  private normalizeClassPhotoMetadata(metadata?: Record<string, string | undefined>) {
    const takenAt = metadata?.takenAt ? new Date(metadata.takenAt) : new Date();
    if (Number.isNaN(takenAt.getTime())) {
      throw new BadRequestException('Waktu pengambilan foto tidak valid');
    }

    const latitude = this.parseOptionalNumber(metadata?.latitude, 'Latitude foto kelas');
    const longitude = this.parseOptionalNumber(metadata?.longitude, 'Longitude foto kelas');
    const accuracy = this.parseOptionalNumber(metadata?.accuracy, 'Akurasi lokasi foto kelas');

    if (latitude !== null && (latitude < -90 || latitude > 90)) {
      throw new BadRequestException('Latitude foto kelas tidak valid');
    }
    if (longitude !== null && (longitude < -180 || longitude > 180)) {
      throw new BadRequestException('Longitude foto kelas tidak valid');
    }
    if (accuracy !== null && accuracy < 0) {
      throw new BadRequestException('Akurasi lokasi foto kelas tidak valid');
    }

    return {
      takenAt,
      latitude,
      longitude,
      accuracy,
    };
  }

  private parseOptionalNumber(value: string | undefined, label: string) {
    if (value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`${label} tidak valid`);
    }

    return parsed;
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

  private isPastSchoolDate(date: Date) {
    return date.getTime() < this.toSchoolDateOnly(new Date()).getTime();
  }

  private toSchoolDateOnly(value: Date) {
    const safeOffset = Number.isFinite(schoolTimezoneOffsetMinutes) ? schoolTimezoneOffsetMinutes : 420;
    const localDate = new Date(value.getTime() + safeOffset * 60_000);

    return new Date(Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate(),
    ));
  }

  private formatScheduleRange(startsAt?: string | null, endsAt?: string | null) {
    if (!startsAt || !endsAt) return 'jam belum tercatat';
    return `${startsAt.slice(0, 5)}-${endsAt.slice(0, 5)}`;
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
