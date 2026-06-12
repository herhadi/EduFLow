import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { AcademicService } from './academic.service';
import { ConfigureTeacherAccountDto } from './dto/configure-teacher-account.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
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

  @Public()
  @Get('teachers')
  getTeachers() {
    return this.academicService.getTeachers();
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
