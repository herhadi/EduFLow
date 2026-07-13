import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequestWithUser } from '../../core/http/request-with-user';
import { AcademicPlanningService } from './academic-planning.service';
import { CreateTeachingPlanDto } from './dto/create-teaching-plan.dto';
import { ReviewTeachingPlanDto } from './dto/review-teaching-plan.dto';

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_MIME_TYPE = 'application/pdf';
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('academic-planning')
export class AcademicPlanningController {
  constructor(private readonly service: AcademicPlanningService) {}

  @RequirePermissions(PERMISSIONS.TEACHING_PLAN_READ)
  @Get('mine')
  getMine(@Req() request: RequestWithUser) { return this.service.getMine(request.user.id); }

  @RequirePermissions(PERMISSIONS.TEACHING_PLAN_MANAGE)
  @Post()
  create(@Req() request: RequestWithUser, @Body() dto: CreateTeachingPlanDto) { return this.service.create(request.user.id, dto); }

  @RequirePermissions(PERMISSIONS.TEACHING_PLAN_MANAGE)
  @Post(':id/attachment')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      const isDocx = file.originalname.toLowerCase().endsWith('.docx') && file.mimetype === DOCX_MIME_TYPE;
      const isPdf = file.originalname.toLowerCase().endsWith('.pdf') && file.mimetype === PDF_MIME_TYPE;
      const isBookPhoto = IMAGE_MIME_TYPES.includes(file.mimetype);
      const isSupported = isDocx || isPdf || isBookPhoto;
      callback(isSupported ? null : new BadRequestException('File harus DOCX, PDF, JPEG, PNG, atau WebP'), isSupported);
    },
  }))
  uploadAttachment(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
    @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    if (!file) throw new BadRequestException('Lampiran wajib dipilih');
    return this.service.uploadAttachment(request.user.id, id, file);
  }

  @RequirePermissions(PERMISSIONS.TEACHING_PLAN_READ)
  @Get(':id/attachment-url')
  getAttachmentUrl(@Req() request: RequestWithUser, @Param('id') id: string) {
    return this.service.getAttachmentUrl(request.user.id, id, request.user.permissions ?? []);
  }

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
