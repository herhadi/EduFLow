import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeeTypes() {
    return {
      data: await this.prisma.feeType.findMany({
        where: { deletedAt: null },
        include: { schoolYear: true },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      }),
    };
  }

  async getPaymentMethods() {
    return {
      data: await this.prisma.paymentMethod.findMany({
        where: { deletedAt: null },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      }),
    };
  }

  async getInvoices(studentId?: string, guardianId?: string) {
    return {
      data: await this.prisma.invoice.findMany({
        where: { deletedAt: null, studentId, guardianId },
        include: {
          feeType: true,
          student: true,
          guardian: true,
          schoolYear: true,
          payments: {
            where: { deletedAt: null },
            include: { paymentMethod: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      }),
    };
  }

  async getPayments(invoiceId?: string, studentId?: string) {
    return {
      data: await this.prisma.payment.findMany({
        where: { deletedAt: null, invoiceId, studentId },
        include: {
          invoice: { include: { feeType: true } },
          student: true,
          guardian: true,
          paymentMethod: true,
          receivedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      }),
    };
  }
}
