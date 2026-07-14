import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequestWithUser } from '../../core/http/request-with-user';
import { CreateStudentLeaveRequestDto } from './dto/create-student-leave-request.dto';
import { ReviewStudentLeaveRequestDto } from './dto/review-student-leave-request.dto';
import { StudentLeavesService } from './student-leaves.service';

@Controller('student-leaves')
export class StudentLeavesController {
  constructor(private readonly studentLeavesService: StudentLeavesService) {}

  @RequirePermissions(PERMISSIONS.STUDENT_LEAVE_READ)
  @Get('mine')
  getMine(@Req() request: RequestWithUser) {
    return this.studentLeavesService.getMine(request.user.id);
  }

  @RequirePermissions(PERMISSIONS.STUDENT_LEAVE_MANAGE)
  @Post('mine')
  createMine(@Req() request: RequestWithUser, @Body() dto: CreateStudentLeaveRequestDto) {
    return this.studentLeavesService.createMine(request.user.id, dto);
  }

  @RequirePermissions(PERMISSIONS.STUDENT_LEAVE_REVIEW)
  @Get('review')
  getReviewQueue(@Req() request: RequestWithUser) {
    return this.studentLeavesService.getReviewQueue(request.user.id, request.user.roles ?? []);
  }

  @RequirePermissions(PERMISSIONS.STUDENT_LEAVE_REVIEW)
  @Patch(':id/review')
  review(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: ReviewStudentLeaveRequestDto,
  ) {
    return this.studentLeavesService.review(request.user.id, request.user.roles ?? [], id, dto);
  }
}
