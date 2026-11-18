import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Put, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequestWithUser } from '../../core/http/request-with-user';
import { SchoolOrganizationService } from './school-organization.service';

type PositionInput = { id?: string; title: string; personName?: string; nip?: string | null; teacherId?: string | null; parentId?: string | null; sortOrder?: number; category?: string };

@Controller('school-organization')
export class SchoolOrganizationController {
  constructor(private readonly service: SchoolOrganizationService) {}

  @Get()
  get(@Req() req: RequestWithUser) {
    this.assertSchoolProfileAccess(req);
    return this.service.get();
  }

  @Get('teachers')
  teachers(@Req() req: RequestWithUser) {
    this.assertOperator(req);
    return this.service.teachers();
  }

  @Put()
  save(@Body() body: { positions: PositionInput[] }, @Req() req: RequestWithUser) {
    this.assertOperator(req);
    return this.service.save(body.positions ?? []);
  }

  @Post('teachers/:id/photo')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      const supported = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
      callback(supported ? null : new BadRequestException('Foto harus JPEG, PNG, atau WebP'), supported);
    },
  }))
  uploadTeacherPhoto(@Req() req: RequestWithUser, @Param('id') id: string, @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype: string; size: number }) {
    this.assertOperator(req);
    if (!file) throw new BadRequestException('Foto wajib dipilih.');
    return this.service.uploadTeacherPhoto(id, file);
  }

  private assertSchoolProfileAccess(req: RequestWithUser) {
    if ((req.user.roles ?? []).includes('root')) {
      throw new ForbiddenException('Profil Sekolah tidak tersedia untuk role ini.');
    }
  }

  private assertOperator(req: RequestWithUser) {
    this.assertSchoolProfileAccess(req);
    if (!(req.user.roles ?? []).includes('operator_sekolah')) {
      throw new ForbiddenException('Hanya Operator Sekolah yang dapat mengelola struktur organisasi.');
    }
  }
}
