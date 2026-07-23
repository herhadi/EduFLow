import { Injectable } from '@nestjs/common';
import { CloneSchoolYearMasterDto } from './dto/clone-school-year-master.dto';
import { ConfigureTeacherAccountDto } from './dto/configure-teacher-account.dto';
import { CreateAcademicTimeSlotDto } from './dto/create-academic-time-slot.dto';
import { CreateAcademicCalendarEventDto } from './dto/create-academic-calendar-event.dto';
import { UpdateClassTimeSlotActivityDto } from './dto/update-class-time-slot-activity.dto';
import { UpdateAcademicCalendarEventDto } from './dto/update-academic-calendar-event.dto';
import { UpdateAcademicTimeSlotDto } from './dto/update-academic-time-slot.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { CreateBulkScheduleDto } from './dto/create-bulk-schedule.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { GenerateAgendaDto } from './dto/generate-agenda.dto';
import { GenerateBulkAgendaDto } from './dto/generate-bulk-agenda.dto';
import { SetClassHomeroomTeacherDto } from './dto/set-class-homeroom-teacher.dto';
import { SetTeacherSubjectsDto } from './dto/set-teacher-subjects.dto';
import { SetTeacherSchoolYearAssignmentDto } from './dto/set-teacher-school-year-assignment.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { AgendaGenerationService } from './schedules/agenda-generation.service';
import { AcademicScheduleService } from './schedules/academic-schedule.service';
import { AcademicCalendarService } from './academic-calendar/academic-calendar.service';
import { TeacherAcademicService } from './teachers/teacher-academic.service';
import { AcademicMasterService } from './master/academic-master.service';
import { TeacherPortalService } from './teachers/teacher-portal.service';
import { StudentAcademicService } from './students/student-academic.service';
import { AgendaManagementService } from './schedules/agenda-management.service';

@Injectable()
export class AcademicService {
  constructor(
    private readonly academicMasterService: AcademicMasterService,
    private readonly academicCalendarService: AcademicCalendarService,
    private readonly academicScheduleService: AcademicScheduleService,
    private readonly agendaManagementService: AgendaManagementService,
    private readonly agendaGenerationService: AgendaGenerationService,
    private readonly studentAcademicService: StudentAcademicService,
    private readonly teacherAcademicService: TeacherAcademicService,
    private readonly teacherPortalService: TeacherPortalService,
  ) {}

  async getSchoolYears() {
    return this.academicMasterService.getSchoolYears();
  }

  async createSchoolYear(dto: CreateSchoolYearDto) {
    return this.academicMasterService.createSchoolYear(dto);
  }

  async cloneSchoolYearMaster(dto: CloneSchoolYearMasterDto) {
    return this.academicMasterService.cloneSchoolYearMaster(dto);
  }

  async getSemesters(schoolYearId?: string) {
    return this.academicMasterService.getSemesters(schoolYearId);
  }

  async getAcademicCalendarEvents(schoolYearId?: string) {
    return this.academicCalendarService.getAcademicCalendarEvents(schoolYearId);
  }

  async createAcademicCalendarEvent(dto: CreateAcademicCalendarEventDto) {
    return this.academicCalendarService.createAcademicCalendarEvent(dto);
  }

  async updateAcademicCalendarEvent(id: string, dto: UpdateAcademicCalendarEventDto) {
    return this.academicCalendarService.updateAcademicCalendarEvent(id, dto);
  }

  async deleteAcademicCalendarEvent(id: string) {
    return this.academicCalendarService.deleteAcademicCalendarEvent(id);
  }

  async getClasses(schoolYearId?: string) {
    return this.academicMasterService.getClasses(schoolYearId);
  }

  async createClass(dto: CreateClassDto) {
    return this.academicMasterService.createClass(dto);
  }

  async deleteClass(id: string) {
    return this.academicMasterService.deleteClass(id);
  }

  async setClassHomeroomTeacher(
    id: string,
    dto: SetClassHomeroomTeacherDto,
  ) {
    return this.academicMasterService.setClassHomeroomTeacher(id, dto);
  }

  async getSubjects() {
    return this.academicMasterService.getSubjects();
  }

  async createSubject(dto: CreateSubjectDto) {
    return this.academicMasterService.createSubject(dto);
  }

  async deleteSubject(id: string) {
    return this.academicMasterService.deleteSubject(id);
  }

  async getTeachers() {
    return this.teacherAcademicService.getTeachers();
  }

