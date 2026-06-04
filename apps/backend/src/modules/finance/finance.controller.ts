import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { FinanceService } from './finance.service';

@Public()
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('fee-types')
  getFeeTypes() {
    return this.financeService.getFeeTypes();
  }

  @Get('payment-methods')
  getPaymentMethods() {
    return this.financeService.getPaymentMethods();
  }

  @Get('invoices')
  getInvoices(
    @Query('studentId') studentId?: string,
    @Query('guardianId') guardianId?: string,
  ) {
    return this.financeService.getInvoices(studentId, guardianId);
  }

  @Get('payments')
  getPayments(
    @Query('invoiceId') invoiceId?: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.financeService.getPayments(invoiceId, studentId);
  }
}
