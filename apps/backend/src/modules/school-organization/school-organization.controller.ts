import { Body, Controller, ForbiddenException, Get, Put, Req } from '@nestjs/common';
import { RequestWithUser } from '../../core/http/request-with-user';
import { SchoolOrganizationService } from './school-organization.service';

type PositionInput = { id?: string; title: string; personName?: string; teacherId?: string | null; sortOrder?: number; category?: string };

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

  private assertSchoolProfileAccess(req: RequestWithUser) {
    const roles = req.user.roles ?? [];
    if (roles.includes('root')) {
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
