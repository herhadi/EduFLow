import {
  type AssessmentScore,
  type AssessmentStatus,
  type AssessmentType,
} from '../../lib/api';

export type ScoreDraft = Record<string, { score: string; notes: string }>;

export type AssessmentFormState = {
  schoolYearId: string;
  semesterId: string;
  classId: string;
  subjectId: string;
  title: string;
  type: AssessmentType;
  assessmentDate: string;
  maxScore: number;
  weight: number;
  notes: string;
};

export const assessmentTypeLabels: Record<AssessmentType, string> = {
  DAILY_TASK: 'Tugas',
  QUIZ: 'Kuis',
  DAILY_TEST: 'Ulangan Harian',
  PRACTICE: 'Praktik',
  PROJECT: 'Proyek',
  PORTFOLIO: 'Portofolio',
  OBSERVATION: 'Observasi',
  OTHER: 'Lainnya',
};

export const assessmentStatusLabels: Record<AssessmentStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  LOCKED: 'Terkunci',
  REVISION_REQUESTED: 'Revisi',
};

export function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function getEmptyAssessmentForm(): AssessmentFormState {
  return {
    schoolYearId: '',
    semesterId: '',
    classId: '',
    subjectId: '',
    title: '',
    type: 'DAILY_TASK',
    assessmentDate: getToday(),
    maxScore: 100,
    weight: 1,
    notes: '',
  };
}

export function isAssessmentEditable(status: AssessmentStatus) {
  return status === 'DRAFT' || status === 'REVISION_REQUESTED';
}

export function toScoreDraft(scores: AssessmentScore[]) {
  return Object.fromEntries(
    scores.map((score) => [
      score.id,
      {
        score: score.score === null || score.score === undefined ? '' : String(score.score),
        notes: score.notes ?? '',
      },
    ]),
  );
}
