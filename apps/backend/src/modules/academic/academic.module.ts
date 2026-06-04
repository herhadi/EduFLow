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
  ],
  controllers: [AcademicController, AcademicImportController],
  providers: [AcademicService, AcademicImportService, ImportExcelService],
})
export class AcademicModule {}
