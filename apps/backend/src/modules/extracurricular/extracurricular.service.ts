import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ExtracurricularAttendanceStatus, ExtracurricularEnrollmentStatus, ExtracurricularEnrollmentType, ExtracurricularSessionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExtracurricularService {
  constructor(private readonly prisma: PrismaService) {}

  listPrograms(schoolYearId?: string) {
    return this.prisma.extracurricular.findMany({
      where: { deletedAt: null, ...(schoolYearId ? { schoolYearId } : {}) },
      include: {
        schoolYear: { select: { id: true, name: true } },
        advisors: { include: { teacher: { select: { id: true, name: true, isActive: true } } } },
        _count: { select: { enrollments: true, sessions: true } },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    }).then((data) => ({ data }));
  }

  async createProgram(input: { schoolYearId: string; name: string; code?: string; category?: string; description?: string; participationPolicy?: 'OPTIONAL' | 'MANDATORY_GRADE'; mandatoryGrades?: number[]; quota?: number; location?: string; scheduleNotes?: string }) {
    if (!input.schoolYearId || !input.name?.trim()) throw new BadRequestException('Tahun ajaran dan nama ekskul wajib diisi');
    const year = await this.prisma.schoolYear.findFirst({ where: { id: input.schoolYearId, deletedAt: null } });
    if (!year) throw new NotFoundException('Tahun ajaran tidak ditemukan');
    const data = await this.prisma.extracurricular.create({ data: {
      schoolYearId: input.schoolYearId, name: input.name.trim(), code: input.code?.trim() || null,
      category: input.category?.trim() || 'LAINNYA', description: input.description?.trim() || null,
      participationPolicy: input.participationPolicy ?? 'OPTIONAL',
      mandatoryGrades: input.mandatoryGrades ?? [], quota: input.quota ?? null,
      location: input.location?.trim() || null, scheduleNotes: input.scheduleNotes?.trim() || null,
    }});
    return { data, message: 'Program ekstrakurikuler dibuat.' };
  }

  async assignAdvisors(programId: string, teacherIds: string[]) {
    const program = await this.prisma.extracurricular.findFirst({ where: { id: programId, deletedAt: null } });
    if (!program) throw new NotFoundException('Program ekskul tidak ditemukan');
    const teachers = await this.prisma.teacher.findMany({ where: { id: { in: teacherIds }, isActive: true, deletedAt: null }, select: { id: true } });
    if (teachers.length !== new Set(teacherIds).size) throw new BadRequestException('Daftar pembimbing memuat guru yang tidak aktif/tidak ditemukan');
    const data = await this.prisma.$transaction(async (tx) => {
      await tx.extracurricularAdvisor.deleteMany({ where: { extracurricularId: programId } });
      if (teacherIds.length) await tx.extracurricularAdvisor.createMany({ data: [...new Set(teacherIds)].map(teacherId => ({ extracurricularId: programId, teacherId })), skipDuplicates: true });
      return tx.extracurricular.findUniqueOrThrow({ where: { id: programId }, include: { advisors: { include: { teacher: true } } } });
    });
    return { data, message: 'Pembimbing ekskul diperbarui.' };
  }

  async setMembers(programId: string, members: Array<{ studentId: string; enrollmentType?: 'MANDATORY' | 'VOLUNTARY' }>) {
    const program = await this.prisma.extracurricular.findFirst({ where: { id: programId, deletedAt: null } });
    if (!program) throw new NotFoundException('Program ekskul tidak ditemukan');
    const ids = [...new Set(members.map(m => m.studentId))];
    const students = await this.prisma.student.findMany({ where: { id: { in: ids }, isActive: true, deletedAt: null }, select: { id: true } });
    if (students.length !== ids.length) throw new BadRequestException('Ada siswa tidak aktif atau tidak ditemukan');
    const data = await this.prisma.$transaction(async tx => {
      for (const member of members) {
        await tx.extracurricularEnrollment.upsert({
          where: { extracurricularId_studentId: { extracurricularId: programId, studentId: member.studentId } },
          create: { extracurricularId: programId, studentId: member.studentId, enrollmentType: member.enrollmentType ?? ExtracurricularEnrollmentType.VOLUNTARY },
          update: { status: ExtracurricularEnrollmentStatus.ACTIVE, enrollmentType: member.enrollmentType ?? ExtracurricularEnrollmentType.VOLUNTARY },
        });
      }
      return tx.extracurricularEnrollment.findMany({ where: { extracurricularId: programId, status: 'ACTIVE' }, include: { student: { select: { id: true, name: true, nis: true, enrollments: { where: { isActive: true, deletedAt: null }, include: { class: { select: { name: true, grade: true } } } } } }, orderBy: { student: { name: 'asc' } } });
    });
    return { data, message: 'Anggota ekskul diperbarui.' };
  }

  async myPrograms(userId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { userId, isActive: true, deletedAt: null }, select: { id: true } });
    if (!teacher) throw new ForbiddenException('Akun ini tidak terhubung ke profil guru');
    const data = await this.prisma.extracurricular.findMany({
      where: { deletedAt: null, advisors: { some: { teacherId: teacher.id } } },
      include: { schoolYear: { select: { id: true, name: true } }, advisors: { include: { teacher: { select: { id: true, name: true } } } }, _count: { select: { enrollments: true, sessions: true } } },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    return { data };
  }

  async createSession(programId: string, userId: string, input: { startsAt: string; endsAt?: string; location?: string; activityNotes?: string }) {
    await this.requireAdvisor(programId, userId);
    const startsAt = new Date(input.startsAt);
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (Number.isNaN(startsAt.getTime()) || (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt < startsAt))) throw new BadRequestException('Tanggal/waktu pertemuan tidak valid');
    const data = await this.prisma.$transaction(async tx => {
      const members = await tx.extracurricularEnrollment.findMany({ where: { extracurricularId: programId, status: 'ACTIVE' }, select: { id: true, studentId: true } });
      if (!members.length) throw new BadRequestException('Program belum memiliki anggota aktif');
      const session = await tx.extracurricularSession.create({ data: { extracurricularId: programId, startsAt, endsAt, location: input.location?.trim() || null, activityNotes: input.activityNotes?.trim() || null, createdByUserId: userId } });
      // Match existing KBM workflow: attendance defaults to PRESENT; advisor can change exceptions before submitting.
      await tx.extracurricularAttendance.createMany({ data: members.map(m => ({ sessionId: session.id, studentId: m.studentId, enrollmentId: m.id, status: ExtracurricularAttendanceStatus.PRESENT, markedByUserId: userId })), skipDuplicates: true });
      return tx.extracurricularSession.findUniqueOrThrow({ where: { id: session.id }, include: { extracurricular: { select: { id: true, name: true } }, attendanceItems: { include: { student: { select: { id: true, name: true, nis: true } } }, orderBy: { student: { name: 'asc' } } } } });
    });
    return { data, message: 'Pertemuan dibuat. Semua anggota diawali dengan status Hadir; ubah siswa yang sakit, izin, atau alpa sebelum submit.' };
  }

  async updateAttendance(sessionId: string, userId: string, items: Array<{ studentId: string; status: 'PRESENT' | 'SICK' | 'EXCUSED' | 'ABSENT'; notes?: string }>) {
    const session = await this.prisma.extracurricularSession.findUnique({ where: { id: sessionId }, include: { extracurricular: true } });
    if (!session) throw new NotFoundException('Pertemuan tidak ditemukan');
    await this.requireAdvisor(session.extracurricularId, userId);
    if (session.status !== ExtracurricularSessionStatus.DRAFT) throw new BadRequestException('Presensi yang sudah dikirim tidak dapat diubah langsung');
    const allowed = new Set(Object.values(ExtracurricularAttendanceStatus));
    for (const item of items) if (!allowed.has(item.status as ExtracurricularAttendanceStatus)) throw new BadRequestException('Status presensi tidak valid');
    await this.prisma.$transaction(items.map(item => this.prisma.extracurricularAttendance.update({
      where: { sessionId_studentId: { sessionId, studentId: item.studentId } },
      data: { status: item.status, notes: item.notes?.trim() || null, markedByUserId: userId, markedAt: new Date() },
    })));
    return this.getSession(sessionId, userId);
  }

  async submitSession(sessionId: string, userId: string) {
    const session = await this.prisma.extracurricularSession.findUnique({ where: { id: sessionId }, include: { extracurricular: true, attendanceItems: true } });
    if (!session) throw new NotFoundException('Pertemuan tidak ditemukan');
    await this.requireAdvisor(session.extracurricularId, userId);
    if (session.status !== 'DRAFT') throw new BadRequestException('Pertemuan sudah diproses');
    const updated = await this.prisma.extracurricularSession.update({ where: { id: sessionId }, data: { status: 'SUBMITTED', submittedAt: new Date(), submittedByUserId: userId }, include: { extracurricular: { select: { id: true, name: true } }, attendanceItems: { include: { student: { select: { id: true, name: true, nis: true } } }, orderBy: { student: { name: 'asc' } } } } });
    return { data: updated, message: 'Presensi ekskul berhasil dikirim.' };
  }

  async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.extracurricularSession.findUnique({ where: { id: sessionId }, include: { extracurricular: true, attendanceItems: { include: { student: { select: { id: true, name: true, nis: true } } }, orderBy: { student: { name: 'asc' } } } } });
    if (!session) throw new NotFoundException('Pertemuan tidak ditemukan');
    await this.requireAdvisor(session.extracurricularId, userId);
    return { data: session };
  }

  private async requireAdvisor(programId: string, userId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { userId, isActive: true, deletedAt: null }, select: { id: true } });
    if (!teacher) throw new ForbiddenException('Akun ini tidak terhubung ke profil guru');
    const assignment = await this.prisma.extracurricularAdvisor.findUnique({ where: { extracurricularId_teacherId: { extracurricularId: programId, teacherId: teacher.id } } });
    if (!assignment) throw new ForbiddenException('Anda bukan pembimbing ekskul ini');
    return teacher;
  }
}
