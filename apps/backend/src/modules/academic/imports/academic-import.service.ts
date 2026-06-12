import { BadRequestException, Injectable } from '@nestjs/common';
import { Gender, GuardianRelation, SemesterType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ImportExcelService, type ImportRow } from './import-excel.service';

type ImportType = 'teachers' | 'students';

export interface ImportSummary {
  type: ImportType;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

@Injectable()
export class AcademicImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly excelService: ImportExcelService,
    private readonly auditService: AuditService,
  ) {}

  async import(type: ImportType, file?: { buffer: Buffer; originalname?: string }) {
    const rows = this.excelService.parse(file);
    const summary: ImportSummary = {
      type,
      total: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (const [index, row] of rows.entries()) {
      try {
        const result = await this.importRow(type, row);
        summary[result] += 1;
      } catch (error) {
        summary.errors.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Row gagal diproses',
        });
      }
    }

    await this.auditService.record({
      action: `import.${type}`,
      entityType: 'Import',
      entityId: file?.originalname ?? type,
      after: summary,
    });

    return {
      data: summary,
      message: `Import ${type} selesai.`,
    };
  }

  private importRow(type: ImportType, row: ImportRow) {
    if (type === 'teachers') {
      return this.importTeacher(row);
    }

    if (type === 'students') {
      return this.importStudent(row);
    }

    throw new BadRequestException('Tipe import tidak valid');
  }

  private async importTeacher(row: ImportRow): Promise<'created' | 'updated' | 'skipped'> {
    const name = this.required(row, ['nama', 'name']);
    const nip = this.optional(row, ['nip']);
    const nuptk = this.optional(row, ['nuptk']);
    const email = this.optional(row, ['email']);
    const phone = this.optional(row, ['no_hp', 'phone', 'hp']);
    const telegramId = this.optional(row, ['telegram_id', 'telegram']);
    const isActive = this.parseActive(this.optional(row, ['status', 'is_active']));
    const existingTeacher =
      (nip ? await this.prisma.teacher.findUnique({ where: { nip } }) : null) ??
      (nuptk ? await this.prisma.teacher.findUnique({ where: { nuptk } }) : null) ??
      (email ? await this.prisma.teacher.findUnique({ where: { email } }) : null) ??
      (await this.prisma.teacher.findFirst({
        where: { name, deletedAt: null },
      }));

    if (existingTeacher) {
      await this.prisma.teacher.update({
        where: { id: existingTeacher.id },
        data: {
          name,
          nip: nip || existingTeacher.nip,
          nuptk: nuptk || existingTeacher.nuptk,
          email: email || existingTeacher.email,
          phone: phone || existingTeacher.phone,
          telegramId: telegramId || existingTeacher.telegramId,
          isActive,
          deletedAt: null,
        },
      });
      return 'updated';
    }

    await this.prisma.teacher.create({
      data: {
        name,
        nip: nip || null,
        nuptk: nuptk || null,
        email: email || null,
        phone: phone || null,
        telegramId: telegramId || null,
        isActive,
      },
    });
    return 'created';
  }

  private async importSubject(row: ImportRow): Promise<'created' | 'updated' | 'skipped'> {
    const name = this.required(row, ['nama', 'name', 'mata_pelajaran']);
    const code = this.optional(row, ['kode', 'code']);
    const isActive = this.parseActive(this.optional(row, ['status', 'is_active']));

    if (code) {
      const existingByCode = await this.prisma.subject.findUnique({
        where: { code },
      });

      if (existingByCode) {
        await this.prisma.subject.update({
          where: { id: existingByCode.id },
          data: { name, code, isActive, deletedAt: null },
        });
        return 'updated';
      }
    }

    const existingByName = await this.prisma.subject.findFirst({
      where: { name, deletedAt: null },
    });

    if (existingByName) {
      await this.prisma.subject.update({
        where: { id: existingByName.id },
        data: {
          name,
          code: code || existingByName.code,
          isActive,
          deletedAt: null,
        },
      });
      return 'updated';
    }

    await this.prisma.subject.create({
      data: { name, code: code || null, isActive },
    });
    return 'created';
  }

  private async importClass(row: ImportRow): Promise<'created' | 'updated' | 'skipped'> {
    const name = this.required(row, ['nama', 'name', 'kelas']);
    const code = this.optional(row, ['kode', 'code']);
    const grade = this.optional(row, ['tingkat', 'grade']);
    const schoolYear = await this.findSchoolYear(row);
    const homeroomTeacherName = this.optional(row, ['wali_kelas', 'homeroom_teacher']);
    const homeroomTeacher = homeroomTeacherName
      ? await this.prisma.teacher.findFirst({
          where: { name: homeroomTeacherName, deletedAt: null },
        })
      : null;

    const existingClass = await this.prisma.class.findUnique({
      where: { schoolYearId_name: { schoolYearId: schoolYear.id, name } },
    });

    if (existingClass) {
      await this.prisma.class.update({
        where: { id: existingClass.id },
        data: {
          code: code || existingClass.code,
          grade: grade || existingClass.grade,
          homeroomTeacherId: homeroomTeacher?.id ?? existingClass.homeroomTeacherId,
          deletedAt: null,
        },
      });
      return 'updated';
    }

    await this.prisma.class.create({
      data: {
        name,
        code: code || null,
        grade: grade || null,
        homeroomTeacherId: homeroomTeacher?.id,
        schoolYearId: schoolYear.id,
      },
    });
    return 'created';
  }

  private async importStudent(row: ImportRow): Promise<'created' | 'updated' | 'skipped'> {
    const name = this.required(row, ['nama', 'name', 'siswa']);
    const nis = this.optional(row, ['nis']);
    const nisn = this.optional(row, ['nisn']);
    const gender = this.parseGender(this.optional(row, ['jenis_kelamin', 'gender']));
    const birthDate = this.parseDate(this.optional(row, ['tanggal_lahir', 'birth_date']));
    const phone = this.optional(row, ['no_hp_siswa', 'hp_siswa', 'phone_siswa']);
    const className = this.required(row, ['kelas', 'class']);
    const schoolYear = await this.findSchoolYear(row);
    const schoolClass = await this.findClass(schoolYear.id, className);
    const guardianName = this.optional(row, ['nama_wali', 'wali', 'guardian']);
    const guardianPhone = this.optional(row, ['hp_wali', 'telepon_wali', 'phone_wali']);
    const guardianTelegramId = this.optional(row, [
      'telegram_id_wali',
      'telegram_id',
      'telegram',
    ]);
    const guardianAddress = this.optional(row, ['alamat_wali', 'address']);
    const isActive = this.parseActive(this.optional(row, ['status', 'is_active']));

    const existingStudent =
      (nis ? await this.prisma.student.findUnique({ where: { nis } }) : null) ??
      (nisn ? await this.prisma.student.findUnique({ where: { nisn } }) : null) ??
      (await this.prisma.student.findFirst({
        where: { name, deletedAt: null },
      }));

    const student =
      existingStudent ??
      (await this.prisma.student.create({
        data: {
          name,
          nis: nis || null,
          nisn: nisn || null,
          gender,
          birthDate,
          phone: phone || null,
          isActive,
        },
      }));

    if (existingStudent) {
      await this.prisma.student.update({
        where: { id: existingStudent.id },
        data: {
          name,
          nis: nis || existingStudent.nis,
          nisn: nisn || existingStudent.nisn,
          gender: gender ?? existingStudent.gender,
          birthDate: birthDate ?? existingStudent.birthDate,
          phone: phone || existingStudent.phone,
          isActive,
          deletedAt: null,
        },
      });
    }

    await this.prisma.studentEnrollment.upsert({
      where: {
        studentId_classId_schoolYearId: {
          studentId: student.id,
          classId: schoolClass.id,
          schoolYearId: schoolYear.id,
        },
      },
      update: { isActive: true, endedAt: null, deletedAt: null },
      create: {
        studentId: student.id,
        classId: schoolClass.id,
        schoolYearId: schoolYear.id,
        isActive: true,
      },
    });

    if (guardianName) {
      const guardian = await this.findOrCreateGuardian({
        name: guardianName,
        phone: guardianPhone,
        telegramId: guardianTelegramId,
        address: guardianAddress,
      });

      await this.prisma.studentGuardian.upsert({
        where: {
          studentId_guardianId: {
            studentId: student.id,
            guardianId: guardian.id,
          },
        },
        update: { isPrimary: true, deletedAt: null },
        create: {
          studentId: student.id,
          guardianId: guardian.id,
          relation: GuardianRelation.GUARDIAN,
          isPrimary: true,
        },
      });
    }

    return existingStudent ? 'updated' : 'created';
  }

  private async importSchedule(row: ImportRow): Promise<'created' | 'updated' | 'skipped'> {
    const schoolYear = await this.findSchoolYear(row);
    const semester = await this.findSemester(schoolYear.id, row);
    const schoolClass = await this.findClass(
      schoolYear.id,
      this.required(row, ['kelas', 'class']),
    );
    const subject = await this.findSubject(row);
    const teacher = await this.findTeacher(row);
    const dayOfWeek = this.parseDay(this.required(row, ['hari', 'day', 'day_of_week']));
    const startsAt = this.required(row, ['mulai', 'starts_at', 'jam_mulai']);
    const endsAt = this.required(row, ['selesai', 'ends_at', 'jam_selesai']);
    const room = this.optional(row, ['ruang', 'room']);
    const isActive = this.parseActive(this.optional(row, ['status', 'is_active']));

    const existingSchedule = await this.prisma.schedule.findFirst({
      where: {
        schoolYearId: schoolYear.id,
        semesterId: semester.id,
        classId: schoolClass.id,
        subjectId: subject.id,
        teacherId: teacher.id,
        dayOfWeek,
        startsAt,
        endsAt,
        room: room || null,
        deletedAt: null,
      },
    });

    if (existingSchedule) {
      return 'skipped';
    }

    await this.prisma.schedule.create({
      data: {
        schoolYearId: schoolYear.id,
        semesterId: semester.id,
        classId: schoolClass.id,
        subjectId: subject.id,
        teacherId: teacher.id,
        dayOfWeek,
        startsAt,
        endsAt,
        room: room || null,
        isActive,
      },
    });

    return 'created';
  }

  private async findSchoolYear(row: ImportRow) {
    const name = this.required(row, ['tahun_ajaran', 'school_year']);
    const schoolYear = await this.prisma.schoolYear.findFirst({
      where: { name, deletedAt: null },
    });

    if (!schoolYear) {
      throw new BadRequestException(`Tahun ajaran ${name} tidak ditemukan`);
    }

    return schoolYear;
  }

  private async findSemester(schoolYearId: string, row: ImportRow) {
    const value = this.required(row, ['semester']);
    const type = ['ganjil', 'odd', '1'].includes(value.toLowerCase())
      ? SemesterType.ODD
      : SemesterType.EVEN;
    const semester = await this.prisma.semester.findUnique({
      where: { schoolYearId_type: { schoolYearId, type } },
    });

    if (!semester) {
      throw new BadRequestException(`Semester ${value} tidak ditemukan`);
    }

    return semester;
  }

  private async findClass(schoolYearId: string, name: string) {
    const schoolClass =
      (await this.prisma.class.findUnique({
        where: { schoolYearId_name: { schoolYearId, name } },
      })) ??
      (await this.prisma.class.findFirst({
        where: { schoolYearId, code: name, deletedAt: null },
      }));

    if (!schoolClass) {
      throw new BadRequestException(`Kelas ${name} tidak ditemukan`);
    }

    return schoolClass;
  }

  private async findSubject(row: ImportRow) {
    const code = this.optional(row, ['kode_mapel', 'kode', 'subject_code']);
    const name = this.optional(row, ['mapel', 'mata_pelajaran', 'subject']);
    const subject = code
      ? await this.prisma.subject.findUnique({ where: { code } })
      : await this.prisma.subject.findFirst({ where: { name, deletedAt: null } });

    if (!subject) {
      throw new BadRequestException(`Mapel ${code || name} tidak ditemukan`);
    }

    return subject;
  }

  private async findTeacher(row: ImportRow) {
    const name = this.required(row, ['guru', 'teacher']);
    const teacher = await this.prisma.teacher.findFirst({
      where: { name, deletedAt: null },
    });

    if (!teacher) {
      throw new BadRequestException(`Guru ${name} tidak ditemukan`);
    }

    return teacher;
  }

  private async findOrCreateGuardian(data: {
    name: string;
    phone?: string;
    telegramId?: string;
    address?: string;
  }) {
    const existingGuardian = data.phone
      ? await this.prisma.guardian.findFirst({
          where: { phone: data.phone, deletedAt: null },
        })
      : await this.prisma.guardian.findFirst({
          where: { name: data.name, deletedAt: null },
        });

    if (existingGuardian) {
      return this.prisma.guardian.update({
        where: { id: existingGuardian.id },
        data: {
          name: data.name,
          phone: data.phone || existingGuardian.phone,
          telegramId: data.telegramId || existingGuardian.telegramId,
          address: data.address || existingGuardian.address,
          isActive: true,
        },
      });
    }

    return this.prisma.guardian.create({
      data: {
        name: data.name,
        phone: data.phone || null,
        telegramId: data.telegramId || null,
        address: data.address || null,
      },
    });
  }

  private parseGender(value: string) {
    if (!value) {
      return undefined;
    }

    const normalizedValue = value.toLowerCase();

    if (['l', 'laki-laki', 'male', 'm'].includes(normalizedValue)) {
      return Gender.MALE;
    }

    if (['p', 'perempuan', 'female', 'f'].includes(normalizedValue)) {
      return Gender.FEMALE;
    }

    throw new BadRequestException(`Jenis kelamin ${value} tidak valid`);
  }

  private parseDate(value: string) {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Tanggal ${value} tidak valid`);
    }

    return date;
  }

  private parseActive(value: string) {
    if (!value) {
      return true;
    }

    const normalizedValue = value.toLowerCase();

    return !['nonaktif', 'inactive', 'false', '0', 'tidak'].includes(normalizedValue);
  }

  private parseDay(value: string) {
    const normalizedValue = value.toLowerCase();
    const dayMap: Record<string, number> = {
      senin: 1,
      monday: 1,
      selasa: 2,
      tuesday: 2,
      rabu: 3,
      wednesday: 3,
      kamis: 4,
      thursday: 4,
      jumat: 5,
      friday: 5,
      sabtu: 6,
      saturday: 6,
      minggu: 7,
      sunday: 7,
    };

    const day = dayMap[normalizedValue] ?? Number(value);

    if (!Number.isInteger(day) || day < 1 || day > 7) {
      throw new BadRequestException(`Hari ${value} tidak valid`);
    }

    return day;
  }

  private required(row: ImportRow, keys: string[]) {
    const value = this.optional(row, keys);

    if (!value) {
      throw new BadRequestException(`Kolom ${keys.join('/')} wajib diisi`);
    }

    return value;
  }

  private optional(row: ImportRow, keys: string[]) {
    for (const key of keys) {
      if (row[key]) {
        return row[key];
      }
    }

    return '';
  }
}
