import { Controller, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AttendanceDemoService } from './attendance-demo.service';

@Controller('attendance/demo')
export class AttendanceDemoController {
  constructor(private readonly attendanceDemoService: AttendanceDemoService) {}

  @Public()
  @Post('teacher-flow')
  runTeacherFlow() {
    return this.attendanceDemoService.runTeacherFlow();
  }
}

