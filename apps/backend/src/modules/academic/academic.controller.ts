import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequestWithUser } from '../../core/http/request-with-user';
import { AcademicService } from './academic.service';
import { ConfigureTeacherAccountDto } from './dto/configure-teacher-account.dto';
import { CreateAcademicTimeSlotDto } from './dto/create-academic-time-slot.dto';
import { CreateBulkScheduleDto } from './dto/create-bulk-schedule.dto';
import { UpdateClassTimeSlotActivityDto } from './dto/update-class-time-slot-activity.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { GenerateAgendaDto } from './dto/generate-agenda.dto';
import { SetClassHomeroomTeacherDto } from './dto/set-class-homeroom-teacher.dto';
import { SetTeacherSubjectsDto } from './dto/set-teacher-subjects.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Controller('academic')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  @Public()
  @Get('school-years')
  getSchoolYears() {
    return this.academicService.getSchoolYears();
  }

  @Public()
  @Get('semesters')
  getSemesters(@Query('schoolYearId') schoolYearId?: string) {
    return this.academicService.getSemesters(schoolYearId);
  }

  @Public()
  @Get('classes')
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

  @Public()
  @Get('subjects')
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

  @Public()
  @Get('teachers')
  getTeachers() {
    return this.academicService.getTeachers();
  }

  @RequirePermissions(PERMISSIONS.ACADEMIC_MANAGE)
  @Post('teachers')
  createTeacher(@Body() dto: CreateTeacherDto) {
    return this.academicService.createTeacher(dto);
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
  @Patch('teachers/:id/subjects')
  setTeacherSubjects(
    @Param('id') id: string,
    @Body() dto: SetTeacherSubjectsDto,
  ) {
    return this.academicService.setTeacherSubjects(id, dto);
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

  @Public()
  @Get('students')
  getStudents(@Query('classId') classId?: string) {
    return this.academicService.getStudents(classId);
  }

  @Public()
  @Get('schedules')
  getSchedules(@Query('classId') classId?: string) {
    return this.academicService.getSchedules(classId);
  }

  @Public()
  @Get('time-slots')
  getTimeSlots(@Query('schoolYearId') schoolYearId?: string) {
    return this.academicService.getTimeSlots(schoolYearId);
  }

  @RequirePermissions(PERMISSIONS.SCHEDULE_MANAGE)
  @Post('time-slots')
  createTimeSlot(@Body() dto: CreateAcademicTimeSlotDto) {
    return this.academicService.createTimeSlot(dto);
  }

  @Public()
  @Get('classes/:classId/time-slot-activities')
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

  @Get('me/agendas')
  getMyAgendas(
    @Req() request: RequestWithUser,
    @Query('date') date?: string,
  ) {
    return this.academicService.getMyAgendas(request.user.id, date);
  }

  @Public()
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

  @RequirePermissions(PERMISSIONS.SCHEDULE_MANAGE)
  @Delete('schedules/:id')
  deleteSchedule(@Param('id') id: string) {
    return this.academicService.deleteSchedule(id);
  }

  @RequirePermissions(PERMISSIONS.AGENDA_GENERATE)
  @Post('schedules/:id/generate-agenda')
  generateAgenda(@Param('id') id: string, @Body() dto: GenerateAgendaDto) {
    return this.academicService.generateAgenda(id, dto);
  }

  @Public()
  @Get('agendas')
  getAgendas(@Query('date') date?: string) {
    return this.academicService.getAgendas(date);
  }
}
