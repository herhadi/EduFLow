import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AttendanceService } from './attendance.service';
import { OpenClassDto } from './dto/open-class.dto';
import { SubmitAttendanceDto } from './dto/submit-attendance.dto';

@Public()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get(':id')
  getAttendance(@Param('id') id: string) {
    return this.attendanceService.getAttendance(id);
  }

  @Post('open-class')
  openClass(@Body() dto: OpenClassDto) {
    return this.attendanceService.openClass(dto);
  }

  @Post('submit')
  submit(@Body() dto: SubmitAttendanceDto) {
    return this.attendanceService.submit(dto);
  }
}

