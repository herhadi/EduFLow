import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequestWithUser } from '../../core/http/request-with-user';
import { JournalsService } from './journals.service';

@Controller()
export class JournalsController {
  constructor(private readonly journals: JournalsService) {}

  @Get('teaching-journals/mine')
  @RequirePermissions(PERMISSIONS.TEACHING_JOURNAL_READ_OWN)
  getMine(@Req() req: RequestWithUser, @Query('date') date?: string) {
    return this.journals.getMine(req.user.id, date);
  }

  @Get('teaching-journals/:agendaId')
  getForAgenda(@Param('agendaId') id: string, @Req() req: RequestWithUser) {
    return this.journals.getForAgenda(id, req.user.id, req.user.permissions ?? []);
  }

  @Put('teaching-journals/:agendaId')
  @RequirePermissions(PERMISSIONS.TEACHING_JOURNAL_MANAGE_OWN)
  saveDraft(@Param('agendaId') id: string, @Body() body: Record<string, unknown>, @Req() req: RequestWithUser) {
    return this.journals.saveDraft(id, req.user.id, body);
  }

  @Post('teaching-journals/:agendaId/submit')
  @RequirePermissions(PERMISSIONS.TEACHING_JOURNAL_MANAGE_OWN)
  submit(@Param('agendaId') id: string, @Req() req: RequestWithUser) {
    return this.journals.submit(id, req.user.id);
  }

  @Get('class-journals/:classId')
  getClassJournal(@Param('classId') id: string, @Query('date') date: string | undefined,
    @Query('from') from: string | undefined, @Query('to') to: string | undefined, @Req() req: RequestWithUser) {
    return this.journals.getClassJournal(id, { date, from, to }, req.user.id, req.user.permissions ?? []);
  }

  @Post('class-journals/:classId/notes')
  @RequirePermissions(PERMISSIONS.CLASS_JOURNAL_NOTE_MANAGE_ASSIGNED)
  createNote(@Param('classId') id: string, @Body() body: { date?: string; content?: string }, @Req() req: RequestWithUser) {
    return this.journals.createClassNote(id, req.user.id, body);
  }

  @Patch('class-journals/:classId/notes/:noteId')
  @RequirePermissions(PERMISSIONS.CLASS_JOURNAL_NOTE_MANAGE_ASSIGNED)
  updateNote(@Param('classId') id: string, @Param('noteId') noteId: string, @Body() body: { content?: string }, @Req() req: RequestWithUser) {
    return this.journals.updateClassNote(id, noteId, req.user.id, body);
  }
}
