import { Controller, Get } from '@nestjs/common';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('activity')
  getActivityTrail() {
    return this.auditService.getActivityTrail();
  }

  @Get('login')
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  getLoginAudit() {
    return this.auditService.getLoginAudit();
  }
}
