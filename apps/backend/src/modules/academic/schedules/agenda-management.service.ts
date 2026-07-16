import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AgendaStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AgendaManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getAgendas(date?: string) {
    const agendaDate = date ? new Date(date) : undefined;

    return {
      data: await this.prisma.dailyAgenda.findMany({
        where: {
          date: agendaDate,
        },
        include: {
          class: true,
          subject: true,
          teacher: true,
          substituteTeacher: true,
          attendance: {
            include: { items: true },
          },
        },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
    };
  }

  async assignSubstituteTeacher(id: string, teacherId: string | null) {
    const agenda = await this.prisma.dailyAgenda.findUnique({ where: { id } });

    if (!agenda) throw new NotFoundException('Agenda tidak ditemukan');
    if (agenda.status === AgendaStatus.COMPLETED) {
      throw new BadRequestException('Agenda yang sudah selesai tidak dapat diganti guru pengganti');
    }

    if (teacherId) {
      const teacher = await this.prisma.teacher.findFirst({
        where: { id: teacherId, deletedAt: null, isActive: true },
      });
      if (!teacher) throw new BadRequestException('Guru pengganti tidak ditemukan atau tidak aktif');
      if (teacher.id === agenda.teacherId) throw new BadRequestException('Guru pengganti tidak boleh sama dengan guru utama');
    }

    const updated = await this.prisma.dailyAgenda.update({
      where: { id },
      data: { substituteTeacherId: teacherId },
      include: { class: true, subject: true, teacher: true, substituteTeacher: true, schedule: true, attendance: true },
    });

    await this.auditService.record({
      action: 'agenda.substitute-teacher.assigned',
      entityType: 'DailyAgenda',
      entityId: id,
      before: { substituteTeacherId: agenda.substituteTeacherId },
      after: { substituteTeacherId: teacherId },
    });

    return {
      data: updated,
      message: teacherId ? 'Guru pengganti berhasil ditetapkan.' : 'Guru pengganti dikosongkan.',
    };
  }
}
