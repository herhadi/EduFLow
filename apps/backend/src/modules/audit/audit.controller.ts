import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AuditService } from './audit.service';

@Public()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('activity')
  getActivityTrail() {
    return this.auditService.getActivityTrail();
  }
}
