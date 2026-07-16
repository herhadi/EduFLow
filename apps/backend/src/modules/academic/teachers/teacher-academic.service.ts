import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TeacherAssignmentStatus } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { STORAGE_PROVIDER, StorageProvider } from '../../../infrastructure/storage/storage-provider';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ConfigureTeacherAccountDto } from '../dto/configure-teacher-account.dto';
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { SetTeacherSchoolYearAssignmentDto } from '../dto/set-teacher-school-year-assignment.dto';
import { SetTeacherSubjectsDto } from '../dto/set-teacher-subjects.dto';
import { UpdateTeacherDto } from '../dto/update-teacher.dto';

@Injectable()
export class TeacherAcademicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async getTeachers() {
    const teachers = await this.prisma.teacher.findMany({
      where: { deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            roles: { include: { role: true } },
          },
        },
        subjects: { include: { subject: true } },
        yearAssignments: {
          include: { schoolYear: true, subjects: { include: { subject: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
    return { data: await Promise.all(teachers.map((teacher) => this.withTeacherPhotoUrl(teacher))) };
  }

  async uploadTeacherPhoto(id: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number }) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, deletedAt: null },
      include: { user: true },
    });
    if (!teacher) throw new NotFoundException('Guru tidak ditemukan');

    const key = `teachers/${id}/${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    const stored = await this.storage.upload({ buffer: file.buffer, key, name: file.originalname, mimeType: file.mimetype });
    const photoData = {
      photoKey: stored.key,
      photoName: stored.name,
      photoMimeType: stored.mimeType,
      photoSize: stored.size,
    };
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedTeacher = await tx.teacher.update({
        where: { id },
        data: { photoUrl: null, ...photoData },
      });

      if (teacher.userId) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: photoData,
        });
      }

      return updatedTeacher;
    });
    const obsoleteKeys = new Set(
      [teacher.photoKey, teacher.user?.photoKey].filter(
        (photoKey): photoKey is string => Boolean(photoKey) && photoKey !== stored.key,
      ),
    );
    await Promise.all([...obsoleteKeys].map((photoKey) => this.storage.delete(photoKey).catch(() => undefined)));
    await this.auditService.record({ action: 'teacher.photo.uploaded', entityType: 'Teacher', entityId: id, before: teacher, after: updated });
    return { data: await this.withTeacherPhotoUrl(updated), message: 'Foto guru berhasil diunggah.' };
  }

  async createTeacher(dto: CreateTeacherDto) {
    const name = dto.name.trim();
    const nip = dto.nip?.trim() || null;
    const email = dto.email?.trim().toLowerCase() || null;

    const existingTeacher = await this.prisma.teacher.findFirst({
      where: {
        OR: [
          ...(nip ? [{ nip }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingTeacher) {
      throw new BadRequestException('NIP atau email guru sudah digunakan');
    }

    const teacher = await this.prisma.teacher.create({
      data: {
        name,
        nip,
        phone: dto.phone?.trim() || null,
        email,
      },
      include: {
        user: { include: { roles: { include: { role: true } } } },
        subjects: { include: { subject: true } },
      },
    });

    await this.auditService.record({
      action: 'teacher.created',
      entityType: 'Teacher',
      entityId: teacher.id,
      after: teacher,
    });

    return { data: teacher, message: 'Guru berhasil ditambahkan.' };
  }

  async updateTeacher(id: string, dto: UpdateTeacherDto) {
    const existing = await this.prisma.teacher.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Guru tidak ditemukan');

    const teacher = await this.prisma.teacher.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.nip !== undefined && { nip: dto.nip.trim() || null }),
        ...(dto.nuptk !== undefined && { nuptk: dto.nuptk.trim() || null }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() || null }),
        ...(dto.email !== undefined && { email: dto.email.trim().toLowerCase() || null }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl.trim() || null }),
      },
      include: { user: { include: { roles: { include: { role: true } } } }, subjects: { include: { subject: true } } },
    });
    await this.auditService.record({ action: 'teacher.updated', entityType: 'Teacher', entityId: id, before: existing, after: teacher });
    return { data: teacher, message: 'Identitas guru berhasil diperbarui.' };
  }

  async configureTeacherAccount(id: string, dto: ConfigureTeacherAccountDto) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, deletedAt: null },
      include: { user: true },
    });

    if (!teacher) {
      throw new NotFoundException('Guru tidak ditemukan');
    }

    const username = dto.username.trim().toLowerCase();
    const email =
      dto.email?.trim().toLowerCase() ??
      teacher.email?.trim().toLowerCase() ??
      `${username}@eduflow.local`;
    const requestedRoles = dto.roles.includes('wali_kelas')
      ? [...new Set([...dto.roles, 'guru'])]
      : dto.roles;
    const roles = await this.prisma.role.findMany({
      where: { name: { in: requestedRoles } },
    });

    if (roles.length !== new Set(requestedRoles).size) {
      throw new BadRequestException('Ada role yang tidak terdaftar');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
        id: teacher.userId ? { not: teacher.userId } : undefined,
      },
    });

    if (existingUser) {
      throw new BadRequestException('Username atau email sudah digunakan');
    }

    const password = this.getDefaultUserPassword();
    const user = await this.prisma.$transaction(async (tx) => {
      const savedUser = teacher.userId
        ? await tx.user.update({
          where: { id: teacher.userId },
          data: {
            email,
            username,
            name: teacher.name,
            deletedAt: null,
          },
        })
        : await tx.user.create({
          data: {
            email,
            username,
            name: teacher.name,
            password: await hash(password, 12),
          },
        });

      await tx.teacher.update({
        where: { id: teacher.id },
        data: { userId: savedUser.id },
      });

      await tx.userRole.deleteMany({ where: { userId: savedUser.id } });
      await Promise.all(
        roles.map((role) =>
          tx.userRole.create({
            data: { userId: savedUser.id, roleId: role.id },
          }),
        ),
      );

      return tx.user.findUniqueOrThrow({
        where: { id: savedUser.id },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          roles: { include: { role: true } },
        },
      });
    });

    await this.auditService.record({
      action: 'teacher.account.configured',
      entityType: 'Teacher',
      entityId: teacher.id,
      before: teacher,
      after: user,
    });

    return {
      data: {
        ...user,
        roles: user.roles.map(({ role }) => role.name),
      },
      message: 'Akun dan role guru berhasil disimpan.',
    };
  }

  async resetTeacherPassword(id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, deletedAt: null },
      include: { user: true },
    });
    if (!teacher) throw new NotFoundException('Guru tidak ditemukan');
    if (!teacher.user) throw new BadRequestException('Guru belum memiliki akun login');

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { userId: teacher.userId!, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'admin-password-reset' },
      });
      return tx.user.update({
        where: { id: teacher.userId! },
        data: {
          password: await hash(this.getDefaultUserPassword(), 12),
          failedLoginCount: 0,
          lockedUntil: null,
          passwordChangedAt: null,
        },
      });
    });

    await this.auditService.record({
      action: 'teacher.password.reset',
      entityType: 'Teacher',
      entityId: id,
      before: { userId: teacher.userId },
      after: { userId: updatedUser.id, resetToDefault: true },
    });
    return { data: { id: teacher.id }, message: 'Password guru direset ke password default.' };
  }

  async setTeacherSubjects(id: string, dto: SetTeacherSubjectsDto) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, deletedAt: null },
      include: { subjects: true },
    });

    if (!teacher) {
      throw new NotFoundException('Guru tidak ditemukan');
    }

    const subjectIds = [...new Set(dto.subjectIds)];
    const subjectCount = await this.prisma.subject.count({
      where: { id: { in: subjectIds }, deletedAt: null },
    });

    if (subjectCount !== subjectIds.length) {
      throw new BadRequestException('Ada mata pelajaran yang tidak ditemukan');
    }

    await this.prisma.$transaction([
      this.prisma.teacherSubject.deleteMany({ where: { teacherId: id } }),
      ...subjectIds.map((subjectId) =>
        this.prisma.teacherSubject.create({
          data: { teacherId: id, subjectId },
        }),
      ),
    ]);

    const result = await this.prisma.teacher.findUniqueOrThrow({
      where: { id },
      include: { subjects: { include: { subject: true } } },
    });

    await this.auditService.record({
      action: 'teacher.subjects.updated',
      entityType: 'Teacher',
      entityId: id,
      before: teacher.subjects,
      after: result.subjects,
    });

    return { data: result, message: 'Mapel ampu guru berhasil disimpan.' };
  }

  async getTeacherSchoolYearAssignments(teacherId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, deletedAt: null }, select: { id: true } });
    if (!teacher) throw new NotFoundException('Guru tidak ditemukan');

    return {
      data: await this.prisma.teacherSchoolYearAssignment.findMany({
        where: { teacherId },
        include: { schoolYear: true, subjects: { include: { subject: true } } },
        orderBy: { schoolYear: { startsAt: 'desc' } },
      }),
    };
  }

  async setTeacherSchoolYearAssignment(
    teacherId: string,
    schoolYearId: string,
    dto: SetTeacherSchoolYearAssignmentDto,
  ) {
    const subjectIds = [...new Set(dto.subjectIds)];
    const [teacher, schoolYear, subjectCount, before] = await Promise.all([
      this.prisma.teacher.findFirst({ where: { id: teacherId, deletedAt: null } }),
      this.prisma.schoolYear.findFirst({ where: { id: schoolYearId, deletedAt: null } }),
      this.prisma.subject.count({ where: { id: { in: subjectIds }, deletedAt: null } }),
      this.prisma.teacherSchoolYearAssignment.findUnique({
        where: { teacherId_schoolYearId: { teacherId, schoolYearId } },
        include: { subjects: { include: { subject: true } } },
      }),
    ]);
    if (!teacher) throw new NotFoundException('Guru tidak ditemukan');
    if (!schoolYear) throw new NotFoundException('Tahun ajaran tidak ditemukan');
    if (subjectCount !== subjectIds.length) throw new BadRequestException('Ada mata pelajaran yang tidak ditemukan');
    if (dto.status === TeacherAssignmentStatus.ACTIVE && !subjectIds.length) {
      throw new BadRequestException('Guru aktif harus memiliki minimal satu mapel ampu');
    }

    const assignment = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.teacherSchoolYearAssignment.upsert({
        where: { teacherId_schoolYearId: { teacherId, schoolYearId } },
        create: { teacherId, schoolYearId, status: dto.status, notes: dto.notes?.trim() || null },
        update: { status: dto.status, notes: dto.notes?.trim() || null },
      });
      await tx.teacherSchoolYearSubject.deleteMany({ where: { assignmentId: saved.id } });
      if (subjectIds.length) {
        await tx.teacherSchoolYearSubject.createMany({
          data: subjectIds.map((subjectId) => ({ assignmentId: saved.id, subjectId })),
        });
      }
      return tx.teacherSchoolYearAssignment.findUniqueOrThrow({
        where: { id: saved.id },
        include: { schoolYear: true, subjects: { include: { subject: true } } },
      });
    });

    await this.auditService.record({
      action: 'teacher.school-year-assignment.updated',
      entityType: 'TeacherSchoolYearAssignment',
      entityId: assignment.id,
      before,
      after: assignment,
    });
    return { data: assignment, message: 'Penugasan tahun ajaran guru berhasil disimpan.' };
  }

  async deleteTeacher(id: string) {
    const existingTeacher = await this.prisma.teacher.findFirst({
      where: { id, deletedAt: null },
      include: {
        schedules: {
          where: { deletedAt: null },
          select: { id: true },
        },
        homeroomClasses: {
          where: { deletedAt: null },
          select: { id: true, name: true },
        },
      },
    });

    if (!existingTeacher) {
      throw new NotFoundException('Guru tidak ditemukan');
    }

    const deletedAt = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.class.updateMany({
        where: { homeroomTeacherId: id, deletedAt: null },
        data: { homeroomTeacherId: null },
      });

      await tx.schedule.updateMany({
        where: { teacherId: id, deletedAt: null },
        data: { deletedAt },
      });

      return tx.teacher.update({
        where: { id },
        data: { isActive: false, deletedAt },
      });
    });

    await this.auditService.record({
      action: 'teacher.deleted',
      entityType: 'Teacher',
      entityId: result.id,
      before: existingTeacher,
      after: result,
    });

    return {
      data: result,
      message:
        'Guru berhasil dinonaktifkan. Jadwal aktif guru ikut dinonaktifkan, histori agenda tetap tersimpan.',
    };
  }

  async deleteTeacherPermanently(id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id },
      include: {
        schedules: { select: { id: true } },
        agendas: { select: { id: true } },
        homeroomClasses: { select: { id: true, name: true } },
        subjects: { select: { teacherId: true, subjectId: true } },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Guru tidak ditemukan');
    }

    if (teacher.schedules.length || teacher.agendas.length) {
      throw new BadRequestException(
        'Guru tidak bisa dihapus permanen karena sudah memiliki histori jadwal atau agenda. Gunakan Nonaktifkan.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.class.updateMany({
        where: { homeroomTeacherId: id },
        data: { homeroomTeacherId: null },
      });
      await tx.teacherSubject.deleteMany({ where: { teacherId: id } });

      return tx.teacher.delete({
        where: { id },
      });
    });

    await this.auditService.record({
      action: 'teacher.hard-deleted',
      entityType: 'Teacher',
      entityId: id,
      before: teacher,
      after: result,
    });

    return {
      data: result,
      message: 'Guru berhasil dihapus permanen.',
    };
  }

  private async withTeacherPhotoUrl<T extends { photoKey?: string | null; photoName?: string | null }>(teacher: T) {
    if (!teacher.photoKey) return teacher;
    return {
      ...teacher,
      photoUrl: await this.storage.createDownloadUrl(teacher.photoKey, teacher.photoName ?? 'foto-guru'),
    };
  }

  private getDefaultUserPassword() {
    return this.configService.get<string>('DEFAULT_USER_PASSWORD') ?? '123456';
  }
}
