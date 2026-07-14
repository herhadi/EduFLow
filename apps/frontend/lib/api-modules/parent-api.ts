import { request } from '../api-client';
import type {
  ApiResponse,
  ParentPortalSummary,
  StudentLeaveRequest,
  StudentLeaveRequestType,
} from '../api-types';

export const parentApi = {
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
