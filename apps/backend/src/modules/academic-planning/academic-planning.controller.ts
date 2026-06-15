import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequestWithUser } from '../../core/http/request-with-user';
import { AcademicPlanningService } from './academic-planning.service';
import { CreateTeachingPlanDto } from './dto/create-teaching-plan.dto';
import { ReviewTeachingPlanDto } from './dto/review-teaching-plan.dto';

@Controller('api/academic-planning')
export class AcademicPlanningController {
  constructor(private readonly service: AcademicPlanningService) {}

  @RequirePermissions(PERMISSIONS.TEACHING_PLAN_READ)
  @Get('mine')
  getMine(@Req() request: RequestWithUser) { return this.service.getMine(request.user.id); }

  @RequirePermissions(PERMISSIONS.TEACHING_PLAN_MANAGE)
  @Post()
  create(@Req() request: RequestWithUser, @Body() dto: CreateTeachingPlanDto) { return this.service.create(request.user.id, dto); }

  @RequirePermissions(PERMISSIONS.TEACHING_PLAN_MANAGE)
  @Post(':id/submit')
  submit(@Req() request: RequestWithUser, @Param('id') id: string) { return this.service.submit(request.user.id, id); }

  @RequirePermissions(PERMISSIONS.TEACHING_PLAN_REVIEW)
  @Get('review-queue')
  getReviewQueue() { return this.service.getReviewQueue(); }

  @RequirePermissions(PERMISSIONS.TEACHING_PLAN_REVIEW)
  @Patch(':id/review')
  review(@Req() request: RequestWithUser, @Param('id') id: string, @Body() dto: ReviewTeachingPlanDto) { return this.service.review(request.user.id, id, dto); }
}
