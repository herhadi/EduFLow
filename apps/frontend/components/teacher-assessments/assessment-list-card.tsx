import { type Assessment } from '../../lib/api';
import { formatReadableDate } from '../../lib/format';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import {
  assessmentStatusLabels,
  assessmentTypeLabels,
} from './teacher-assessment-utils';

type AssessmentListCardProps = {
  assessments: Assessment[];
  onOpen: (id: string) => void;
  selectedAssessmentId?: string;
};

export function AssessmentListCard({
  assessments,
  onOpen,
  selectedAssessmentId,
}: AssessmentListCardProps) {
  return (
    <Card>
      <h3 className="text-sm font-black text-slate-900">Komponen Nilai</h3>
      <div className="mt-3 space-y-2">
        {assessments.map((assessment) => (
          <button
            className={`w-full rounded-2xl border p-3 text-left transition ${
              selectedAssessmentId === assessment.id ? 'border-brand-300 bg-brand-50' : 'border-blue-50 bg-slate-50 hover:border-brand-200'
            }`}
            key={assessment.id}
            onClick={() => onOpen(assessment.id)}
            type="button"
          >
            <p className="text-sm font-black text-slate-900">{assessment.title}</p>
            <p className="mt-1 text-xs font-semibold text-muted">
              {assessment.class.name} · {assessment.subject.name}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>{assessmentTypeLabels[assessment.type]}</Badge>
              <Badge>{assessmentStatusLabels[assessment.status]}</Badge>
              <Badge>{formatReadableDate(assessment.assessmentDate)}</Badge>
            </div>
          </button>
        ))}
        {!assessments.length ? (
          <EmptyState title="Belum ada komponen nilai." />
        ) : null}
      </div>
    </Card>
  );
}
