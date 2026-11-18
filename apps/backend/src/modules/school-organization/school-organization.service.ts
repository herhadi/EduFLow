import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { STORAGE_PROVIDER, StorageProvider } from '../../infrastructure/storage/storage-provider';
import { PrismaService } from '../../prisma/prisma.service';

const SETTING_KEY = 'school_organization_structure';
const DEFAULT_POSITIONS = [
  { id: 'principal', title: 'Kepala Sekolah', category: 'Pimpinan', sortOrder: 0, parentId: null, locked: true },
  { id: 'vice-academic', title: 'Wakil Kepala Sekolah Bidang Akademik/Kurikulum', category: 'Wakil Kepala Sekolah', sortOrder: 1, parentId: 'principal' },
  { id: 'vice-student', title: 'Wakil Kepala Sekolah Bidang Kesiswaan', category: 'Wakil Kepala Sekolah', sortOrder: 2, parentId: 'principal' },
  { id: 'vice-facility', title: 'Wakil Kepala Sekolah Bidang Sarana dan Prasarana', category: 'Wakil Kepala Sekolah', sortOrder: 3, parentId: 'principal' },
  { id: 'tu-head', title: 'Kepala Tata Usaha', category: 'Tenaga Kependidikan', sortOrder: 4, parentId: 'principal' },
  { id: 'bk-coordinator', title: 'Koordinator Bimbingan dan Konseling', category: 'Koordinator', sortOrder: 5, parentId: 'vice-student' },
  { id: 'library', title: 'Koordinator Perpustakaan', category: 'Koordinator', sortOrder: 6, parentId: 'vice-facility' },
  { id: 'lab', title: 'Koordinator Laboratorium', category: 'Koordinator', sortOrder: 7, parentId: 'vice-facility' },
  { id: 'public-relations', title: 'Koordinator Humas', category: 'Koordinator', sortOrder: 8, parentId: 'vice-student' },
];

