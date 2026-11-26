import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequestWithUser } from '../../core/http/request-with-user';
import { CorrespondenceService } from './correspondence.service';
import { CreateOutgoingLetterDto } from './dto/create-outgoing-letter.dto';
import { UpdateOutgoingLetterDto } from './dto/update-outgoing-letter.dto';
import { CreateIncomingLetterDto } from './dto/create-incoming-letter.dto';
import { DecideOutgoingLetterDto } from './dto/decide-outgoing-letter.dto';
@Controller('correspondence')
export class CorrespondenceController {
  constructor(private readonly service: CorrespondenceService) {}
  @RequirePermissions(PERMISSIONS.CORRESPONDENCE_READ)
  @Get('signature-settings') getSignatureSettings() { return this.service.getSignatureSettings(); }
  @RequirePermissions(PERMISSIONS.CORRESPONDENCE_LETTERHEAD_READ)
  @Get('letterhead-settings') getLetterheadSettings() { return this.service.getLetterheadSettings(); }
  @RequirePermissions(PERMISSIONS.CORRESPONDENCE_LETTERHEAD_MANAGE)
  @Patch('letterhead-settings') updateLetterheadSettings(@Req() req: RequestWithUser, @Body() body: unknown) { return this.service.updateLetterheadSettings(req.user.id, body); }
  @RequirePermissions(PERMISSIONS.CORRESPONDENCE_CONFIG_MANAGE)
  @Patch('signature-settings') updateSignatureSettings(@Req() req: RequestWithUser, @Body() body: { mode: 'MANUAL' | 'TTE' }) { return this.service.updateSignatureSettings(req.user.id, body.mode); }
  @RequirePermissions(PERMISSIONS.CORRESPONDENCE_READ)
  @Get('outgoing') listOutgoing(@Req() req: RequestWithUser) { return this.service.listOutgoing(req.user.id, req.user.permissions ?? []); }
  @RequirePermissions(PERMISSIONS.CORRESPONDENCE_READ)
  @Get('incoming') listIncoming() { return this.service.listIncoming(); }
  @RequirePermissions(PERMISSIONS.CORRESPONDENCE_APPROVE)
  @Get('approvals') listApprovals() { return this.service.listApprovals(); }
  @RequirePermissions(PERMISSIONS.CORRESPONDENCE_MANAGE)
  @Post('outgoing') createOutgoing(@Req() req: RequestWithUser, @Body() dto: CreateOutgoingLetterDto) { return this.service.createOutgoing(req.user.id, dto); }
  @RequirePermissions(PERMISSIONS.CORRESPONDENCE_MANAGE)
  @Patch('outgoing/:id') updateOutgoing(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateOutgoingLetterDto) { return this.service.updateOutgoing(req.user.id, id, dto); }
  @RequirePermissions(PERMISSIONS.CORRESPONDENCE_MANAGE)
  @Post('outgoing/:id/submit') submitOutgoing(@Req() req: RequestWithUser, @Param('id') id: string) { return this.service.submitOutgoing(req.user.id, id); }
  @RequirePermissions(PERMISSIONS.CORRESPONDENCE_APPROVE)
  @Patch('outgoing/:id/decision') decideOutgoing(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: DecideOutgoingLetterDto) { return this.service.decideOutgoing(req.user.id, id, dto); }
  @RequirePermissions(PERMISSIONS.CORRESPONDENCE_MANAGE)
  @Post('incoming') createIncoming(@Req() req: RequestWithUser, @Body() dto: CreateIncomingLetterDto) { return this.service.createIncoming(req.user.id, dto); }
}
