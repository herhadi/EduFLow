import { BadRequestException, Body, Controller, Get, Param, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post(':id/class-photo')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      const supported = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
      callback(supported ? null : new BadRequestException('Foto kelas harus JPEG, PNG, atau WebP'), supported);
    },
  }))
  uploadClassPhoto(
    @Param('id') id: string,
    @Req() request: RequestWithUser,
    @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    if (!file) throw new BadRequestException('Foto kelas wajib dipilih');
    return this.attendanceService.uploadClassPhoto(id, request.user.id, file);
  }
}