  async uploadTeacherPhoto(id: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number }) {
    return this.teacherAcademicService.uploadTeacherPhoto(id, file);
  }

  async createTeacher(dto: CreateTeacherDto) {
    return this.teacherAcademicService.createTeacher(dto);
  }

  async updateTeacher(id: string, dto: UpdateTeacherDto) {
    return this.teacherAcademicService.updateTeacher(id, dto);
  }

  async configureTeacherAccount(id: string, dto: ConfigureTeacherAccountDto) {
    return this.teacherAcademicService.configureTeacherAccount(id, dto);
  }

  async resetTeacherPassword(id: string) {
    return this.teacherAcademicService.resetTeacherPassword(id);
  }

  async setTeacherSubjects(id: string, dto: SetTeacherSubjectsDto) {
    return this.teacherAcademicService.setTeacherSubjects(id, dto);
  }

  async getTeacherSchoolYearAssignments(teacherId: string) {
    return this.teacherAcademicService.getTeacherSchoolYearAssignments(teacherId);
  }

  async setTeacherSchoolYearAssignment(
    teacherId: string,
    schoolYearId: string,
    dto: SetTeacherSchoolYearAssignmentDto,
  ) {
    return this.teacherAcademicService.setTeacherSchoolYearAssignment(teacherId, schoolYearId, dto);
  }

  async deleteTeacher(id: string) {
    return this.teacherAcademicService.deleteTeacher(id);
  }

  async deleteTeacherPermanently(id: string) {
    return this.teacherAcademicService.deleteTeacherPermanently(id);
  }

  async getStudents(classId?: string) {
    return this.studentAcademicService.getStudents(classId);
  }

  async getMyHomeroom(userId: string) {
    return this.teacherPortalService.getMyHomeroom(userId);
  }

  async getSchedules(classId?: string) {
    return this.academicScheduleService.getSchedules(classId);
  }

  async getTimeSlots(schoolYearId?: string) {
    return this.academicMasterService.getTimeSlots(schoolYearId);
  }

  async createTimeSlot(dto: CreateAcademicTimeSlotDto) {
    return this.academicMasterService.createTimeSlot(dto);
  }

  async updateTimeSlot(id: string, dto: UpdateAcademicTimeSlotDto) {
    return this.academicMasterService.updateTimeSlot(id, dto);
  }

  async deleteTimeSlot(id: string) {
    return this.academicMasterService.deleteTimeSlot(id);
  }

  async getClassTimeSlotActivities(classId: string) {
    return this.academicMasterService.getClassTimeSlotActivities(classId);
  }

  async updateClassTimeSlotActivity(
    classId: string,
    timeSlotId: string,
    dto: UpdateClassTimeSlotActivityDto,
  ) {
    return this.academicMasterService.updateClassTimeSlotActivity(classId, timeSlotId, dto);
  }

  async getMySchedules(userId: string) {
    return this.teacherPortalService.getMySchedules(userId);
  }

  async getMySubjects(userId: string) {
    return this.teacherPortalService.getMySubjects(userId);
  }

  async getMyAgendas(userId: string, date?: string) {
    return this.teacherPortalService.getMyAgendas(userId, date);
  }

  async getMyDashboard(userId: string) {
    return this.teacherPortalService.getMyDashboard(userId);
  }

  async getSchedule(id: string) {
    return this.academicScheduleService.getSchedule(id);
  }

  async createSchedule(dto: CreateScheduleDto) {
    return this.academicScheduleService.createSchedule(dto);
  }

  async createBulkSchedule(dto: CreateBulkScheduleDto) {
    return this.academicScheduleService.createBulkSchedule(dto);
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto) {
    return this.academicScheduleService.updateSchedule(id, dto);
  }

  async deleteSchedule(id: string) {
    return this.academicScheduleService.deleteSchedule(id);
  }

  async getScheduleRevisions(scheduleId: string) {
    return this.academicScheduleService.getScheduleRevisions(scheduleId);
  }

  async cancelScheduleRevision(scheduleId: string, revisionId: string) {
    return this.academicScheduleService.cancelScheduleRevision(scheduleId, revisionId);
  }

  async generateAgenda(id: string, dto: GenerateAgendaDto) {
    return this.agendaGenerationService.generateAgenda(id, dto);
  }

  async generateBulkAgenda(dto: GenerateBulkAgendaDto) {
    return this.agendaGenerationService.generateBulkAgenda(dto);
  }

  async getAgendas(date?: string) {
    return this.agendaManagementService.getAgendas(date);
  }

  async assignSubstituteTeacher(id: string, teacherId: string | null) {
    return this.agendaManagementService.assignSubstituteTeacher(id, teacherId);
  }

  async getAgendaCoverage(input: {
    schoolYearId?: string;
    startsAt?: string;
    endsAt?: string;
    classId?: string;
  }) {
    return this.agendaGenerationService.getAgendaCoverage(input);
  }

}
