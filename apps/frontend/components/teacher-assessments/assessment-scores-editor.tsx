import { type Assessment } from '../../lib/api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import {
  isAssessmentEditable,
  type ScoreDraft,
} from './teacher-assessment-utils';

type AssessmentScoresEditorProps = {
  assessment: Assessment | null;
  draft: ScoreDraft;
  onDraftChange: (draft: ScoreDraft) => void;
  onSave: () => void;
  onSubmit: () => void;
  saving: boolean;
};

export function AssessmentScoresEditor({
  assessment,
  draft,
  onDraftChange,
  onSave,
  onSubmit,
  saving,
}: AssessmentScoresEditorProps) {
  if (!assessment) {
    return (
      <EmptyState title="Pilih atau buat komponen nilai untuk mulai input skor siswa." />
    );
  }

  const editable = isAssessmentEditable(assessment.status);

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">{assessment.title}</h3>
          <p className="mt-1 text-sm font-semibold text-muted">
            {assessment.class.name} · {assessment.subject.name} · Maks. {Number(assessment.maxScore)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button disabled={!editable || saving} onClick={onSave} size="sm" variant="outline">
            Simpan
          </Button>
          <Button disabled={!editable || saving} onClick={onSubmit} size="sm">
            Submit
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {(assessment.scores ?? []).map((score) => (
          <div className="grid gap-2 rounded-2xl border border-blue-50 bg-slate-50 p-3 md:grid-cols-[1.3fr_120px_1fr]" key={score.id}>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900">{score.student.name}</p>
              <p className="mt-1 text-xs font-semibold text-muted">NIS: {score.student.nis ?? '-'}</p>
            </div>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black outline-none focus:border-brand-600 disabled:bg-slate-100"
              disabled={!editable}
              max={Number(assessment.maxScore)}
              min={0}
              onChange={(event) => onDraftChange({ ...draft, [score.id]: { ...(draft[score.id] ?? { notes: '' }), score: event.target.value } })}
              placeholder="Nilai"
              type="number"
              value={draft[score.id]?.score ?? ''}
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-brand-600 disabled:bg-slate-100"
              disabled={!editable}
              onChange={(event) => onDraftChange({ ...draft, [score.id]: { ...(draft[score.id] ?? { score: '' }), notes: event.target.value } })}
              placeholder="Catatan"
              value={draft[score.id]?.notes ?? ''}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
