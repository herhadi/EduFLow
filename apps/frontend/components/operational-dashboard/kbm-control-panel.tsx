import { type OperationalDashboardSummary } from '../../lib/api';
import { formatNumber, formatReadableDate } from '../../lib/format';
import { MetricCard } from '../ui/metric-card';
import { AgendaFollowUpItem } from './agenda-follow-up-item';
import { emptySummary, formatTimeRange } from './operational-dashboard-utils';

type KbmControlPanelProps = {
  summary: OperationalDashboardSummary;
};

export function KbmControlPanel({ summary }: KbmControlPanelProps) {
  const kbm = summary.kbm ?? emptySummary.kbm;
  const followUpItems = kbm?.followUpItems ?? [];
  const substitutes = kbm?.substitutes.items ?? [];

  return (
    <section className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold">Kendali KBM</h3>
          <p className="mt-1 text-sm text-muted">
            Checklist guru, guru pengganti, dan agenda yang perlu dipantau hari ini.
          </p>
        </div>
        <span className="w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
          {formatReadableDate(summary.date)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <MetricCard label="Guru Hadir" tone="good" value={kbm?.checklist.teacherPresent ?? 0} />
        <MetricCard label="Presensi Siswa" tone="good" value={kbm?.checklist.studentAttendanceDone ?? 0} />
        <MetricCard label="Materi Terisi" value={kbm?.checklist.materialFilled ?? 0} />
        <MetricCard label="Foto Kelas" value={kbm?.checklist.classPhotoDone ?? 0} />
        <MetricCard label="Checklist Kurang" tone={(kbm?.checklist.missing ?? 0) > 0 ? 'warning' : 'good'} value={kbm?.checklist.missing ?? 0} />
        <MetricCard label="Kendala" tone={(kbm?.checklist.withIssueNotes ?? 0) > 0 ? 'danger' : 'good'} value={kbm?.checklist.withIssueNotes ?? 0} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-black text-slate-900">Tindak Lanjut</h4>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600">
              {formatNumber(followUpItems.length)}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {followUpItems.length > 0 ? (
              followUpItems.map((item) => (
                <AgendaFollowUpItem key={item.agendaId} item={item} />
              ))
            ) : (
              <p className="rounded-xl bg-white p-3 text-sm font-semibold text-emerald-700">
                Belum ada agenda yang membutuhkan tindak lanjut.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-black text-slate-900">Guru Pengganti</h4>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-emerald-700">
              {formatNumber(kbm?.substitutes.total ?? 0)}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {substitutes.length > 0 ? (
              substitutes.map((item) => (
                <div key={item.agendaId} className="rounded-xl bg-white p-3 text-sm">
                  <p className="font-black text-slate-900">
                    {item.className} · {item.subjectName}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {formatTimeRange(item.startsAt, item.endsAt)}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {item.teacherName} diganti oleh{' '}
                    <span className="font-black text-emerald-700">
                      {item.substituteTeacherName ?? '-'}
                    </span>
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-xl bg-white p-3 text-sm font-semibold text-muted">
                Tidak ada guru pengganti hari ini.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
