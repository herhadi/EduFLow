import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequestWithUser } from '../../core/http/request-with-user';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SaveAssessmentScoresDto } from './dto/save-assessment-scores.dto';
import { StudentGradesService } from './student-grades.service';

@Controller('student-grades')
export class StudentGradesController {
  constructor(private readonly service: StudentGradesService) {}

  @RequirePermissions(PERMISSIONS.STUDENT_GRADE_READ)
  @Get('assessments/mine')
  getMine(
    @Req() request: RequestWithUser,
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('semesterId') semesterId?: string,
  ) {
    return this.service.getMine(request.user.id, { classId, semesterId, subjectId });
  }

  @RequirePermissions(PERMISSIONS.STUDENT_GRADE_READ)
  @Get('assessments/export-preview')
  previewExport(
    @Req() request: RequestWithUser,
    @Query('schoolYearId') schoolYearId: string | undefined,
    @Query('semesterId') semesterId: string | undefined,
    @Query('classId') classId: string | undefined,
    @Query('subjectId') subjectId: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
  ) {
    return this.service.previewMine(request.user.id, {
      classId,
      from,
      schoolYearId,
      semesterId,
      subjectId,
      to,
    });
  }

  @RequirePermissions(PERMISSIONS.STUDENT_GRADE_READ)
  @Get('assessments/export')
  async exportMine(
    @Req() request: RequestWithUser,
    @Query('schoolYearId') schoolYearId: string | undefined,
    @Query('semesterId') semesterId: string | undefined,
    @Query('classId') classId: string | undefined,
    @Query('subjectId') subjectId: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() response: Response,
  ) {
    const exportedReport = await this.service.exportMine(request.user.id, {
      classId,
      from,
      schoolYearId,
      semesterId,
      subjectId,
      to,
    });

    response.setHeader('Content-Type', exportedReport.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportedReport.filename}"`,
    );
    response.send(exportedReport.buffer);
  }

  @RequirePermissions(PERMISSIONS.STUDENT_GRADE_READ)
  @Get('assessments/:id')
  getDetail(@Req() request: RequestWithUser, @Param('id') id: string) {
    return this.service.getDetail(request.user.id, id);
  }

  @RequirePermissions(PERMISSIONS.STUDENT_GRADE_MANAGE)
  @Post('assessments')
  create(@Req() request: RequestWithUser, @Body() dto: CreateAssessmentDto) {
    return this.service.create(request.user.id, dto);
  }

  @RequirePermissions(PERMISSIONS.STUDENT_GRADE_MANAGE)
  @Patch('assessments/:id/scores')
  saveScores(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: SaveAssessmentScoresDto,
  ) {
    return this.service.saveScores(request.user.id, id, dto);
  }

  @RequirePermissions(PERMISSIONS.STUDENT_GRADE_MANAGE)
  @Post('assessments/:id/submit')
  submit(@Req() request: RequestWithUser, @Param('id') id: string) {
    return this.service.submit(request.user.id, id);
  }
}
