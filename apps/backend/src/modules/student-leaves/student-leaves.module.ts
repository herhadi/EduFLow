import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StudentLeavesController } from './student-leaves.controller';
import { StudentLeavesService } from './student-leaves.service';

@Module({
  imports: [AuditModule],
  controllers: [StudentLeavesController],
  providers: [StudentLeavesService],
})
export class StudentLeavesModule {}
