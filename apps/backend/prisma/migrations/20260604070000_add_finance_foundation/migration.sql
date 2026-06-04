CREATE TYPE "FeeFrequency" AS ENUM ('ONCE', 'MONTHLY', 'SEMESTER', 'YEARLY');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'OVERDUE', 'VOID');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "PaymentMethodType" AS ENUM ('CASH', 'BANK_TRANSFER', 'VIRTUAL_ACCOUNT', 'EWALLET', 'QRIS', 'OTHER');

CREATE TABLE "FeeType" (
  "id" UUID NOT NULL,
  "schoolYearId" UUID,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(14,2) NOT NULL,
  "frequency" "FeeFrequency" NOT NULL DEFAULT 'ONCE',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "FeeType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentMethod" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" "PaymentMethodType" NOT NULL,
  "provider" TEXT,
  "accountName" TEXT,
  "accountNo" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
  "id" UUID NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "feeTypeId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "guardianId" UUID,
  "schoolYearId" UUID,
  "period" TEXT,
  "amount" DECIMAL(14,2) NOT NULL,
  "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "issuedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" UUID NOT NULL,
  "invoiceId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "guardianId" UUID,
  "paymentMethodId" UUID NOT NULL,
  "receivedById" UUID,
  "amount" DECIMAL(14,2) NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "referenceNo" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeeType_code_key" ON "FeeType"("code");
CREATE INDEX "FeeType_schoolYearId_isActive_idx" ON "FeeType"("schoolYearId", "isActive");
CREATE INDEX "FeeType_frequency_idx" ON "FeeType"("frequency");

CREATE UNIQUE INDEX "PaymentMethod_code_key" ON "PaymentMethod"("code");
CREATE INDEX "PaymentMethod_type_isActive_idx" ON "PaymentMethod"("type", "isActive");

CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_studentId_status_idx" ON "Invoice"("studentId", "status");
CREATE INDEX "Invoice_guardianId_status_idx" ON "Invoice"("guardianId", "status");
CREATE INDEX "Invoice_schoolYearId_status_idx" ON "Invoice"("schoolYearId", "status");
CREATE INDEX "Invoice_feeTypeId_idx" ON "Invoice"("feeTypeId");
CREATE INDEX "Invoice_dueAt_status_idx" ON "Invoice"("dueAt", "status");

CREATE INDEX "Payment_invoiceId_status_idx" ON "Payment"("invoiceId", "status");
CREATE INDEX "Payment_studentId_status_idx" ON "Payment"("studentId", "status");
CREATE INDEX "Payment_guardianId_status_idx" ON "Payment"("guardianId", "status");
CREATE INDEX "Payment_paymentMethodId_idx" ON "Payment"("paymentMethodId");
CREATE INDEX "Payment_receivedById_idx" ON "Payment"("receivedById");
CREATE INDEX "Payment_referenceNo_idx" ON "Payment"("referenceNo");

ALTER TABLE "FeeType" ADD CONSTRAINT "FeeType_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_feeTypeId_fkey" FOREIGN KEY ("feeTypeId") REFERENCES "FeeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
