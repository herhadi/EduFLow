import { type OperationalDashboardSummary } from '../../lib/api';
import {
  formatTimeRange,
  getAgendaStatusClass,
  getAgendaStatusLabel,
} from './operational-dashboard-utils';

type AgendaFollowUpItemProps = {
  item: NonNullable<OperationalDashboardSummary['kbm']>['followUpItems'][number];
};

export function AgendaFollowUpItem({ item }: AgendaFollowUpItemProps) {
  return (
    <div className="rounded-xl bg-white p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-black text-slate-900">
            {item.className} · {item.subjectName}
          </p>
          <p className="mt-1 text-xs font-semibold text-muted">
            {formatTimeRange(item.startsAt, item.endsAt)} · {item.teacherName}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${getAgendaStatusClass(item.status)}`}>
          {getAgendaStatusLabel(item.status)}
        </span>
      </div>
      {item.substituteTeacherName ? (
        <p className="mt-2 text-xs font-semibold text-emerald-700">
          Pengganti: {item.substituteTeacherName}
        </p>
      ) : null}
      {item.issueNotes ? (
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-800">
          {item.issueNotes}
        </p>
      ) : null}
    </div>
  );
}
