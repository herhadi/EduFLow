import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TeachingPlanStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTeachingPlanDto } from './dto/create-teaching-plan.dto';
import { ReviewTeachingPlanDto } from './dto/review-teaching-plan.dto';

@Injectable()
export class AcademicPlanningService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

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

    const plan = await this.prisma.teachingPlan.update({
      where: { id }, data: { status: TeachingPlanStatus.SUBMITTED, submittedAt: new Date(), reviewNote: null },
      include: { subject: true, schoolYear: true, semester: true },
    });
    await this.audit.record({ action: 'teaching-plan.submitted', entityType: 'TeachingPlan', entityId: id, before: existing, after: plan, userId });
    return { data: plan, message: 'Perangkat ajar dikirim untuk review Kepala Sekolah.' };
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
    return { data: plan, message: dto.status === 'APPROVED' ? 'Perangkat ajar disetujui.' : 'Perangkat ajar dikembalikan untuk revisi.' };
  }

  private async getTeacher(userId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { userId, deletedAt: null, isActive: true } });
    if (!teacher) throw new NotFoundException('Akun belum terhubung dengan data guru');
    return teacher;
  }
}
