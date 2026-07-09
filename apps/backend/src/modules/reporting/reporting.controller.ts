import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
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

  @Get('teacher-performance')
  getTeacherPerformance(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
  ) {
    return this.reportingService.getTeacherPerformance({ from, to });
  }

  @Get('students')
  getStudentReport(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('classId') classId: string | undefined,
    @Query('status') status: string | undefined,
  ) {
    return this.reportingService.getStudentReport({ classId, from, status, to });
  }

  @Get('exports/:reportType')
  async exportReport(
    @Param('reportType') reportType: string,
    @Query('format') format: 'excel' | 'pdf' = 'excel',
    @Query('date') date: string | undefined,
    @Res() response: Response,
  ) {
    const exportedReport = await this.reportingService.exportReport({
      reportType,
      format,
      date,
    });

    response.setHeader('Content-Type', exportedReport.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportedReport.filename}"`,
    );
    response.send(exportedReport.buffer);
  }
}
