import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AttendanceStatus,
  NotificationStatus,
  StudentLeaveRequestStatus,
  StudentLeaveRequestType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateStudentLeaveRequestDto } from './dto/create-student-leave-request.dto';
import { ReviewStudentLeaveRequestDto } from './dto/review-student-leave-request.dto';

@Injectable()
export class StudentLeavesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getMine(userId: string) {
    const { guardianIds } = await this.getGuardianScope(userId);

    return {
      data: await this.prisma.studentLeaveRequest.findMany({
        where: { guardianId: { in: guardianIds }, deletedAt: null },
        include: this.includeLeaveRequest(),
        orderBy: [{ createdAt: 'desc' }],
      }),
    };
  }

  async createMine(userId: string, dto: CreateStudentLeaveRequestDto) {
    const { guardianIds, user } = await this.getGuardianScope(userId);
    const dateFrom = this.toDateOnly(dto.dateFrom);
    const dateTo = this.toDateOnly(dto.dateTo);

    if (dateTo < dateFrom) {
      throw new BadRequestException('Tanggal akhir tidak boleh sebelum tanggal awal');
    }

    const relation = await this.prisma.studentGuardian.findFirst({
      where: {
        studentId: dto.studentId,
        guardianId: { in: guardianIds },
        deletedAt: null,
        student: { deletedAt: null, isActive: true },
      },
      include: {
        guardian: true,
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
    });

    if (!relation) {
      throw new NotFoundException('Siswa tidak terhubung dengan akun wali murid ini');
    }

    const existing = await this.prisma.studentLeaveRequest.findFirst({
      where: {
        studentId: dto.studentId,
        status: StudentLeaveRequestStatus.PENDING,
        deletedAt: null,
        dateFrom: { lte: dateTo },
        dateTo: { gte: dateFrom },
      },
    });

    if (existing) {
      throw new BadRequestException('Masih ada pengajuan izin/sakit pending pada rentang tanggal tersebut');
    }

    const request = await this.prisma.studentLeaveRequest.create({
      data: {
        studentId: dto.studentId,
        guardianId: relation.guardianId,
        requestedById: userId,
        dateFrom,
        dateTo,
        type: dto.type,
        reason: dto.reason.trim(),
      },
      include: this.includeLeaveRequest(),
    });

    await Promise.all([
      this.createReviewerInbox(request),
      this.audit.record({
        action: 'student-leave.requested',
        entityType: 'StudentLeaveRequest',
        entityId: request.id,
        after: request,
        userId,
      }),
    ]);

    return {
      data: request,
      message: `Pengajuan ${this.getLeaveTypeLabel(dto.type)} untuk ${relation.student.name} dikirim.`,
    };
  }

  async getReviewQueue(userId: string, roles: string[]) {
    const where = await this.getReviewWhere(userId, roles);

    return {
      data: await this.prisma.studentLeaveRequest.findMany({
        where,
        include: this.includeLeaveRequest(),
        orderBy: [{ createdAt: 'desc' }],
      }),
    };
  }

  async review(userId: string, roles: string[], id: string, dto: ReviewStudentLeaveRequestDto) {
    const reviewStatuses: StudentLeaveRequestStatus[] = [
      StudentLeaveRequestStatus.APPROVED,
      StudentLeaveRequestStatus.REJECTED,
    ];

    if (!reviewStatuses.includes(dto.status)) {
      throw new BadRequestException('Status review harus APPROVED atau REJECTED');
    }

    const where = await this.getReviewWhere(userId, roles, id);
    const request = await this.prisma.studentLeaveRequest.findFirst({
      where,
      include: this.includeLeaveRequest(),
    });

    if (!request) {
      throw new NotFoundException('Pengajuan izin tidak ditemukan');
    }

    if (request.status !== StudentLeaveRequestStatus.PENDING) {
      throw new BadRequestException('Pengajuan ini sudah direview');
    }

    const reviewed = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.studentLeaveRequest.update({
        where: { id },
        data: {
          status: dto.status,
          reviewedById: userId,
          reviewedAt: new Date(),
          reviewNote: dto.reviewNote?.trim() || null,
        },
        include: this.includeLeaveRequest(),
      });

      if (dto.status === StudentLeaveRequestStatus.APPROVED) {
        await this.applyApprovedLeave(tx, request);
      }

      return updated;
    });

    await Promise.all([
      this.createParentReviewInbox(reviewed),
      this.audit.record({
        action: dto.status === StudentLeaveRequestStatus.APPROVED
          ? 'student-leave.approved'
          : 'student-leave.rejected',
        entityType: 'StudentLeaveRequest',
        entityId: reviewed.id,
        before: request,
        after: reviewed,
        userId,
      }),
    ]);

    return {
      data: reviewed,
      message: dto.status === StudentLeaveRequestStatus.APPROVED
        ? 'Pengajuan izin/sakit disetujui.'
        : 'Pengajuan izin/sakit ditolak.',
    };
  }

  private async getGuardianScope(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const guardians = await this.prisma.guardian.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { email: user.email },
          ...(user.username ? [{ email: user.username }] : []),
        ],
      },
      select: { id: true },
    });

    if (!guardians.length) {
      throw new NotFoundException('Data wali murid belum terhubung ke akun ini');
    }

    return { user, guardianIds: guardians.map((guardian) => guardian.id) };
  }

  private async getReviewWhere(userId: string, roles: string[], id?: string) {
    const base = {
      ...(id ? { id } : {}),
      deletedAt: null,
      status: StudentLeaveRequestStatus.PENDING,
    };

    if (roles.includes('operator_sekolah')) {
      return base;
    }

    const teacher = await this.prisma.teacher.findFirst({
      where: { userId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (!teacher) {
      return { ...base, id: '__NO_ACCESS__' };
    }

    return {
      ...base,
      student: {
        enrollments: {
          some: {
            isActive: true,
            deletedAt: null,
            class: { homeroomTeacherId: teacher.id },
          },
        },
      },
    };
  }

  private async applyApprovedLeave(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    request: Awaited<ReturnType<PrismaService['studentLeaveRequest']['findFirstOrThrow']>>,
  ) {
    const status = request.type === StudentLeaveRequestType.SICK
      ? AttendanceStatus.SICK
      : AttendanceStatus.EXCUSED;

    await tx.attendanceItem.updateMany({
      where: {
        studentId: request.studentId,
        attendance: {
          agenda: {
            date: {
              gte: request.dateFrom,
              lte: request.dateTo,
            },
          },
        },
      },
      data: {
        status,
        notes: request.reason,
      },
    });
  }

  private async createReviewerInbox(request: {
    id: string;
    reason: string;
    student: { name: string; enrollments: Array<{ class: { name: string; homeroomTeacher?: { user?: { id: string; name: string; email: string } | null } | null } }> };
    guardian: { name: string };
  }) {
    const operators = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role: { name: 'operator_sekolah' } } },
      },
      select: { id: true, name: true, email: true },
    });
    const homeroomUser = request.student.enrollments[0]?.class.homeroomTeacher?.user;
    const recipients = [...operators, ...(homeroomUser ? [homeroomUser] : [])];
    const uniqueRecipients = Array.from(new Map(recipients.map((recipient) => [recipient.id, recipient])).values());
    const className = request.student.enrollments[0]?.class.name ?? 'kelas aktif';
    const message = `${request.guardian.name} mengajukan izin/sakit untuk ${request.student.name} (${className}). Alasan: ${request.reason}`;

    await Promise.all(uniqueRecipients.map((recipient) =>
      this.prisma.notificationLog.upsert({
        where: { dedupeKey: `student-leave.requested.${request.id}.${recipient.id}` },
        update: {
          readAt: null,
          status: NotificationStatus.SENT,
          recipient: recipient.email,
          recipientUserId: recipient.id,
          recipientName: recipient.name,
          subject: 'Pengajuan izin/sakit siswa',
          message,
          templateKey: 'student-leave.requested',
          entityType: 'StudentLeaveRequest',
          entityId: request.id,
          actionUrl: this.getReviewerActionUrl(recipient.id, operators),
          sentAt: new Date(),
        },
        create: {
          channel: 'IN_APP',
          status: NotificationStatus.SENT,
          recipient: recipient.email,
          recipientUserId: recipient.id,
          recipientName: recipient.name,
          subject: 'Pengajuan izin/sakit siswa',
          message,
          templateKey: 'student-leave.requested',
          dedupeKey: `student-leave.requested.${request.id}.${recipient.id}`,
          entityType: 'StudentLeaveRequest',
          entityId: request.id,
          actionUrl: this.getReviewerActionUrl(recipient.id, operators),
          attempts: 1,
          sentAt: new Date(),
        },
      }),
    ));
  }

  private async createParentReviewInbox(request: {
    id: string;
    status: StudentLeaveRequestStatus;
    reviewNote: string | null;
    student: { name: string };
    guardian: { name: string; email: string | null; phone: string | null };
    requestedBy?: { id: string; name: string; email: string } | null;
  }) {
    const recipient = request.guardian.email ?? request.guardian.phone;

    if (!recipient && !request.requestedBy) {
      return;
    }

    const approved = request.status === StudentLeaveRequestStatus.APPROVED;
    const message = `Pengajuan izin/sakit ${request.student.name} ${approved ? 'disetujui' : 'ditolak'}.${request.reviewNote ? ` Catatan: ${request.reviewNote}` : ''}`;

    await this.prisma.notificationLog.upsert({
      where: { dedupeKey: `student-leave.reviewed.${request.id}` },
      update: {
        readAt: null,
        status: NotificationStatus.SENT,
        recipient: recipient ?? request.requestedBy!.email,
        recipientUserId: request.requestedBy?.id ?? null,
        recipientName: request.requestedBy?.name ?? request.guardian.name,
        subject: approved ? 'Pengajuan izin disetujui' : 'Pengajuan izin ditolak',
        message,
        templateKey: approved ? 'student-leave.approved' : 'student-leave.rejected',
        entityType: 'StudentLeaveRequest',
        entityId: request.id,
        actionUrl: '/parent/permits',
        sentAt: new Date(),
      },
      create: {
        channel: 'IN_APP',
        status: NotificationStatus.SENT,
        recipient: recipient ?? request.requestedBy!.email,
        recipientUserId: request.requestedBy?.id ?? null,
        recipientName: request.requestedBy?.name ?? request.guardian.name,
        subject: approved ? 'Pengajuan izin disetujui' : 'Pengajuan izin ditolak',
        message,
        templateKey: approved ? 'student-leave.approved' : 'student-leave.rejected',
        dedupeKey: `student-leave.reviewed.${request.id}`,
        entityType: 'StudentLeaveRequest',
        entityId: request.id,
        actionUrl: '/parent/permits',
        attempts: 1,
        sentAt: new Date(),
      },
    });
  }

  private getReviewerActionUrl(userId: string, operators: Array<{ id: string }>) {
    return operators.some((operator) => operator.id === userId)
      ? '/admin/leave-requests'
      : '/homeroom/leave-requests';
  }

  private includeLeaveRequest() {
    return {
      student: {
        include: {
          enrollments: {
            where: { deletedAt: null, isActive: true },
            include: { class: { include: { homeroomTeacher: { include: { user: true } } } }, schoolYear: true },
            orderBy: { createdAt: 'desc' as const },
          },
        },
      },
      guardian: true,
      requestedBy: true,
      reviewedBy: true,
    };
  }

  private getLeaveTypeLabel(type: StudentLeaveRequestType) {
    return type === StudentLeaveRequestType.SICK ? 'sakit' : 'izin';
  }

  private toDateOnly(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Format tanggal tidak valid');
    }

    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
}
