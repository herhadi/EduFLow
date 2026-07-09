import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssessmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SaveAssessmentScoresDto } from './dto/save-assessment-scores.dto';

@Injectable()
export class StudentGradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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
