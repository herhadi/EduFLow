import { getApiUrl, upload } from '../api-client';
import type { ApiResponse, ImportSummary, ImportType, ReportFormat, ReportType } from '../api-types';

export const importExportApi = {
  importAcademicData: (type: ImportType, file: File) =>
    upload<ApiResponse<ImportSummary>>(`/academic/import/${type}`, file),
  getReportExportUrl: (type: ReportType, format: ReportFormat, date: string) =>
    `${getApiUrl()}/reporting/exports/${type}?format=${format}&date=${date}`,
};
