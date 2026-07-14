import { request } from '../api-client';
import type { ApiResponse, Assessment, AssessmentType } from '../api-types';

export const gradesApi = {
  getMyAssessments: (payload?: { classId?: string; subjectId?: string; semesterId?: string }) => {
    const params = new URLSearchParams();

    if (payload?.classId) {
      params.set('classId', payload.classId);
    }

    if (payload?.subjectId) {
      params.set('subjectId', payload.subjectId);
    }

    if (payload?.semesterId) {
      params.set('semesterId', payload.semesterId);
    }

    return request<ApiResponse<Assessment[]>>(
      `/student-grades/assessments/mine${params.size ? `?${params}` : ''}`,
    );
  },
  getAssessment: (id: string) =>
    request<ApiResponse<Assessment>>(`/student-grades/assessments/${id}`),
  createAssessment: (payload: {
    schoolYearId: string;
    semesterId: string;
    classId: string;
    subjectId: string;
    title: string;
    type: AssessmentType;
    assessmentDate: string;
    maxScore?: number;
    weight?: number;
    notes?: string;
  }) =>
    request<ApiResponse<Assessment>>('/student-grades/assessments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  saveAssessmentScores: (
    id: string,
    payload: { scores: Array<{ scoreId: string; score?: number | null; notes?: string | null }> },
  ) =>
    request<ApiResponse<Assessment>>(`/student-grades/assessments/${id}/scores`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  submitAssessment: (id: string) =>
    request<ApiResponse<Assessment>>(`/student-grades/assessments/${id}/submit`, { method: 'POST' }),
};
