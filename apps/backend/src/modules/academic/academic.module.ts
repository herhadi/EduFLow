import { Module } from '@nestjs/common';
import { AcademicController } from './academic.controller';
import { AcademicService } from './academic.service';
import { AuditModule } from '../audit/audit.module';
import { AcademicImportController } from './imports/academic-import.controller';
import { AcademicImportService } from './imports/academic-import.service';
import { ImportExcelService } from './imports/import-excel.service';
import { ClassesModule } from './classes/classes.module';
import { SchedulesModule } from './schedules/schedules.module';
import { SchoolYearsModule } from './school-years/school-years.module';
import { SemestersModule } from './semesters/semesters.module';
import { StudentsModule } from './students/students.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TeachersModule } from './teachers/teachers.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { AgendaGenerationService } from './schedules/agenda-generation.service';
import { AcademicScheduleService } from './schedules/academic-schedule.service';
import { AcademicCalendarService } from './academic-calendar/academic-calendar.service';
import { TeacherAcademicService } from './teachers/teacher-academic.service';
import { AcademicMasterService } from './master/academic-master.service';
import { TeacherPortalService } from './teachers/teacher-portal.service';
import { StudentAcademicService } from './students/student-academic.service';
import { AgendaManagementService } from './schedules/agenda-management.service';

@Module({
  imports: [
    AuditModule,
    StudentsModule,
    TeachersModule,
    ClassesModule,
    SchedulesModule,
    SubjectsModule,
    SemestersModule,
    SchoolYearsModule,
    StorageModule,
  ],
  controllers: [AcademicController, AcademicImportController],
  providers: [
    AcademicService,
    AcademicCalendarService,
    AcademicMasterService,
    AcademicScheduleService,
    AgendaManagementService,
    AgendaGenerationService,
    StudentAcademicService,
    TeacherAcademicService,
    TeacherPortalService,
    AcademicImportService,
    ImportExcelService,
  ],
})
export class AcademicModule {}
