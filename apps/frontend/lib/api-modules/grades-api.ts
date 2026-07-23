import { downloadFile, request } from '../api-client';
import type { ApiResponse, Assessment, AssessmentExcelPreview, AssessmentType } from '../api-types';

type AssessmentExportPayload = {
  schoolYearId: string;
  semesterId: string;
  classId: string;
  subjectId: string;
  from?: string;
  to?: string;
};

function getAssessmentExportPath(payload: AssessmentExportPayload, preview = false) {
  const params = new URLSearchParams({
    schoolYearId: payload.schoolYearId,
    semesterId: payload.semesterId,
    classId: payload.classId,
    subjectId: payload.subjectId,
  });

  if (payload.from) {
    params.set('from', payload.from);
  }

  if (payload.to) {
    params.set('to', payload.to);
  }

  return `/student-grades/assessments/${preview ? 'export-preview' : 'export'}?${params}`;
}

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
  getAssessmentExcelPreview: (payload: AssessmentExportPayload) =>
    request<ApiResponse<AssessmentExcelPreview>>(getAssessmentExportPath(payload, true)),
  downloadAssessmentExcel: (payload: AssessmentExportPayload) =>
    downloadFile(getAssessmentExportPath(payload), 'nilai-harian.xlsx'),
};
