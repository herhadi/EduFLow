import { Controller, Get, Query } from '@nestjs/common';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('calendar')
  getAuditCalendar(@Query('month') month: string) {
    return this.auditService.getAuditCalendar(month);
  }

  @Get('activity')
  getActivityTrail(@Query('date') date?: string) {
    return this.auditService.getActivityTrail(date);
  }

  @Get('login')
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  getLoginAudit(@Query('date') date?: string) {
    return this.auditService.getLoginAudit(date);
  }
}
