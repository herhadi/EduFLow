import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StudentGradesController } from './student-grades.controller';
import { StudentGradesService } from './student-grades.service';

@Module({
  imports: [AuditModule],
  controllers: [StudentGradesController],
  providers: [StudentGradesService],
})
export class StudentGradesModule {}
