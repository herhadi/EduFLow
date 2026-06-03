import { Module } from '@nestjs/common';
import { AttendanceDemoController } from './attendance-demo.controller';
import { AttendanceDemoService } from './attendance-demo.service';

@Module({
  controllers: [AttendanceDemoController],
  providers: [AttendanceDemoService],
})
export class AttendanceModule {}

