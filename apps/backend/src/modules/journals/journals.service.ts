import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

const OWN_READ = 'teaching_journal.read_own';
const SCHOOL_READ = 'teaching_journal.read_school';
const CLASS_READ = 'class_journal.read_assigned';
const CLASS_SCHOOL_READ = 'class_journal.read_school';

@Injectable()
export class JournalsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async getMine(userId: string, date?: string) {
    const teacher = await this.getTeacher(userId);
    const agendaDate = date ? this.parseDate(date) : undefined;
    const agendas = await this.prisma.dailyAgenda.findMany({
      where: { ...(agendaDate ? { date: agendaDate } : {}), OR: [{ teacherId: teacher.id }, { substituteTeacherId: teacher.id }] },
      include: {
        class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } }, substituteTeacher: { select: { id: true, name: true } },
        schedule: { select: { startsAt: true, endsAt: true } }, teachingJournal: true,
      },
      orderBy: [{ date: 'desc' }, { effectiveStartsAt: 'asc' }],
    });
    return { data: agendas.map((agenda) => ({
      ...agenda, journalStatus: agenda.teachingJournal?.status ?? 'NOT_STARTED',
      canEditJournal: (agenda.substituteTeacherId ? agenda.substituteTeacherId === teacher.id : agenda.teacherId === teacher.id)
        && (!agenda.teachingJournal || agenda.teachingJournal.status === 'DRAFT'),
    })) };
  }

  async getForAgenda(id: string, userId: string, permissions: string[]) {
    const agenda = await this.prisma.dailyAgenda.findUnique({ where: { id }, include: { teachingJournal: true, class: true, subject: true, teacher: true, substituteTeacher: true } });
    if (!agenda) throw new NotFoundException('Agenda mengajar tidak ditemukan');
    const teacher = await this.prisma.teacher.findUnique({ where: { userId }, select: { id: true } });
    const assigned = Boolean(teacher && (agenda.substituteTeacherId ?? agenda.teacherId) === teacher.id);
    if (!assigned && !permissions.includes(SCHOOL_READ)) throw new ForbiddenException('Jurnal ini bukan bagian dari penugasan Anda');
    if (assigned && !permissions.includes(OWN_READ) && !permissions.includes(SCHOOL_READ)) throw new ForbiddenException('Tidak memiliki akses membaca jurnal');
    return { data: agenda };
  }

  async saveDraft(id: string, userId: string, input: Record<string, unknown>) {
    const { agenda, teacher } = await this.getEditableAgenda(id, userId);
    const existing = await this.prisma.teachingJournal.findUnique({ where: { agendaId: id } });
    if (existing && existing.status !== 'DRAFT') throw new BadRequestException('Jurnal yang sudah dikirim tidak dapat diedit');
    const data = {
      teacherId: teacher.id,
      learningObjectives: this.text(input.learningObjectives),
      material: this.text(input.material) ?? '',
      learningActivities: this.text(input.learningActivities),
      learningOutcome: this.text(input.learningOutcome),
      reflection: this.text(input.reflection),
      issueNotes: this.text(input.issueNotes),
    };
    const saved = await this.prisma.teachingJournal.upsert({ where: { agendaId: id }, create: { agendaId: id, ...data }, update: data });
    await this.audit.record({ userId, action: existing ? 'teaching-journal.draft-updated' : 'teaching-journal.draft-created', entityType: 'TeachingJournal', entityId: saved.id, before: existing ?? undefined, after: saved });
    return { data: { ...saved, agenda: { id: agenda.id, date: agenda.date } }, message: 'Draft jurnal tersimpan' };
  }

  async submit(id: string, userId: string) {
    await this.getEditableAgenda(id, userId);
    const existing = await this.prisma.teachingJournal.findUnique({ where: { agendaId: id } });
    if (!existing) throw new BadRequestException('Simpan jurnal terlebih dahulu sebelum mengirim');
    if (!existing.material.trim()) throw new BadRequestException('Materi pembelajaran wajib diisi sebelum jurnal dikirim');
    if (existing.status !== 'DRAFT') throw new BadRequestException('Jurnal sudah dikirim atau dikunci');
    const saved = await this.prisma.teachingJournal.update({ where: { agendaId: id }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
    await this.audit.record({ userId, action: 'teaching-journal.submitted', entityType: 'TeachingJournal', entityId: saved.id, before: existing, after: saved });
    return { data: saved, message: 'Jurnal harian berhasil dikirim' };
  }

  async getClassJournal(classId: string, filters: { date?: string; from?: string; to?: string }, userId: string, permissions: string[]) {
    const schoolClass = await this.prisma.class.findFirst({ where: { id: classId, deletedAt: null }, select: { id: true, name: true, code: true, grade: true, schoolYearId: true, homeroomTeacherId: true } });
    if (!schoolClass) throw new NotFoundException('Kelas tidak ditemukan');
    const teacher = await this.prisma.teacher.findUnique({ where: { userId }, select: { id: true } });
    const assigned = Boolean(teacher && schoolClass.homeroomTeacherId === teacher.id);
    const schoolRead = permissions.includes(CLASS_SCHOOL_READ) || permissions.includes(SCHOOL_READ);
    if (!assigned && !schoolRead) throw new ForbiddenException('Anda tidak memiliki akses ke jurnal kelas ini');
    if (assigned && !permissions.includes(CLASS_READ) && !schoolRead) throw new ForbiddenException('Permission membaca jurnal kelas tidak tersedia');
    const start = filters.date ? this.parseDate(filters.date) : filters.from ? this.parseDate(filters.from) : this.todayDate();
    const end = filters.date ? this.parseDate(filters.date) : filters.to ? this.parseDate(filters.to) : start;
    if (start > end) throw new BadRequestException('Tanggal awal tidak boleh melebihi tanggal akhir');
    if ((end.getTime() - start.getTime()) / 86400000 > 92) throw new BadRequestException('Rentang jurnal maksimal 93 hari');
    const [agendas, notes] = await Promise.all([
      this.prisma.dailyAgenda.findMany({
        where: { classId, date: { gte: start, lte: end } },
        include: { subject: { select: { id: true, name: true } }, teacher: { select: { id: true, name: true } },
          substituteTeacher: { select: { id: true, name: true } }, schedule: { select: { startsAt: true, endsAt: true } },
          teachingJournal: true, attendance: { select: { id: true, state: true, submittedAt: true } } },
        orderBy: [{ date: 'asc' }, { effectiveStartsAt: 'asc' }],
      }),
      this.prisma.classJournalNote.findMany({
        where: { classId, date: { gte: start, lte: end } },
        include: { authorTeacher: { select: { id: true, name: true } } },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);
    return { data: {
      class: schoolClass, range: { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) },
      summary: {
        totalAgendas: agendas.length,
        submittedJournals: agendas.filter((a) => a.teachingJournal && a.teachingJournal.status !== 'DRAFT').length,
        draftJournals: agendas.filter((a) => a.teachingJournal?.status === 'DRAFT').length,
        journalsNotStarted: agendas.filter((a) => !a.teachingJournal).length,
        cancelledAgendas: agendas.filter((a) => a.status === 'CANCELLED').length,
        completedAgendas: agendas.filter((a) => a.status === 'COMPLETED').length,
      },
      agendas: agendas.map((a) => ({ ...a, journalStatus: a.teachingJournal?.status ?? 'NOT_STARTED', attendanceState: a.attendance?.state ?? 'NOT_STARTED' })),
      notes,
    } };
  }

  async createClassNote(classId: string, userId: string, input: { date?: string; content?: string }) {
    const teacher = await this.getTeacher(userId);
    const content = this.text(input.content);
    if (!content) throw new BadRequestException('Catatan wali kelas wajib diisi');
    await this.assertHomeroom(classId, teacher.id);
    const note = await this.prisma.classJournalNote.create({ data: { classId, date: this.parseDate(input.date ?? this.todayDate().toISOString().slice(0, 10)), authorTeacherId: teacher.id, content }, include: { authorTeacher: { select: { id: true, name: true } } } });
    await this.audit.record({ userId, action: 'class-journal-note.created', entityType: 'ClassJournalNote', entityId: note.id, after: note });
    return { data: note, message: 'Catatan kelas disimpan' };
  }

  async updateClassNote(classId: string, noteId: string, userId: string, input: { content?: string }) {
    const teacher = await this.getTeacher(userId);
    const content = this.text(input.content);
    if (!content) throw new BadRequestException('Catatan wali kelas wajib diisi');
    await this.assertHomeroom(classId, teacher.id);
    const existing = await this.prisma.classJournalNote.findFirst({ where: { id: noteId, classId } });
    if (!existing) throw new NotFoundException('Catatan kelas tidak ditemukan');
    if (existing.authorTeacherId !== teacher.id) throw new ForbiddenException('Hanya penulis catatan yang dapat mengubahnya');
    const saved = await this.prisma.classJournalNote.update({ where: { id: noteId }, data: { content }, include: { authorTeacher: { select: { id: true, name: true } } } });
    await this.audit.record({ userId, action: 'class-journal-note.updated', entityType: 'ClassJournalNote', entityId: saved.id, before: existing, after: saved });
    return { data: saved, message: 'Catatan kelas diperbarui' };
  }

  private async getEditableAgenda(id: string, userId: string) {
    const teacher = await this.getTeacher(userId);
    const agenda = await this.prisma.dailyAgenda.findUnique({ where: { id } });
    if (!agenda) throw new NotFoundException('Agenda mengajar tidak ditemukan');
    if ((agenda.substituteTeacherId ?? agenda.teacherId) !== teacher.id) throw new ForbiddenException('Jurnal hanya dapat dikelola guru yang ditugaskan');
    return { agenda, teacher };
  }
  private async getTeacher(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher || !teacher.isActive) throw new ForbiddenException('Akun tidak terhubung ke profil guru aktif');
    return teacher;
  }
  private async assertHomeroom(classId: string, teacherId: string) {
    const c = await this.prisma.class.findFirst({ where: { id: classId, deletedAt: null } });
    if (!c) throw new NotFoundException('Kelas tidak ditemukan');
    if (c.homeroomTeacherId !== teacherId) throw new ForbiddenException('Catatan hanya dapat dikelola wali kelas yang ditugaskan');
  }
  private text(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') throw new BadRequestException('Nilai jurnal harus berupa teks');
    return value.trim() || null;
  }
  private parseDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Format tanggal harus YYYY-MM-DD');
    const d = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new BadRequestException('Tanggal tidak valid');
    return d;
  }
  private todayDate() {
    const local = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  }
}
