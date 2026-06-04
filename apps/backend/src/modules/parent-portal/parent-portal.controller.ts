import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { ParentPortalService } from './parent-portal.service';

@Public()
@Controller('parent-portal')
export class ParentPortalController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  @Get('summary')
  getSummary(@Query('contact') contact = '') {
    return this.parentPortalService.getPortalByContact(contact);
  }
}
