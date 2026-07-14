import { getApiUrl, request, upload } from './api-client';
import { academicApi } from './api-modules/academic-api';
import { authApi } from './api-modules/auth-api';
import { gradesApi } from './api-modules/grades-api';
import { notificationApi } from './api-modules/notification-api';
import { operationsApi } from './api-modules/operations-api';
import { planningApi } from './api-modules/planning-api';
import { reportingApi } from './api-modules/reporting-api';
import { scheduleApi } from './api-modules/schedule-api';
import type {
  ApiResponse,
  ImportSummary,
  ImportType,
  ParentPortalSummary,
  ReportFormat,
  ReportType,
  StudentLeaveRequest,
  StudentLeaveRequestType
} from './api-types';

export type * from './api-types';

export const api = {
  ...authApi,
  ...academicApi,
  ...planningApi,
  ...gradesApi,
  ...scheduleApi,
  ...notificationApi,
  ...reportingApi,
  ...operationsApi,
  importAcademicData: (type: ImportType, file: File) =>
    upload<ApiResponse<ImportSummary>>(`/academic/import/${type}`, file),
  getReportExportUrl: (type: ReportType, format: ReportFormat, date: string) =>
    `${getApiUrl()}/reporting/exports/${type}?format=${format}&date=${date}`,
  getParentPortalSummary: (contact: string) =>
    request<ApiResponse<ParentPortalSummary>>(
      `/parent-portal/summary?contact=${encodeURIComponent(contact)}`,
    ),
  getMyStudentLeaveRequests: () =>
    request<ApiResponse<StudentLeaveRequest[]>>('/student-leaves/mine'),
  createMyStudentLeaveRequest: (payload: {
    studentId: string;
    dateFrom: string;
    dateTo: string;
    type: StudentLeaveRequestType;
    reason: string;
  }) =>
    request<ApiResponse<StudentLeaveRequest>>('/student-leaves/mine', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getStudentLeaveReviewQueue: () =>
    request<ApiResponse<StudentLeaveRequest[]>>('/student-leaves/review'),
  reviewStudentLeaveRequest: (
    id: string,
    payload: { status: 'APPROVED' | 'REJECTED'; reviewNote?: string },
  ) =>
    request<ApiResponse<StudentLeaveRequest>>(`/student-leaves/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
