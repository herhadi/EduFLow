import { request } from '../api-client';
import type { ActivityTrailItem, ApiResponse, AttendanceStatus, LoginAuditItem, OperationalDashboardSummary, StudentReportDashboard, TeacherPerformanceDashboard } from '../api-types';

export const reportingApi = {
  getOperationalDashboard: () =>
    request<ApiResponse<OperationalDashboardSummary>>(
      '/reporting/operational/today',
    ),
  getTeacherPerformance: (from?: string, to?: string) => {
    const params = new URLSearchParams();

    if (from) {
      params.set('from', from);
    }

    if (to) {
      params.set('to', to);
    }

    return request<ApiResponse<TeacherPerformanceDashboard>>(
      `/reporting/teacher-performance${params.size ? `?${params}` : ''}`,
    );
  },
  getStudentReport: (payload: {
    from?: string;
    to?: string;
    classId?: string;
    status?: AttendanceStatus | '';
  }) => {
    const params = new URLSearchParams();

    if (payload.from) {
      params.set('from', payload.from);
    }

    if (payload.to) {
      params.set('to', payload.to);
    }

    if (payload.classId) {
      params.set('classId', payload.classId);
    }

    if (payload.status) {
      params.set('status', payload.status);
    }

    return request<ApiResponse<StudentReportDashboard>>(
      `/reporting/students${params.size ? `?${params}` : ''}`,
    );
  },
  getAuditCalendar: (month: string) => request<ApiResponse<Array<{ date: string; count: number }>>>(`/audit/calendar?month=${encodeURIComponent(month)}`),
  getActivityTrail: (date?: string) => request<ApiResponse<ActivityTrailItem[]>>(`/audit/activity${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  getLoginAudit: (date?: string) => request<ApiResponse<LoginAuditItem[]>>(`/audit/login${date ? `?date=${encodeURIComponent(date)}` : ''}`),
};
