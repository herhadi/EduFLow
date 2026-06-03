import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceDemoController } from './attendance-demo.controller';
import { AttendanceDemoService } from './attendance-demo.service';
import { AttendanceService } from './attendance.service';

@Module({
  controllers: [AttendanceController, AttendanceDemoController],
  providers: [AttendanceService, AttendanceDemoService],
})
export class AttendanceModule {}
