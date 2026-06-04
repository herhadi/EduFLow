import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AcademicService } from './academic.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { GenerateAgendaDto } from './dto/generate-agenda.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Public()
@Controller('academic')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  @Get('school-years')
  getSchoolYears() {
    return this.academicService.getSchoolYears();
  }

  @Get('semesters')
  getSemesters(@Query('schoolYearId') schoolYearId?: string) {
    return this.academicService.getSemesters(schoolYearId);
  }

  @Get('classes')
  getClasses(@Query('schoolYearId') schoolYearId?: string) {
    return this.academicService.getClasses(schoolYearId);
  }

  @Get('subjects')
  getSubjects() {
    return this.academicService.getSubjects();
  }

  @Get('teachers')
  getTeachers() {
    return this.academicService.getTeachers();
  }

  @Get('students')
  getStudents(@Query('classId') classId?: string) {
    return this.academicService.getStudents(classId);
  }

  @Get('schedules')
  getSchedules(@Query('classId') classId?: string) {
    return this.academicService.getSchedules(classId);
  }

  @Get('schedules/:id')
  getSchedule(@Param('id') id: string) {
    return this.academicService.getSchedule(id);
  }

  @Post('schedules')
  createSchedule(@Body() dto: CreateScheduleDto) {
    return this.academicService.createSchedule(dto);
  }

  @Patch('schedules/:id')
  updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.academicService.updateSchedule(id, dto);
  }

  @Delete('schedules/:id')
  deleteSchedule(@Param('id') id: string) {
    return this.academicService.deleteSchedule(id);
  }

  @Post('schedules/:id/generate-agenda')
  generateAgenda(@Param('id') id: string, @Body() dto: GenerateAgendaDto) {
    return this.academicService.generateAgenda(id, dto);
  }

  @Get('agendas')
  getAgendas(@Query('date') date?: string) {
    return this.academicService.getAgendas(date);
  }
}