@Injectable()
export class SchoolOrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async teachers() {
    const teachers = await this.prisma.teacher.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, name: true, nip: true, photoUrl: true, photoKey: true, photoName: true },
      orderBy: { name: 'asc' },
    });
    return Promise.all(teachers.map(async (teacher) => ({
      id: teacher.id,
      name: teacher.name,
      nip: teacher.nip,
      photoUrl: teacher.photoKey
        ? await this.storage.createDownloadUrl(teacher.photoKey, teacher.photoName ?? 'foto-guru')
        : teacher.photoUrl,
    })));
  }

  async uploadTeacherPhoto(id: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number }) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id, deletedAt: null }, include: { user: true } });
    if (!teacher) throw new NotFoundException('Guru/pegawai tidak ditemukan.');
    const key = `teachers/${id}/${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    const stored = await this.storage.upload({ buffer: file.buffer, key, name: file.originalname, mimeType: file.mimetype });
    const photoData = { photoKey: stored.key, photoName: stored.name, photoMimeType: stored.mimeType, photoSize: stored.size };
    await this.prisma.$transaction(async (tx) => {
      await tx.teacher.update({ where: { id }, data: { photoUrl: null, ...photoData } });
      if (teacher.userId) await tx.user.update({ where: { id: teacher.userId }, data: photoData });
    });
    const obsoleteKeys = new Set([teacher.photoKey, teacher.user?.photoKey].filter((photoKey): photoKey is string => Boolean(photoKey) && photoKey !== stored.key));
    await Promise.all([...obsoleteKeys].map((photoKey) => this.storage.delete(photoKey).catch(() => undefined)));
    return { data: (await this.teachers()).find((item) => item.id === id), message: 'Foto bagan dan foto profil berhasil diperbarui.' };
  }

  async get() {
    const now = new Date();
    const [setting, principal, teachers, currentSchoolYear] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } }),
      this.prisma.teacher.findFirst({ where: { isActive: true, deletedAt: null, user: { is: { roles: { some: { role: { name: 'kepala_sekolah' } } } } } }, select: { id: true, name: true } }),
      this.prisma.teacher.findMany({ where: { isActive: true, deletedAt: null }, select: { id: true, name: true, nip: true, photoUrl: true, photoKey: true, photoName: true } }),
      this.prisma.schoolYear.findFirst({ where: { deletedAt: null, startsAt: { lte: now }, endsAt: { gte: now } }, orderBy: { startsAt: 'desc' }, select: { id: true, name: true } }),
    ]);
    const selectedSchoolYear = currentSchoolYear ?? await this.prisma.schoolYear.findFirst({ where: { deletedAt: null, startsAt: { lte: now } }, orderBy: { startsAt: 'desc' }, select: { id: true, name: true } }) ?? await this.prisma.schoolYear.findFirst({ where: { deletedAt: null }, orderBy: { startsAt: 'desc' }, select: { id: true, name: true } });
    const classes = selectedSchoolYear ? await this.prisma.class.findMany({
      where: { schoolYearId: selectedSchoolYear.id, deletedAt: null },
      include: { homeroomTeacher: { select: { id: true, name: true, nip: true, photoUrl: true, photoKey: true, photoName: true } } },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
    }) : [];
    const classCards = await Promise.all(classes.map(async (schoolClass) => ({
      id: schoolClass.id, name: schoolClass.name, grade: schoolClass.grade,
      teacherId: schoolClass.homeroomTeacher?.id ?? null,
      teacherName: schoolClass.homeroomTeacher?.name ?? null,
      nip: schoolClass.homeroomTeacher?.nip ?? null,
      photoUrl: schoolClass.homeroomTeacher?.photoKey
        ? await this.storage.createDownloadUrl(schoolClass.homeroomTeacher.photoKey, schoolClass.homeroomTeacher.photoName ?? 'foto-wali-kelas')
        : schoolClass.homeroomTeacher?.photoUrl ?? null,
    })));
    const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
    const stored: Array<Record<string, unknown>> = setting ? JSON.parse(setting.value) as Array<Record<string, unknown>> : DEFAULT_POSITIONS;
    const positions: Array<Record<string, any>> = await Promise.all(stored.map(async (position) => {
      const teacherId = typeof position.teacherId === 'string' ? position.teacherId : null;
      const teacher = teacherId ? teacherById.get(teacherId) : null;
      const fallbackParent = position.id === 'principal' ? null
        : ['vice-academic', 'vice-student', 'vice-facility', 'tu-head'].includes(String(position.id)) ? 'principal'
        : position.id === 'bk-coordinator' || position.id === 'public-relations' ? 'vice-student'
        : position.id === 'library' || position.id === 'lab' ? 'vice-facility' : 'principal';
      const photoUrl = teacher?.photoKey
        ? await this.storage.createDownloadUrl(teacher.photoKey, teacher.photoName ?? 'foto-guru')
        : teacher?.photoUrl ?? null;
      return {
        ...position,
        parentId: typeof position.parentId === 'string' ? position.parentId : fallbackParent,
        teacherId,
        personName: position.id === 'principal' ? principal?.name ?? null : teacher?.name ?? (typeof position.personName === 'string' ? position.personName : null),
        nip: teacher?.nip ?? (typeof position.nip === 'string' ? position.nip : null),
        photoUrl,
        locked: position.id === 'principal' || Boolean(position.locked),
      };
    }));
    if (principal) {
      const principalPosition = positions.find((position) => position.id === 'principal');
      if (principalPosition) {
        principalPosition.teacherId = principal.id;
        principalPosition.personName = principal.name;
        const principalTeacher = teacherById.get(principal.id);
        principalPosition.nip = principalTeacher?.nip ?? null;
        principalPosition.photoUrl = principalTeacher?.photoKey
          ? await this.storage.createDownloadUrl(principalTeacher.photoKey, principalTeacher.photoName ?? 'foto-guru')
          : principalTeacher?.photoUrl ?? null;
      }
    }
    return { positions, defaults: DEFAULT_POSITIONS, schoolYear: selectedSchoolYear, classes: classCards };
  }

  async save(input: Array<{ id?: string; title: string; personName?: string; nip?: string | null; teacherId?: string | null; parentId?: string | null; sortOrder?: number; category?: string; x?: number; y?: number }>) {
    if (!Array.isArray(input)) throw new BadRequestException('Format struktur organisasi tidak valid.');
    const positions = input.map((item, index) => ({
      id: item.id || `position-${index + 1}`,
      title: String(item.title ?? '').trim(),
      personName: String(item.personName ?? '').trim(),
      nip: String(item.nip ?? '').trim() || null,
      teacherId: item.teacherId || null,
      parentId: item.parentId || null,
      category: String(item.category ?? 'Jabatan Lainnya').trim(),
      sortOrder: Number.isFinite(item.sortOrder) ? Number(item.sortOrder) : index,
      ...(Number.isFinite(item.x) ? { x: Math.max(0, Number(item.x)) } : {}),
      ...(Number.isFinite(item.y) ? { y: Math.max(0, Number(item.y)) } : {}),
    }));
    if (positions.some((item) => !item.title)) throw new BadRequestException('Nama jabatan wajib diisi.');
    if (positions.filter((item) => item.category === 'Wakil Kepala Sekolah').length > 3) throw new BadRequestException('Maksimal tiga jabatan Wakil Kepala Sekolah.');
    if (!positions.some((item) => item.id === 'principal')) throw new BadRequestException('Jabatan Kepala Sekolah wajib tersedia.');
    const ids = new Set(positions.map((item) => item.id));
    if (positions.some((item) => item.id !== 'principal' && !item.parentId)) throw new BadRequestException('Setiap jabatan harus memiliki atasan langsung.');
      if (positions.some((item) => item.parentId && item.id !== '__students__' && (!ids.has(item.parentId) || item.parentId === item.id))) throw new BadRequestException('Atasan pada bagan tidak valid.');
    const byId = new Map(positions.map((item) => [item.id, item]));
    for (const item of positions) {
        if (item.id === '__students__' && item.parentId?.startsWith('homeroom:')) continue;
      const visited = new Set([item.id]);
      let parentId = item.parentId;
      while (parentId) {
        if (visited.has(parentId)) throw new BadRequestException('Hubungan jabatan membentuk siklus.');
        visited.add(parentId);
        parentId = byId.get(parentId)?.parentId ?? null;
      }
    }
    const teacherIds = [...new Set(positions.map((item) => item.teacherId).filter((id): id is string => Boolean(id)))];
    if (teacherIds.length) {
      const count = await this.prisma.teacher.count({ where: { id: { in: teacherIds }, isActive: true, deletedAt: null } });
      if (count !== teacherIds.length) throw new BadRequestException('Terdapat guru/pegawai yang tidak aktif atau tidak ditemukan.');
    }
    const principal = await this.prisma.teacher.findFirst({ where: { isActive: true, deletedAt: null, user: { is: { roles: { some: { role: { name: 'kepala_sekolah' } } } } } }, select: { id: true } });
    const principalPosition = positions.find((item) => item.id === 'principal');
    if (principalPosition) {
      principalPosition.teacherId = principal?.id ?? null;
      principalPosition.personName = '';
      principalPosition.parentId = null;
    }
    await this.prisma.systemSetting.upsert({ where: { key: SETTING_KEY }, create: { key: SETTING_KEY, value: JSON.stringify(positions) }, update: { value: JSON.stringify(positions) } });
    return this.get();
  }
}
