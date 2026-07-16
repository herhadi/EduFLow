import { useEffect, useState } from 'react';
import { type OperationalDashboardSummary } from '../../lib/api';
import { formatNumber } from '../../lib/format';
import { AgendaFollowUpItem } from './agenda-follow-up-item';
import {
  emptySummary,
  matchesPriority,
  type PrincipalPriorityKey,
} from './operational-dashboard-utils';

type PrincipalPriorityPanelProps = {
  initialPriority: PrincipalPriorityKey;
  summary: OperationalDashboardSummary;
};

export function PrincipalPriorityPanel({
  initialPriority,
  summary,
}: PrincipalPriorityPanelProps) {
  const kbm = summary.kbm ?? emptySummary.kbm!;
  const [activeDetail, setActiveDetail] = useState<PrincipalPriorityKey>(initialPriority);

  useEffect(() => {
    setActiveDetail(initialPriority);
  }, [initialPriority]);

  const urgentItems = [
    {
      key: 'empty',
      label: 'Kelas kosong',
      value: summary.classes.empty,
      description: 'Perlu keputusan cepat agar kelas tidak tanpa pendamping.',
      tone: summary.classes.empty > 0 ? 'danger' : 'good',
    },
    {
      key: 'notSubmitted',
      label: 'Belum submit',
      value: summary.classes.notSubmitted,
      description: 'Presensi atau laporan KBM belum masuk dari guru.',
      tone: summary.classes.notSubmitted > 0 ? 'warning' : 'good',
    },
    {
      key: 'issues',
      label: 'Kendala KBM',
      value: kbm.checklist.withIssueNotes,
      description: 'Catatan kendala dari kelas yang sudah berjalan.',
      tone: kbm.checklist.withIssueNotes > 0 ? 'danger' : 'good',
    },
    {
      key: 'missing',
      label: 'Checklist kurang',
      value: kbm.checklist.missing,
      description: 'Presensi, materi, atau foto kelas belum lengkap.',
      tone: kbm.checklist.missing > 0 ? 'warning' : 'good',
    },
    {
      key: 'substitutes',
      label: 'Guru pengganti',
      value: kbm.substitutes.total,
      description: 'Informasi perubahan pengajar hari ini.',
      tone: kbm.substitutes.total > 0 ? 'info' : 'good',
    },
  ] satisfies Array<{
    description: string;
    key: PrincipalPriorityKey;
    label: string;
    tone: 'danger' | 'good' | 'info' | 'warning';
    value: number;
  }>;
  const filteredFollowUpItems = kbm.followUpItems
    .filter((item) => matchesPriority(item, activeDetail))
    .slice(0, 6);
  const activeLabel = activeDetail === 'all'
    ? 'Semua perhatian'
    : urgentItems.find((item) => item.key === activeDetail)?.label ?? 'Detail';

  return (
    <section className="min-w-0 rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-brand-700 sm:text-xs">
            Prioritas KS
          </p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900 sm:text-xl">
            Perlu Dilihat Lebih Dulu
          </h3>
          <p className="mt-1 hidden text-sm leading-6 text-muted sm:block">
            Urutan ini menempatkan kelas kosong, presensi belum submit, dan kendala KBM sebelum statistik umum.
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {urgentItems.map((item) => (
          <PrincipalPriorityCard
            active={activeDetail === item.key}
            description={item.description}
            key={item.label}
            label={item.label}
            onClick={() => setActiveDetail((current) => current === item.key ? 'all' : item.key)}
            tone={item.tone}
            value={item.value}
          />
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-black text-slate-900">Daftar Perhatian Teratas</h4>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600">
              {activeLabel}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600">
              {formatNumber(filteredFollowUpItems.length)}
            </span>
          </div>
        </div>
        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          {filteredFollowUpItems.length > 0 ? (
            filteredFollowUpItems.map((item) => (
              <AgendaFollowUpItem item={item} key={item.agendaId} />
            ))
          ) : (
            <p className="rounded-xl bg-white p-3 text-sm font-semibold text-emerald-700">
              Belum ada agenda prioritas tinggi hari ini.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function PrincipalPriorityCard({
  active,
  description,
  label,
  onClick,
  tone,
  value,
}: {
  active: boolean;
  description: string;
  label: string;
  onClick: () => void;
  tone: 'danger' | 'good' | 'info' | 'warning';
  value: number;
}) {
  const toneClass = {
    danger: 'border-rose-200 bg-rose-50 text-rose-700',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
  }[tone];

  return (
    <button
      className={`min-w-0 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 sm:rounded-2xl sm:p-4 ${toneClass} ${active ? 'ring-2 ring-brand-500 ring-offset-2' : ''}`}
      onClick={onClick}
      type="button"
    >
      <p className="text-xl font-black sm:text-2xl">{formatNumber(value)}</p>
      <h4 className="mt-1 text-xs font-black text-slate-900 sm:mt-2 sm:text-sm">{label}</h4>
      <p className="mt-1 hidden text-xs font-semibold leading-5 opacity-80 sm:block">{description}</p>
    </button>
  );
}
