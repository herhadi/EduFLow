import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { ReportingService } from './reporting.service';

@Public()
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('operational/today')
  getOperationalToday() {
    return this.reportingService.getOperationalToday();
  }
}
