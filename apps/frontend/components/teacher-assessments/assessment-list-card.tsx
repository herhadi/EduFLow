import { type Assessment } from '../../lib/api';
import { formatReadableDate } from '../../lib/format';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { AssessmentScoresEditor } from './assessment-scores-editor';
import {
  assessmentStatusLabels,
  assessmentTypeLabels,
  type ScoreDraft,
} from './teacher-assessment-utils';

type AssessmentListCardProps = {
  assessments: Assessment[];
  draft: ScoreDraft;
  onOpen: (id: string) => void;
  onDraftChange: (draft: ScoreDraft) => void;
  onSave: () => void;
  onSubmit: () => void;
  saving: boolean;
  selectedAssessment: Assessment | null;
};

export function AssessmentListCard({
  assessments,
  draft,
  onOpen,
  onDraftChange,
  onSave,
  onSubmit,
  saving,
  selectedAssessment,
}: AssessmentListCardProps) {
  return (
    <Card>
      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Komponen Nilai</h3>
      <div className="mt-3 space-y-2">
        {assessments.map((assessment) => {
          const isSelected = selectedAssessment?.id === assessment.id;

          return (
          <div
            className={`overflow-hidden rounded-2xl border transition ${
              isSelected
                ? 'border-brand-300 bg-brand-50 dark:border-blue-400/30 dark:bg-blue-500/15'
                : 'border-blue-50 bg-slate-50 hover:border-brand-200 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-400/30'
            }`}
            key={assessment.id}
          >
            <button
              className="w-full p-3 text-left"
              onClick={() => onOpen(assessment.id)}
              type="button"
            >
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">{assessment.title}</p>
              <p className="mt-1 text-xs font-semibold text-muted">
                {assessment.class.name} · {assessment.subject.name}
              </p>
              {isSelected ? (
                <p className="mt-1 text-[11px] font-black text-brand-700 dark:text-blue-100">
                  Terbuka inline · klik lagi untuk tutup
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>{assessmentTypeLabels[assessment.type]}</Badge>
                <Badge>{assessmentStatusLabels[assessment.status]}</Badge>
                <Badge>{formatReadableDate(assessment.assessmentDate)}</Badge>
              </div>
            </button>
            {isSelected ? (
              <div className="border-t border-brand-100 p-3 dark:border-blue-400/20">
                <AssessmentScoresEditor
                  assessment={selectedAssessment}
                  draft={draft}
                  embedded
                  onDraftChange={onDraftChange}
                  onSave={onSave}
                  onSubmit={onSubmit}
                  saving={saving}
                />
              </div>
            ) : null}
          </div>
          );
        })}
        {!assessments.length ? (
          <EmptyState title="Belum ada komponen nilai." />
        ) : null}
      </div>
    </Card>
  );
}
