import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequestWithUser } from '../../core/http/request-with-user';
import { AcademicService } from './academic.service';
import { ConfigureTeacherAccountDto } from './dto/configure-teacher-account.dto';
import { CloneSchoolYearMasterDto } from './dto/clone-school-year-master.dto';
import { CreateAcademicTimeSlotDto } from './dto/create-academic-time-slot.dto';
import { CreateAcademicCalendarEventDto } from './dto/create-academic-calendar-event.dto';
import { CreateBulkScheduleDto } from './dto/create-bulk-schedule.dto';
import { UpdateClassTimeSlotActivityDto } from './dto/update-class-time-slot-activity.dto';
import { UpdateAcademicCalendarEventDto } from './dto/update-academic-calendar-event.dto';
import { UpdateAcademicTimeSlotDto } from './dto/update-academic-time-slot.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { GenerateAgendaDto } from './dto/generate-agenda.dto';
import { GenerateBulkAgendaDto } from './dto/generate-bulk-agenda.dto';
import { AssignSubstituteTeacherDto } from './dto/assign-substitute-teacher.dto';
import { SetClassHomeroomTeacherDto } from './dto/set-class-homeroom-teacher.dto';
import { SetTeacherSubjectsDto } from './dto/set-teacher-subjects.dto';
import { SetTeacherSchoolYearAssignmentDto } from './dto/set-teacher-school-year-assignment.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Controller('academic')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  @Public()
  @Get('school-years')
  getSchoolYears() {
    return this.academicService.getSchoolYears();
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Post('school-years')
  createSchoolYear(@Body() dto: CreateSchoolYearDto) {
    return this.academicService.createSchoolYear(dto);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Post('school-years/clone-master')
  cloneSchoolYearMaster(@Body() dto: CloneSchoolYearMasterDto) {
    return this.academicService.cloneSchoolYearMaster(dto);
  }

  @Public()
  @Get('semesters')
  getSemesters(@Query('schoolYearId') schoolYearId?: string) {
    return this.academicService.getSemesters(schoolYearId);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_CALENDAR_READ)
  @Get('calendar/events')
  getAcademicCalendarEvents(@Query('schoolYearId') schoolYearId?: string) {
    return this.academicService.getAcademicCalendarEvents(schoolYearId);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_CALENDAR_MANAGE)
  @Post('calendar/events')
  createAcademicCalendarEvent(@Body() dto: CreateAcademicCalendarEventDto) {
    return this.academicService.createAcademicCalendarEvent(dto);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_CALENDAR_MANAGE)
  @Patch('calendar/events/:id')
  updateAcademicCalendarEvent(
    @Param('id') id: string,
    @Body() dto: UpdateAcademicCalendarEventDto,
  ) {
    return this.academicService.updateAcademicCalendarEvent(id, dto);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_CALENDAR_MANAGE)
  @Delete('calendar/events/:id')
  deleteAcademicCalendarEvent(@Param('id') id: string) {
    return this.academicService.deleteAcademicCalendarEvent(id);
  }

  @Get('classes')
  @RequirePermissions(PERMISSIONS.ACADEMIC_READ)
  getClasses(@Query('schoolYearId') schoolYearId?: string) {
    return this.academicService.getClasses(schoolYearId);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Post('classes')
  createClass(@Body() dto: CreateClassDto) {
    return this.academicService.createClass(dto);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Delete('classes/:id')
  deleteClass(@Param('id') id: string) {
    return this.academicService.deleteClass(id);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Patch('classes/:id/homeroom-teacher')
  setClassHomeroomTeacher(
    @Param('id') id: string,
    @Body() dto: SetClassHomeroomTeacherDto,
  ) {
    return this.academicService.setClassHomeroomTeacher(id, dto);
  }

  @Get('subjects')
  @RequirePermissions(PERMISSIONS.ACADEMIC_READ)
  getSubjects() {
    return this.academicService.getSubjects();
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Post('subjects')
  createSubject(@Body() dto: CreateSubjectDto) {
    return this.academicService.createSubject(dto);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Delete('subjects/:id')
  deleteSubject(@Param('id') id: string) {
    return this.academicService.deleteSubject(id);
  }

  @Get('teachers')
  @RequirePermissions(PERMISSIONS.ACADEMIC_READ)
  getTeachers() {
    return this.academicService.getTeachers();
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Post('teachers')
  createTeacher(@Body() dto: CreateTeacherDto) {
    return this.academicService.createTeacher(dto);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Patch('teachers/:id')
  updateTeacher(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
    return this.academicService.updateTeacher(id, dto);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Post('teachers/:id/photo')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      const supported = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
      callback(supported ? null : new BadRequestException('Foto guru harus JPEG, PNG, atau WebP'), supported);
    },
  }))
  uploadTeacherPhoto(
    @Param('id') id: string,
    @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    if (!file) throw new BadRequestException('Foto guru wajib dipilih');
    return this.academicService.uploadTeacherPhoto(id, file);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Patch('teachers/:id/account')
  configureTeacherAccount(
    @Param('id') id: string,
    @Body() dto: ConfigureTeacherAccountDto,
  ) {
    return this.academicService.configureTeacherAccount(id, dto);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Post('teachers/:id/reset-password')
  resetTeacherPassword(@Param('id') id: string) {
    return this.academicService.resetTeacherPassword(id);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Patch('teachers/:id/subjects')
  setTeacherSubjects(
    @Param('id') id: string,
    @Body() dto: SetTeacherSubjectsDto,
  ) {
    return this.academicService.setTeacherSubjects(id, dto);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_READ)
  @Get('teachers/:id/assignments')
  getTeacherSchoolYearAssignments(@Param('id') id: string) {
    return this.academicService.getTeacherSchoolYearAssignments(id);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Patch('teachers/:id/assignments/:schoolYearId')
  setTeacherSchoolYearAssignment(
    @Param('id') id: string,
    @Param('schoolYearId') schoolYearId: string,
    @Body() dto: SetTeacherSchoolYearAssignmentDto,
  ) {
    return this.academicService.setTeacherSchoolYearAssignment(id, schoolYearId, dto);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Delete('teachers/:id')
  deleteTeacher(@Param('id') id: string) {
    return this.academicService.deleteTeacher(id);
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Delete('teachers/:id/permanent')
  deleteTeacherPermanently(@Param('id') id: string) {
    return this.academicService.deleteTeacherPermanently(id);
  }

  @Get('students')
  @RequirePermissions(PERMISSIONS.ACADEMIC_READ)
  getStudents(@Query('classId') classId?: string) {
    return this.academicService.getStudents(classId);
  }

  @Get('schedules')
  @RequirePermissions(PERMISSIONS.SCHEDULE_READ)
  getSchedules(@Query('classId') classId?: string) {
    return this.academicService.getSchedules(classId);
  }

  @Get('time-slots')
  @RequirePermissions(PERMISSIONS.SCHEDULE_READ)
  getTimeSlots(@Query('schoolYearId') schoolYearId?: string) {
    return this.academicService.getTimeSlots(schoolYearId);
  }

  @RequirePermissions(PERMISSIONS.SCHEDULE_MANAGE)
  @Post('time-slots')
  createTimeSlot(@Body() dto: CreateAcademicTimeSlotDto) {
    return this.academicService.createTimeSlot(dto);
  }

  @RequirePermissions(PERMISSIONS.SCHEDULE_MANAGE)
  @Patch('time-slots/:id')
  updateTimeSlot(@Param('id') id: string, @Body() dto: UpdateAcademicTimeSlotDto) {
    return this.academicService.updateTimeSlot(id, dto);
  }

  @RequirePermissions(PERMISSIONS.SCHEDULE_MANAGE)
  @Delete('time-slots/:id')
  deleteTimeSlot(@Param('id') id: string) {
    return this.academicService.deleteTimeSlot(id);
  }

  @Get('classes/:classId/time-slot-activities')
  @RequirePermissions(PERMISSIONS.SCHEDULE_READ)
  getClassTimeSlotActivities(@Param('classId') classId: string) {
    return this.academicService.getClassTimeSlotActivities(classId);
  }

  @RequirePermissions(PERMISSIONS.SCHEDULE_MANAGE)
  @Patch('classes/:classId/time-slot-activities/:timeSlotId')
  updateClassTimeSlotActivity(
    @Param('classId') classId: string,
    @Param('timeSlotId') timeSlotId: string,
    @Body() dto: UpdateClassTimeSlotActivityDto,
  ) {
    return this.academicService.updateClassTimeSlotActivity(classId, timeSlotId, dto);
  }

  @Get('me/schedules')
  getMySchedules(@Req() request: RequestWithUser) {
    return this.academicService.getMySchedules(request.user.id);
  }

  @Get('me/subjects')
  getMySubjects(@Req() request: RequestWithUser) {
    return this.academicService.getMySubjects(request.user.id);
  }

  @Get('me/agendas')
  getMyAgendas(
    @Req() request: RequestWithUser,
    @Query('date') date?: string,
  ) {
    return this.academicService.getMyAgendas(request.user.id, date);
  }

  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  @Get('me/homeroom')
  getMyHomeroom(@Req() request: RequestWithUser) {
    return this.academicService.getMyHomeroom(request.user.id);
  }

  @RequirePermissions(PERMISSIONS.SCHEDULE_READ)
  @Get('schedules/:id')
  getSchedule(@Param('id') id: string) {
    return this.academicService.getSchedule(id);
  }

  @RequirePermissions(PERMISSIONS.SCHEDULE_MANAGE)
  @Post('schedules')
  createSchedule(@Body() dto: CreateScheduleDto) {
    return this.academicService.createSchedule(dto);
  }

  @RequirePermissions(PERMISSIONS.SCHEDULE_MANAGE)
  @Post('schedules/bulk')
  createBulkSchedule(@Body() dto: CreateBulkScheduleDto) {
    return this.academicService.createBulkSchedule(dto);
  }

  @RequirePermissions(PERMISSIONS.SCHEDULE_MANAGE)
  @Patch('schedules/:id')
  updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.academicService.updateSchedule(id, dto);
  }

  @RequirePermissions(PERMISSIONS.SCHEDULE_READ)
  @Get('schedules/:id/revisions')
  getScheduleRevisions(@Param('id') id: string) {
    return this.academicService.getScheduleRevisions(id);
  }

  @RequirePermissions(PERMISSIONS.SCHEDULE_MANAGE)
  @Delete('schedules/:id/revisions/:revisionId')
  cancelScheduleRevision(@Param('id') id: string, @Param('revisionId') revisionId: string) {
    return this.academicService.cancelScheduleRevision(id, revisionId);
  }

  @RequirePermissions(PERMISSIONS.SCHEDULE_MANAGE)
  @Delete('schedules/:id')
  deleteSchedule(@Param('id') id: string) {
    return this.academicService.deleteSchedule(id);
  }

  @RequirePermissions(PERMISSIONS.AGENDA_GENERATE)
  @Post('agendas/generate')
  generateBulkAgenda(@Body() dto: GenerateBulkAgendaDto) {
    return this.academicService.generateBulkAgenda(dto);
  }

  @RequirePermissions(PERMISSIONS.AGENDA_GENERATE)
  @Post('schedules/:id/generate-agenda')
  generateAgenda(@Param('id') id: string, @Body() dto: GenerateAgendaDto) {
    return this.academicService.generateAgenda(id, dto);
  }

  @Get('agendas')
  @RequirePermissions(PERMISSIONS.AGENDA_READ)
  getAgendas(@Query('date') date?: string) {
    return this.academicService.getAgendas(date);
  }

  @Get('agendas/coverage')
  @RequirePermissions(PERMISSIONS.AGENDA_READ)
  getAgendaCoverage(
    @Query('schoolYearId') schoolYearId: string,
    @Query('startsAt') startsAt: string,
    @Query('endsAt') endsAt: string,
    @Query('classId') classId?: string,
  ) {
    return this.academicService.getAgendaCoverage({ schoolYearId, startsAt, endsAt, classId });
  }

  @Patch('agendas/:id/substitute-teacher')
  @RequirePermissions(PERMISSIONS.AGENDA_GENERATE)
  assignSubstituteTeacher(
    @Param('id') id: string,
    @Body() dto: AssignSubstituteTeacherDto,
  ) {
    return this.academicService.assignSubstituteTeacher(id, dto.teacherId ?? null);
  }
}
