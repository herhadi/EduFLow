import { Module } from '@nestjs/common';
import { ClassesModule } from './classes/classes.module';
import { SchedulesModule } from './schedules/schedules.module';
import { SchoolYearsModule } from './school-years/school-years.module';
import { SemestersModule } from './semesters/semesters.module';
import { StudentsModule } from './students/students.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TeachersModule } from './teachers/teachers.module';

@Module({
  imports: [
    StudentsModule,
    TeachersModule,
    ClassesModule,
    SchedulesModule,
    SubjectsModule,
    SemestersModule,
    SchoolYearsModule,
  ],
})
export class AcademicModule {}

