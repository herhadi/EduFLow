import { request, upload } from '../api-client';
import type { ApiResponse, TeachingPlan, TeachingPlanRevisionPriority, TeachingPlanType } from '../api-types';

export const planningApi = {
  getMyTeachingPlans: () => request<ApiResponse<TeachingPlan[]>>('/academic-planning/mine'),
  createTeachingPlan: (payload: { subjectId: string; schoolYearId: string; semesterId?: string; type: TeachingPlanType; title: string; description?: string; attachmentUrl?: string }) =>
    request<ApiResponse<TeachingPlan>>('/academic-planning', { method: 'POST', body: JSON.stringify(payload) }),
  uploadTeachingPlanAttachment: (id: string, file: File) =>
    upload<ApiResponse<TeachingPlan>>(`/academic-planning/${id}/attachment`, file),
  getTeachingPlanAttachmentUrl: (id: string) =>
    request<ApiResponse<{ url: string }>>(`/academic-planning/${id}/attachment-url`),
  getTeachingPlanReviewQueue: () =>
    request<ApiResponse<TeachingPlan[]>>('/academic-planning/review-queue'),
  reviewTeachingPlan: (id: string, payload: {
    status: 'APPROVED' | 'REVISION_REQUESTED';
    reviewNote?: string;
    reviewSection?: string;
    reviewPriority?: TeachingPlanRevisionPriority;
  }) =>
    request<ApiResponse<TeachingPlan>>(`/academic-planning/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  submitTeachingPlan: (id: string) =>
    request<ApiResponse<TeachingPlan>>(`/academic-planning/${id}/submit`, { method: 'POST' }),
};
