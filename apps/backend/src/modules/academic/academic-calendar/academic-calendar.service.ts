import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AcademicCalendarEventType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateAcademicCalendarEventDto } from '../dto/create-academic-calendar-event.dto';
import { UpdateAcademicCalendarEventDto } from '../dto/update-academic-calendar-event.dto';

@Injectable()
export class AcademicCalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getAcademicCalendarEvents(schoolYearId?: string) {
    return {
      data: await this.prisma.academicCalendarEvent.findMany({
        where: { deletedAt: null, schoolYearId },
        include: { semester: true },
        orderBy: [{ startsAt: 'asc' }, { createdAt: 'asc' }],
      }),
    };
  }

  async createAcademicCalendarEvent(dto: CreateAcademicCalendarEventDto) {
    const event = await this.validateAcademicCalendarEvent(dto);
    const created = await this.prisma.academicCalendarEvent.create({
      data: event,
      include: { semester: true },
    });

    await this.auditService.record({
      action: 'academic-calendar.event.created',
      entityType: 'AcademicCalendarEvent',
      entityId: created.id,
      after: created,
    });

    return { data: created, message: 'Event Kaldik berhasil ditambahkan.' };
  }

  async updateAcademicCalendarEvent(id: string, dto: UpdateAcademicCalendarEventDto) {
    const existing = await this.prisma.academicCalendarEvent.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Event Kaldik tidak ditemukan');

    const event = await this.validateAcademicCalendarEvent({
      schoolYearId: existing.schoolYearId,
      semesterId: dto.semesterId === undefined ? existing.semesterId ?? undefined : dto.semesterId ?? undefined,
      title: dto.title ?? existing.title,
      description: dto.description === undefined ? existing.description ?? undefined : dto.description ?? undefined,
      type: dto.type ?? existing.type,
      startsAt: dto.startsAt ?? existing.startsAt.toISOString(),
      endsAt: dto.endsAt ?? existing.endsAt.toISOString(),
      blocksAgenda: dto.blocksAgenda ?? existing.blocksAgenda,
    });
    const updated = await this.prisma.academicCalendarEvent.update({
      where: { id },
      data: event,
      include: { semester: true },
    });

    await this.auditService.record({
      action: 'academic-calendar.event.updated',
      entityType: 'AcademicCalendarEvent',
      entityId: id,
      before: existing,
      after: updated,
    });

    return { data: updated, message: 'Event Kaldik berhasil diperbarui.' };
  }

  async deleteAcademicCalendarEvent(id: string) {
    const existing = await this.prisma.academicCalendarEvent.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Event Kaldik tidak ditemukan');

    const deleted = await this.prisma.academicCalendarEvent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.auditService.record({
      action: 'academic-calendar.event.deleted',
      entityType: 'AcademicCalendarEvent',
      entityId: id,
      before: existing,
      after: deleted,
    });

    return { data: deleted, message: 'Event Kaldik dihapus.' };
  }

  private async validateAcademicCalendarEvent(dto: {
    schoolYearId: string;
    semesterId?: string;
    title: string;
    description?: string;
    type: AcademicCalendarEventType;
    startsAt: string;
    endsAt: string;
    blocksAgenda?: boolean;
  }) {
    const [schoolYear, semester] = await Promise.all([
      this.prisma.schoolYear.findFirst({ where: { id: dto.schoolYearId, deletedAt: null } }),
      dto.semesterId
        ? this.prisma.semester.findFirst({ where: { id: dto.semesterId, schoolYearId: dto.schoolYearId, deletedAt: null } })
        : null,
    ]);

    if (!schoolYear) throw new NotFoundException('Tahun ajaran tidak ditemukan');
    if (dto.semesterId && !semester) throw new BadRequestException('Semester tidak berada pada tahun ajaran yang dipilih');
    if (!dto.title.trim()) throw new BadRequestException('Judul event Kaldik wajib diisi');

    const startsAt = this.toDateOnly(dto.startsAt);
    const endsAt = this.toDateOnly(dto.endsAt);
    if (endsAt < startsAt) throw new BadRequestException('Tanggal akhir tidak boleh lebih awal dari tanggal mulai');
    if (startsAt < this.toDateOnly(schoolYear.startsAt.toISOString()) || endsAt > this.toDateOnly(schoolYear.endsAt.toISOString())) {
      throw new BadRequestException('Rentang event harus berada dalam tahun ajaran yang dipilih');
    }

    return {
      schoolYearId: dto.schoolYearId,
      semesterId: dto.semesterId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      type: dto.type,
      startsAt,
      endsAt,
      blocksAgenda: dto.blocksAgenda ?? true,
    };
  }

  private toDateOnly(value: string) {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }
}
