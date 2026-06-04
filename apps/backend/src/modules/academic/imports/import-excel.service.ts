import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

export type ImportRow = Record<string, string>;

@Injectable()
export class ImportExcelService {
  parse(file?: { buffer: Buffer; originalname?: string }) {
    if (!file) {
      throw new BadRequestException('File Excel wajib diupload');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new BadRequestException('File Excel tidak memiliki sheet');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });

    return rows.map((row) => this.normalizeRow(row));
  }

  private normalizeRow(row: Record<string, unknown>): ImportRow {
    return Object.entries(row).reduce<ImportRow>((normalizedRow, [key, value]) => {
      normalizedRow[this.normalizeKey(key)] = this.normalizeValue(value);
      return normalizedRow;
    }, {});
  }

  private normalizeKey(key: string) {
    return key.trim().toLowerCase().replace(/\s+/g, '_');
  }

  private normalizeValue(value: unknown) {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return String(value ?? '').trim();
  }
}
