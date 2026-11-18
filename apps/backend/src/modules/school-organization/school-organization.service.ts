import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const SETTING_KEY = 'school_organization_structure';
const DEFAULT_POSITIONS = [
  { id: 'principal', title: 'Kepala Sekolah', category: 'Pimpinan', sortOrder: 0, locked: true },
  { id: 'vice-academic', title: 'Wakil Kepala Sekolah Bidang Akademik/Kurikulum', category: 'Wakil Kepala Sekolah', sortOrder: 1 },
  { id: 'vice-student', title: 'Wakil Kepala Sekolah Bidang Kesiswaan', category: 'Wakil Kepala Sekolah', sortOrder: 2 },
  { id: 'vice-facility', title: 'Wakil Kepala Sekolah Bidang Sarana dan Prasarana', category: 'Wakil Kepala Sekolah', sortOrder: 3 },
  { id: 'tu-head', title: 'Kepala Tata Usaha', category: 'Tenaga Kependidikan', sortOrder: 4 },
  { id: 'bk-coordinator', title: 'Koordinator Bimbingan dan Konseling', category: 'Koordinator', sortOrder: 5 },
  { id: 'library', title: 'Koordinator Perpustakaan', category: 'Koordinator', sortOrder: 6 },
  { id: 'lab', title: 'Koordinator Laboratorium', category: 'Koordinator', sortOrder: 7 },
  { id: 'public-relations', title: 'Koordinator Humas', category: 'Koordinator', sortOrder: 8 },
];

@Injectable()
export class SchoolOrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async teachers() {
    return this.prisma.teacher.findMany({ where: { isActive: true, deletedAt: null }, select: { id: true, name: true, nip: true }, orderBy: { name: 'asc' } });
  }

  async get() {
    const [setting, principal, teachers] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } }),
      this.prisma.teacher.findFirst({ where: { isActive: true, deletedAt: null, user: { is: { roles: { some: { role: { name: 'kepala_sekolah' } } } } } }, select: { id: true, name: true } }),
      this.prisma.teacher.findMany({ where: { isActive: true, deletedAt: null }, select: { id: true, name: true } }),
    ]);
    const teacherNames = new Map(teachers.map((teacher) => [teacher.id, teacher.name]));
    const stored: Array<Record<string, unknown>> = setting
      ? JSON.parse(setting.value) as Array<Record<string, unknown>>
      : DEFAULT_POSITIONS;
    const positions = stored.map((position) => {
      const teacherId = typeof position.teacherId === 'string' ? position.teacherId : null;
      const savedPersonName = typeof position.personName === 'string' ? position.personName : null;
      return position.id === 'principal'
        ? { ...position, teacherId: principal?.id ?? null, personName: principal?.name ?? null, locked: true }
        : { ...position, personName: teacherId ? teacherNames.get(teacherId) ?? null : savedPersonName };
    });
    return { positions, defaults: DEFAULT_POSITIONS };
  }

  async save(input: Array<{ id?: string; title: string; personName?: string; teacherId?: string | null; sortOrder?: number; category?: string }>) {
    if (!Array.isArray(input)) throw new BadRequestException('Format struktur organisasi tidak valid.');
    const positions = input.map((item, index) => ({
      id: item.id || `position-${index + 1}`,
      title: String(item.title ?? '').trim(),
      personName: String(item.personName ?? '').trim(),
      teacherId: item.teacherId || null,
      category: String(item.category ?? 'Jabatan Lainnya').trim(),
      sortOrder: Number.isFinite(item.sortOrder) ? Number(item.sortOrder) : index,
    }));
    if (positions.some((item) => !item.title)) throw new BadRequestException('Nama jabatan wajib diisi.');
    if (positions.filter((item) => item.category === 'Wakil Kepala Sekolah').length > 3) throw new BadRequestException('Maksimal tiga jabatan Wakil Kepala Sekolah.');
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
    }
    await this.prisma.systemSetting.upsert({ where: { key: SETTING_KEY }, create: { key: SETTING_KEY, value: JSON.stringify(positions) }, update: { value: JSON.stringify(positions) } });
    return this.get();
  }
}
