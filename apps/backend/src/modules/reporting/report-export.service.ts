import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

export type ReportRow = Record<string, string | number | null>;

export type ExcelSheet = {
  name: string;
  rows: ReportRow[];
};

@Injectable()
export class ReportExportService {
  toExcel(reportName: string, rows: ReportRow[]) {
    return this.toExcelWorkbook([{ name: reportName, rows }]);
  }

  toExcelWorkbook(sheets: ExcelSheet[]) {
    const workbook = XLSX.utils.book_new();

    for (const [index, sheet] of sheets.entries()) {
      const rows = sheet.rows.length ? sheet.rows : [{ Informasi: 'Tidak ada data' }];
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = this.getColumnWidths(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.toSheetName(sheet.name, index));
    }

    return XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
    }) as Buffer;
  }

  async toPdf(reportName: string, rows: ReportRow[]) {
    const PDFDocumentModule = await import('pdfkit');
    const PDFDocument = PDFDocumentModule.default ?? PDFDocumentModule;
    const document = new PDFDocument({
      margin: 40,
      size: 'A4',
    });
    const chunks: Buffer[] = [];

    document.on('data', (chunk: Buffer) => chunks.push(chunk));

    document.fontSize(18).text(reportName, { underline: true });
    document.moveDown();
    document.fontSize(10).fillColor('#475569');
    document.text(`Generated at: ${new Date().toLocaleString('id-ID')}`);
    document.moveDown();

    if (!rows.length) {
      document.fillColor('#0f172a').fontSize(12).text('Tidak ada data.');
    } else {
      for (const [index, row] of rows.entries()) {
        document
          .fillColor('#1d4ed8')
          .fontSize(11)
          .text(`${index + 1}. ${this.getRowTitle(row)}`);
        document.fillColor('#0f172a').fontSize(9);

        for (const [key, value] of Object.entries(row)) {
          document.text(`${key}: ${value ?? '-'}`);
        }

        document.moveDown();
      }
    }

    document.end();

    return new Promise<Buffer>((resolve) => {
      document.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private getRowTitle(row: ReportRow) {
    return String(
      row.nama ??
        row.kelas ??
        row.guru ??
        row.siswa ??
        row.mapel ??
        row.status ??
        'Data',
    );
  }

  private getColumnWidths(rows: ReportRow[]) {
    const sample = rows.slice(0, 25);
    return Object.keys(rows[0] ?? {}).map((key) => ({
      wch: Math.max(
        10,
        Math.min(
          34,
          [key, ...sample.map((row) => row[key])]
            .map((value) => String(value ?? '').length)
            .reduce((max, length) => Math.max(max, length), 0) + 2,
        ),
      ),
    }));
  }

  private toSheetName(reportName: string, index = 0) {
    const suffix = index ? ` ${index + 1}` : '';
    return `${reportName}${suffix}`.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Report';
  }
}
