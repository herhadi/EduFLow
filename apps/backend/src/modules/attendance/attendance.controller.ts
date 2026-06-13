import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { RequestWithUser } from '../../core/http/request-with-user';
import { AttendanceService } from './attendance.service';
import { OpenClassDto } from './dto/open-class.dto';
import { SubmitAttendanceDto } from './dto/submit-attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get(':id')
  getAttendance(@Param('id') id: string, @Req() request: RequestWithUser) {
    return this.attendanceService.getAttendance(id, request.user.id);
  }

  @Post('open-class')
  openClass(@Body() dto: OpenClassDto, @Req() request: RequestWithUser) {
    return this.attendanceService.openClass(dto, request.user.id);
  }

  @Post('submit')
  submit(@Body() dto: SubmitAttendanceDto, @Req() request: RequestWithUser) {
    return this.attendanceService.submit(dto, request.user.id);
  }
}
