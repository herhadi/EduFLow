import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequestWithUser } from '../../core/http/request-with-user';
import { ExtracurricularService } from './extracurricular.service';

@Controller('extracurricular')
export class ExtracurricularController {
  constructor(private readonly service: ExtracurricularService) {}

  @RequirePermissions(PERMISSIONS.ACADEMIC_READ)
  @Get('programs')
  list(@Query('schoolYearId') schoolYearId?: string) { return this.service.listPrograms(schoolYearId); }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Post('programs')
  create(@Body() body: Parameters<ExtracurricularService['createProgram']>[0]) { return this.service.createProgram(body); }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Patch('programs/:id')
  updateProgram(@Param('id') id: string, @Body() body: Parameters<ExtracurricularService['updateProgram']>[1]) { return this.service.updateProgram(id, body); }
  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Post('programs/:id/archive')
  archiveProgram(@Param('id') id: string) { return this.service.archiveProgram(id); }
  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Post('programs/:id/sync-mandatory-members')
  syncMandatoryMembers(@Param('id') id: string) { return this.service.syncMandatoryMembers(id); }
  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Get('reports')
  report(@Query('programId') programId?: string, @Query('from') from?: string, @Query('to') to?: string) { return this.service.report(programId, from, to); }
  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Post('programs/:id/advisors')
  advisors(@Param('id') id: string, @Body() body: { teacherIds: string[] }) { return this.service.assignAdvisors(id, body.teacherIds ?? []); }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Post('programs/:id/members')
  members(@Param('id') id: string, @Body() body: { members: Array<{ studentId: string; enrollmentType?: 'MANDATORY' | 'VOLUNTARY' }> }) { return this.service.setMembers(id, body.members ?? []); }

  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  @Get('me/programs')
  myPrograms(@Req() req: RequestWithUser) { return this.service.myPrograms(req.user.id); }

  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  @Post('programs/:id/sessions')
  createSession(@Param('id') id: string, @Body() body: { startsAt: string; endsAt?: string; location?: string; activityNotes?: string }, @Req() req: RequestWithUser) { return this.service.createSession(id, req.user.id, body); }

  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  @Get('sessions/:id')
  getSession(@Param('id') id: string, @Req() req: RequestWithUser) { return this.service.getSession(id, req.user.id); }

  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  @Post('sessions/:id/attendance')
  updateAttendance(@Param('id') id: string, @Body() body: { items: Array<{ studentId: string; status: 'PRESENT' | 'SICK' | 'EXCUSED' | 'ABSENT'; notes?: string }> }, @Req() req: RequestWithUser) { return this.service.updateAttendance(id, req.user.id, body.items ?? []); }

  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  @Post('sessions/:id/corrections')
  correct(@Param('id') id: string, @Body() body: { items: Array<{ studentId: string; status: 'PRESENT' | 'SICK' | 'EXCUSED' | 'ABSENT'; reason: string }> }, @Req() req: RequestWithUser) { return this.service.correctSubmittedAttendance(id, req.user.id, body.items ?? []); }
  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  @Post('sessions/:id/submit')
  submit(@Param('id') id: string, @Req() req: RequestWithUser) { return this.service.submitSession(id, req.user.id); }
}
