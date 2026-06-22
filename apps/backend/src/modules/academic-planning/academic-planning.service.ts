import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TeachingPlanStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { STORAGE_PROVIDER, StorageProvider } from '../../infrastructure/storage/storage-provider';
import { PERMISSIONS } from '../../common/constants/permissions';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { CreateTeachingPlanDto } from './dto/create-teaching-plan.dto';
import { ReviewTeachingPlanDto } from './dto/review-teaching-plan.dto';

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const BOOK_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class AcademicPlanningService {
  private readonly logger = new Logger(AcademicPlanningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notification: NotificationService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async getMine(userId: string) {
    const teacher = await this.getTeacher(userId);
    return { data: await this.prisma.teachingPlan.findMany({
      where: { teacherId: teacher.id, deletedAt: null },
      include: { subject: true, schoolYear: true, semester: true },
      orderBy: { updatedAt: 'desc' },
    }) };
  }

  async create(userId: string, dto: CreateTeachingPlanDto) {
    const teacher = await this.getTeacher(userId);
    const assignment = await this.prisma.teacherSubject.findUnique({
      where: { teacherId_subjectId: { teacherId: teacher.id, subjectId: dto.subjectId } },
    });
    if (!assignment) throw new BadRequestException('Mata pelajaran belum ditugaskan kepada guru ini');

    const plan = await this.prisma.teachingPlan.create({
      data: { ...dto, title: dto.title.trim(), teacherId: teacher.id },
      include: { subject: true, schoolYear: true, semester: true },
    });
    await this.audit.record({ action: 'teaching-plan.created', entityType: 'TeachingPlan', entityId: plan.id, after: plan, userId });
    return { data: plan, message: 'Perangkat ajar disimpan sebagai draft.' };
  }

  async submit(userId: string, id: string) {
    const teacher = await this.getTeacher(userId);
    const existing = await this.prisma.teachingPlan.findFirst({ where: { id, teacherId: teacher.id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Perangkat ajar tidak ditemukan');
    if (!['DRAFT', 'REVISION_REQUESTED'].includes(existing.status)) throw new BadRequestException('Perangkat ajar tidak dapat disubmit pada status ini');
    if (existing.type === 'TEACHING_BOOK' && !this.isBookPhoto(existing.attachmentMimeType)) {
      throw new BadRequestException('Foto buku KBM wajib diunggah sebelum perangkat ajar dikirim');
    }

    const plan = await this.prisma.teachingPlan.update({
      where: { id }, data: { status: TeachingPlanStatus.SUBMITTED, submittedAt: new Date(), reviewNote: null },
      include: { subject: true, schoolYear: true, semester: true },
    });
    await this.audit.record({ action: 'teaching-plan.submitted', entityType: 'TeachingPlan', entityId: id, before: existing, after: plan, userId });
    await this.notification.createPrincipalInbox({ entityId: id, teacherName: teacher.name, title: plan.title });
    return { data: plan, message: 'Perangkat ajar dikirim untuk review Kepala Sekolah.' };
  }

  async uploadAttachment(userId: string, id: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number }) {
    const teacher = await this.getTeacher(userId);
    const existing = await this.prisma.teachingPlan.findFirst({ where: { id, teacherId: teacher.id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Perangkat ajar tidak ditemukan');
    if (!['DRAFT', 'REVISION_REQUESTED'].includes(existing.status)) throw new BadRequestException('Dokumen hanya dapat diganti saat draft atau revisi');
    if (existing.type === 'TEACHING_BOOK' && !this.isBookPhoto(file.mimetype)) {
      throw new BadRequestException('Buku KBM harus menggunakan foto JPEG, PNG, atau WebP');
    }
    if (existing.type !== 'TEACHING_BOOK' && file.mimetype !== DOCX_MIME_TYPE) {
      throw new BadRequestException('Perangkat ajar selain Buku KBM harus menggunakan dokumen DOCX');
    }

    const extension = extname(file.originalname).toLowerCase();
    const key = `teaching-plans/${teacher.id}/${id}/${randomUUID()}${extension}`;
    const stored = await this.storage.upload({ buffer: file.buffer, key, name: file.originalname, mimeType: file.mimetype });

    const plan = await this.prisma.teachingPlan.update({
      where: { id },
      data: {
        attachmentKey: stored.key,
        attachmentName: stored.name,
        attachmentMimeType: stored.mimeType,
        attachmentSize: stored.size,
        attachmentUploadedAt: new Date(),
        attachmentUrl: null,
      },
      include: { subject: true, schoolYear: true, semester: true },
    });

    if (existing.attachmentKey) {
      try {
        await this.storage.delete(existing.attachmentKey);
      } catch (error) {
        this.logger.warn(`Dokumen lama gagal dihapus dari storage: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }
    await this.audit.record({ action: 'teaching-plan.attachment-uploaded', entityType: 'TeachingPlan', entityId: id, before: existing, after: plan, userId });
    return {
      data: plan,
      message: existing.type === 'TEACHING_BOOK'
        ? 'Foto buku KBM berhasil diunggah.'
        : 'Dokumen DOCX berhasil diunggah.',
    };
  }

  async getAttachmentUrl(userId: string, id: string, permissions: string[]) {
    const plan = await this.prisma.teachingPlan.findFirst({ where: { id, deletedAt: null } });
    if (!plan) throw new NotFoundException('Perangkat ajar tidak ditemukan');

    const canReview = permissions.includes(PERMISSIONS.TEACHING_PLAN_REVIEW);
    if (!canReview) {
      const teacher = await this.getTeacher(userId);
      if (plan.teacherId !== teacher.id) throw new NotFoundException('Perangkat ajar tidak ditemukan');
    }

    if (plan.attachmentKey && plan.attachmentName) {
      return { data: { url: await this.storage.createDownloadUrl(plan.attachmentKey, plan.attachmentName) } };
    }
    if (plan.attachmentUrl) return { data: { url: plan.attachmentUrl } };
    throw new NotFoundException('Dokumen belum tersedia');
  }

  async getReviewQueue() {
    return { data: await this.prisma.teachingPlan.findMany({
      where: { status: TeachingPlanStatus.SUBMITTED, deletedAt: null },
      include: { teacher: true, subject: true, schoolYear: true, semester: true },
      orderBy: { submittedAt: 'asc' },
    }) };
  }

  async review(userId: string, id: string, dto: ReviewTeachingPlanDto) {
    if (dto.status !== TeachingPlanStatus.APPROVED && dto.status !== TeachingPlanStatus.REVISION_REQUESTED) {
      throw new BadRequestException('Status review tidak valid');
    }
    const existing = await this.prisma.teachingPlan.findFirst({ where: { id, status: TeachingPlanStatus.SUBMITTED, deletedAt: null } });
    if (!existing) throw new NotFoundException('Pengajuan perangkat ajar tidak ditemukan');
    if (dto.status === TeachingPlanStatus.REVISION_REQUESTED && !dto.reviewNote?.trim()) throw new BadRequestException('Catatan revisi wajib diisi');

    const plan = await this.prisma.teachingPlan.update({
      where: { id }, data: { status: dto.status, reviewedAt: new Date(), reviewedById: userId, reviewNote: dto.reviewNote?.trim() },
      include: { teacher: true, subject: true, schoolYear: true, semester: true },
    });
    await this.audit.record({ action: dto.status === 'APPROVED' ? 'teaching-plan.approved' : 'teaching-plan.revision-requested', entityType: 'TeachingPlan', entityId: id, before: existing, after: plan, userId });
    await Promise.all([
      this.notification.markEntityAsRead(userId, 'TeachingPlan', id),
      this.notification.createTeacherReviewInbox({
        teacherId: plan.teacherId,
        entityId: id,
        title: plan.title,
        approved: dto.status === TeachingPlanStatus.APPROVED,
        reviewNote: dto.reviewNote?.trim(),
      }),
    ]);
    return { data: plan, message: dto.status === 'APPROVED' ? 'Perangkat ajar disetujui.' : 'Perangkat ajar dikembalikan untuk revisi.' };
  }

  private async getTeacher(userId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { userId, deletedAt: null, isActive: true } });
    if (!teacher) throw new NotFoundException('Akun belum terhubung dengan data guru');
    return teacher;
  }

  private isBookPhoto(mimeType?: string | null) {
    return Boolean(mimeType && BOOK_PHOTO_MIME_TYPES.includes(mimeType));
  }
}
