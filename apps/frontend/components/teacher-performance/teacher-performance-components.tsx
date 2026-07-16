import { useState } from 'react';
import { type TeacherPerformanceItem } from '../../lib/api';
import { formatReadableDate } from '../../lib/format';
import { getTeacherRiskLevel } from './teacher-performance-utils';
import { fieldClass } from '../ui/form';

export function DateInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
      {label}
      <input
        className={`${fieldClass} font-normal`}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => undefined}
        type="date"
        value={value}
      />
    </label>
  );
}

export function TeacherCard({
  teacher,
}: {
  teacher: TeacherPerformanceItem;
}) {
  const [open, setOpen] = useState(false);
  const risk = getTeacherRiskLevel(teacher);
  const riskMeta = {
    attention: {
      label: 'Perlu perhatian',
      card: 'border-rose-100 dark:border-rose-400/20',
      badge: 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/15 dark:text-rose-100',
    },
    note: {
      label: 'Ada catatan',
      card: 'border-amber-100 dark:border-amber-400/20',
      badge: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
    },
    safe: {
      label: 'Aman',
      card: 'border-emerald-100 dark:border-emerald-400/20',
      badge: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-100',
    },
  }[risk];

  return (
    <article
      className={`rounded-2xl border ${riskMeta.card} bg-white p-4 dark:bg-slate-950`}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black text-slate-900 dark:text-slate-100">{teacher.teacherName}</h3>
            <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-black ${riskMeta.badge}`}>
              {riskMeta.label}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-muted">
            {teacher.totalSessions} sesi · submit {teacher.submitRate}% · tepat waktu {teacher.onTimeSubmissions}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-black text-slate-700 dark:text-slate-200 sm:flex sm:text-left">
          <CompactMetric label="Submit" value={teacher.submittedSessions} />
          <CompactMetric label="Telat" tone="warning" value={teacher.lateSubmissions} />
          <CompactMetric label="Kosong" tone="danger" value={teacher.emptyClasses} />
          <CompactMetric label="Belum" tone="warning" value={teacher.notSubmitted} />
        </div>
      </div>

      <button
        className="mt-3 text-xs font-black text-brand-700"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? 'Tutup aktivitas' : 'Lihat aktivitas terbaru'}
      </button>

      {open ? (
        <div className="mt-3 space-y-2">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Aktivitas Terbaru</h4>
          {teacher.latestSessions.map((session) => (
            <div
              className="rounded-2xl border border-blue-50 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"
              key={session.agendaId}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{session.subjectName}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatReadableDate(session.date)} · {session.className}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    session.isLate
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100'
                  }`}
                >
                  {session.isLate ? 'Terlambat' : 'On time'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function CompactMetric({
  label,
  tone = 'default',
  value,
}: {
  label: string;
  tone?: 'default' | 'warning' | 'danger';
  value: number;
}) {
  const toneClass = {
    default: 'bg-blue-50 text-brand-700 dark:bg-blue-500/15 dark:text-blue-100',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-100',
  }[tone];

  return (
    <span className={`rounded-xl px-2 py-2 ${toneClass}`}>
      <span className="block text-[0.65rem] font-bold">{label}</span>
      <span className="block text-sm">{value}</span>
    </span>
  );
}
