import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssessmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReportExportService, type ReportRow } from '../reporting/report-export.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SaveAssessmentScoresDto } from './dto/save-assessment-scores.dto';

type AssessmentExportQuery = {
  classId?: string;
  from?: string;
  schoolYearId?: string;
  semesterId?: string;
  subjectId?: string;
  to?: string;
};

type AssessmentExportData = {
  componentRows: ReportRow[];
  filename: string;
  meta: Record<string, string | number>;
  noteRows: ReportRow[];
  recapRows: ReportRow[];
};

@Injectable()
export class StudentGradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly reportExport: ReportExportService,
  ) {}

  async getMine(userId: string, query: { classId?: string; subjectId?: string; semesterId?: string }) {
    const teacher = await this.getTeacher(userId);

    return {
      data: await this.prisma.assessment.findMany({
        where: {
          teacherId: teacher.id,
          deletedAt: null,
          ...(query.classId ? { classId: query.classId } : {}),
          ...(query.subjectId ? { subjectId: query.subjectId } : {}),
          ...(query.semesterId ? { semesterId: query.semesterId } : {}),
        },
        include: {
          class: true,
          subject: true,
          schoolYear: true,
          semester: true,
          scores: true,
        },
        orderBy: [{ assessmentDate: 'desc' }, { updatedAt: 'desc' }],
      }),
    };
  }

  async getDetail(userId: string, id: string) {
    const teacher = await this.getTeacher(userId);
    const assessment = await this.prisma.assessment.findFirst({
      where: { id, teacherId: teacher.id, deletedAt: null },
      include: this.assessmentDetailInclude(),
    });

    if (!assessment) {
      throw new NotFoundException('Penilaian tidak ditemukan');
    }

    return { data: assessment };
  }

  async create(userId: string, dto: CreateAssessmentDto) {
    const teacher = await this.getTeacher(userId);
    await this.ensureTeacherCanAssess(teacher.id, dto);
    const assessmentDate = this.toDateOnly(dto.assessmentDate);
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        classId: dto.classId,
        schoolYearId: dto.schoolYearId,
        isActive: true,
        deletedAt: null,
        student: { deletedAt: null, isActive: true },
      },
      include: { student: true },
      orderBy: { student: { name: 'asc' } },
    });

    if (!enrollments.length) {
      throw new BadRequestException('Kelas belum memiliki siswa aktif');
    }

    const assessment = await this.prisma.assessment.create({
      data: {
        teacherId: teacher.id,
        schoolYearId: dto.schoolYearId,
        semesterId: dto.semesterId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        title: dto.title.trim(),
        type: dto.type,
        assessmentDate,
        maxScore: dto.maxScore ?? 100,
        weight: dto.weight ?? 1,
        notes: dto.notes?.trim() || null,
        scores: {
          create: enrollments.map((enrollment) => ({
            enrollmentId: enrollment.id,
            studentId: enrollment.studentId,
          })),
        },
      },
      include: this.assessmentDetailInclude(),
    });

    await this.audit.record({
      action: 'assessment.created',
      entityType: 'Assessment',
      entityId: assessment.id,
      after: assessment,
      userId,
    });

    return { data: assessment, message: 'Komponen nilai dibuat sebagai draft.' };
  }

  async saveScores(userId: string, id: string, dto: SaveAssessmentScoresDto) {
    const assessment = await this.getOwnedEditableAssessment(userId, id);
    const maxScore = Number(assessment.maxScore);
    const scoreIds = new Set(assessment.scores.map((score) => score.id));

    for (const score of dto.scores) {
      if (!scoreIds.has(score.scoreId)) {
        throw new BadRequestException('Baris nilai tidak sesuai dengan penilaian ini');
      }

      if (score.score !== null && score.score !== undefined && score.score > maxScore) {
        throw new BadRequestException(`Nilai tidak boleh lebih dari ${maxScore}`);
      }
    }

    await this.prisma.$transaction(
      dto.scores.map((score) =>
        this.prisma.assessmentScore.update({
          where: { id: score.scoreId },
          data: {
            score: score.score === null || score.score === undefined ? null : score.score,
            notes: score.notes?.trim() || null,
          },
        }),
      ),
    );

    const updated = await this.prisma.assessment.findUniqueOrThrow({
      where: { id },
      include: this.assessmentDetailInclude(),
    });

    await this.audit.record({
      action: 'assessment.scores-saved',
      entityType: 'Assessment',
      entityId: id,
      before: assessment,
      after: updated,
      userId,
    });

    return { data: updated, message: 'Draft nilai disimpan.' };
  }

  async submit(userId: string, id: string) {
    const assessment = await this.getOwnedEditableAssessment(userId, id);
    const emptyScores = assessment.scores.filter((score) => score.score === null);

    if (emptyScores.length) {
      throw new BadRequestException('Semua siswa wajib memiliki nilai sebelum submit');
    }

    const submitted = await this.prisma.assessment.update({
      where: { id },
      data: {
        status: AssessmentStatus.SUBMITTED,
        submittedAt: new Date(),
        submittedById: userId,
      },
      include: this.assessmentDetailInclude(),
    });

    await this.audit.record({
      action: 'assessment.submitted',
      entityType: 'Assessment',
      entityId: id,
      before: assessment,
      after: submitted,
      userId,
    });

    return { data: submitted, message: 'Nilai disubmit.' };
  }

  async exportMine(userId: string, query: AssessmentExportQuery) {
    const exportData = await this.buildExportData(userId, query);

    return {
      buffer: this.reportExport.toExcelWorkbook([
        { name: 'Rekap', rows: exportData.recapRows },
        { name: 'Komponen', rows: exportData.componentRows },
        { name: 'Catatan', rows: exportData.noteRows },
      ]),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: exportData.filename,
    };
  }

  async previewMine(userId: string, query: AssessmentExportQuery) {
    const exportData = await this.buildExportData(userId, query);

    return {
      data: {
        components: exportData.componentRows,
        filename: exportData.filename,
        meta: exportData.meta,
        notes: exportData.noteRows,
        recap: exportData.recapRows,
      },
    };
  }

  private async buildExportData(userId: string, query: AssessmentExportQuery): Promise<AssessmentExportData> {
    if (!query.schoolYearId || !query.semesterId || !query.classId || !query.subjectId) {
      throw new BadRequestException('Tahun ajaran, semester, kelas, dan mapel wajib dipilih untuk export nilai');
    }

    const teacher = await this.getTeacher(userId);
    const [schoolYear, semester, schoolClass, subject] = await Promise.all([
      this.prisma.schoolYear.findFirst({
        where: { id: query.schoolYearId, deletedAt: null },
      }),
      this.prisma.semester.findFirst({
        where: { id: query.semesterId, schoolYearId: query.schoolYearId, deletedAt: null },
      }),
      this.prisma.class.findFirst({
        where: { id: query.classId, schoolYearId: query.schoolYearId, deletedAt: null },
      }),
      this.prisma.subject.findFirst({
        where: { id: query.subjectId, deletedAt: null },
      }),
    ]);

    if (!schoolYear || !semester || !schoolClass || !subject) {
      throw new BadRequestException('Filter export nilai tidak sesuai data akademik');
    }

    const dateFilter = this.getAssessmentDateFilter(query.from, query.to);
    const [assessments, enrollments] = await Promise.all([
      this.prisma.assessment.findMany({
        where: {
          teacherId: teacher.id,
          schoolYearId: query.schoolYearId,
          semesterId: query.semesterId,
          classId: query.classId,
          subjectId: query.subjectId,
          deletedAt: null,
          ...(dateFilter ? { assessmentDate: dateFilter } : {}),
        },
        include: {
          class: true,
          subject: true,
          teacher: true,
          scores: {
            include: {
              student: true,
            },
          },
        },
        orderBy: [{ assessmentDate: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.studentEnrollment.findMany({
        where: {
          classId: query.classId,
          schoolYearId: query.schoolYearId,
          isActive: true,
          deletedAt: null,
          student: { deletedAt: null, isActive: true },
        },
        include: { student: true },
        orderBy: { student: { name: 'asc' } },
      }),
    ]);

    const assessmentCodes = assessments.map((assessment, index) => ({
      assessment,
      code: `UH ${index + 1}`,
    }));
    const scoresByAssessmentEnrollment = new Map(
      assessments.flatMap((assessment) =>
        assessment.scores.map((score) => [`${assessment.id}:${score.enrollmentId}`, score] as const),
      ),
    );
    const periodLabel = query.from || query.to
      ? `${query.from ?? 'awal'} s.d. ${query.to ?? 'akhir'}`
      : `${semester.type === 'ODD' ? 'Ganjil' : 'Genap'} ${schoolYear.name}`;

    const recapRows = enrollments.map((enrollment, index) => {
      const scoreValues = assessmentCodes.map(({ assessment }) => {
        const score = scoresByAssessmentEnrollment.get(`${assessment.id}:${enrollment.id}`);
        return score?.score === null || score?.score === undefined ? null : Number(score.score);
      });
      const filledScores = scoreValues.filter((score): score is number => score !== null);
      const average = filledScores.length
        ? Math.round((filledScores.reduce((total, score) => total + score, 0) / filledScores.length) * 100) / 100
        : null;
      const row: ReportRow = {
        No: index + 1,
        NIS: enrollment.student.nis ?? '-',
        NISN: enrollment.student.nisn ?? '-',
        'Nama Siswa': enrollment.student.name,
        Kelas: schoolClass.name,
        Mapel: subject.name,
        Periode: periodLabel,
      };

      assessmentCodes.forEach(({ code }, scoreIndex) => {
        row[code] = scoreValues[scoreIndex];
      });

      row['Rata-rata'] = average;
      row['Komponen Terisi'] = filledScores.length;
      row['Belum Terisi'] = Math.max(0, assessments.length - filledScores.length);
      row.Status = assessments.length === 0
        ? 'Belum ada komponen'
        : filledScores.length === assessments.length
          ? 'Lengkap'
          : 'Belum lengkap';

      return row;
    });
    const componentRows: ReportRow[] = assessmentCodes.map(({ assessment, code }) => ({
      Kode: code,
      Judul: assessment.title,
      Jenis: assessment.type,
      Tanggal: this.formatDateOnly(assessment.assessmentDate),
      'Skor Maks': Number(assessment.maxScore),
      Bobot: Number(assessment.weight),
      Status: assessment.status,
      Guru: assessment.teacher.name,
      Catatan: assessment.notes ?? '',
    }));
    const noteRows: ReportRow[] = [];

    for (const { assessment, code } of assessmentCodes) {
      for (const enrollment of enrollments) {
        const score = scoresByAssessmentEnrollment.get(`${assessment.id}:${enrollment.id}`);

        if (score && !score.notes && score.score !== null) {
          continue;
        }

        noteRows.push({
          Kode: code,
          Komponen: assessment.title,
          Tanggal: this.formatDateOnly(assessment.assessmentDate),
          NIS: enrollment.student.nis ?? '-',
          'Nama Siswa': enrollment.student.name,
          Nilai: score?.score === null || score?.score === undefined ? null : Number(score.score),
          Catatan: score?.notes ?? 'Nilai belum diisi',
        });
      }
    }
    const filename = this.toExportFilename({
      className: schoolClass.name,
      from: query.from,
      schoolYearName: schoolYear.name,
      semesterType: semester.type,
      subjectName: subject.name,
      to: query.to,
    });

    return {
      componentRows,
      filename,
      meta: {
        'Tahun Ajaran': schoolYear.name,
        Semester: semester.type === 'ODD' ? 'Ganjil' : 'Genap',
        Kelas: schoolClass.name,
        Mapel: subject.name,
        Guru: teacher.name,
        Periode: periodLabel,
        'Jumlah Siswa': enrollments.length,
        'Jumlah Komponen': assessments.length,
      },
      noteRows,
      recapRows,
    };
  }

  private async getOwnedEditableAssessment(userId: string, id: string) {
    const teacher = await this.getTeacher(userId);
    const assessment = await this.prisma.assessment.findFirst({
      where: { id, teacherId: teacher.id, deletedAt: null },
      include: this.assessmentDetailInclude(),
    });

    if (!assessment) {
      throw new NotFoundException('Penilaian tidak ditemukan');
    }

    if (
      assessment.status !== AssessmentStatus.DRAFT &&
      assessment.status !== AssessmentStatus.REVISION_REQUESTED
    ) {
      throw new BadRequestException('Nilai tidak dapat diubah pada status ini');
    }

    return assessment;
  }

  private async ensureTeacherCanAssess(teacherId: string, dto: CreateAssessmentDto) {
    const [schoolClass, semester, assignment] = await Promise.all([
      this.prisma.class.findFirst({
        where: {
          id: dto.classId,
          schoolYearId: dto.schoolYearId,
          deletedAt: null,
        },
      }),
      this.prisma.semester.findFirst({
        where: {
          id: dto.semesterId,
          schoolYearId: dto.schoolYearId,
          deletedAt: null,
        },
      }),
      this.prisma.teacherSchoolYearAssignment.findFirst({
        where: {
          teacherId,
          schoolYearId: dto.schoolYearId,
          status: 'ACTIVE',
          subjects: { some: { subjectId: dto.subjectId } },
        },
      }),
    ]);

    if (!schoolClass) {
      throw new BadRequestException('Kelas tidak sesuai tahun ajaran');
    }

    if (!semester) {
      throw new BadRequestException('Semester tidak sesuai tahun ajaran');
    }

    if (!assignment) {
      throw new BadRequestException('Guru belum ditugaskan mengampu mapel ini pada tahun ajaran tersebut');
    }
  }

  private async getTeacher(userId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId, deletedAt: null, isActive: true },
    });

    if (!teacher) {
      throw new NotFoundException('Akun belum terhubung dengan data guru');
    }

    return teacher;
  }

  private toDateOnly(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Tanggal penilaian tidak valid');
    }

    date.setHours(0, 0, 0, 0);
    return date;
  }

  private getAssessmentDateFilter(from?: string, to?: string) {
    if (!from && !to) {
      return undefined;
    }

    return {
      ...(from ? { gte: this.toDateOnly(from) } : {}),
      ...(to ? { lte: this.toDateOnly(to) } : {}),
    };
  }

  private formatDateOnly(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private toExportFilename({
    className,
    from,
    schoolYearName,
    semesterType,
    subjectName,
    to,
  }: {
    className: string;
    from?: string;
    schoolYearName: string;
    semesterType: string;
    subjectName: string;
    to?: string;
  }) {
    const period = from || to
      ? `${from ?? 'awal'}-${to ?? 'akhir'}`
      : `${semesterType.toLowerCase()}-${schoolYearName}`;
    return `nilai-harian-${className}-${subjectName}-${period}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120)
      .concat('.xlsx');
  }

  private assessmentDetailInclude() {
    return {
      class: true,
      subject: true,
      schoolYear: true,
      semester: true,
      teacher: true,
      scores: {
        include: {
          student: true,
          enrollment: true,
        },
        orderBy: { student: { name: 'asc' } },
      },
    } satisfies Prisma.AssessmentInclude;
  }
}
