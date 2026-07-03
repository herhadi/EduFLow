'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type TeacherPerformanceDashboard as TeacherPerformanceData,
  type TeacherPerformanceItem,
} from '../lib/api';
import { formatReadableDate } from '../lib/format';
import { MetricCard } from './ui/metric-card';

type LoadState = 'idle' | 'loading' | 'success' | 'error';
type QuickRange = 'week' | 'month' | 'custom';
type RiskFilter = 'all' | 'attention' | 'note' | 'safe';
const pageSize = 10;

function getDefaultRange() {
  const to = new Date();
  const from = new Date(Date.UTC(to.getFullYear(), to.getMonth(), 1));

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function TeacherPerformanceDashboard() {
  const defaultRange = getDefaultRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [quickRange, setQuickRange] = useState<QuickRange>('month');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [dashboard, setDashboard] = useState<TeacherPerformanceData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');

  async function loadDashboard() {
    setLoadState('loading');

    try {
      const response = await api.getTeacherPerformance(from, to);
      setDashboard(response.data);
      setVisibleCount(pageSize);
      setLoadState('success');
    } catch {
      setLoadState('error');
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const filteredTeachers = useMemo(() => {
    const teachers = dashboard?.teachers ?? [];
    const keyword = search.trim().toLowerCase();

    return teachers.filter((teacher) => {
      const matchesSearch = !keyword || teacher.teacherName.toLowerCase().includes(keyword);
      const risk = getRiskLevel(teacher);
      const matchesRisk = riskFilter === 'all' || risk === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [dashboard?.teachers, riskFilter, search]);

  const visibleTeachers = filteredTeachers.slice(0, visibleCount);

  function applyQuickRange(range: QuickRange) {
    setQuickRange(range);
    if (range === 'custom') return;

    const nextTo = new Date();
    const nextFrom = new Date(nextTo);
    if (range === 'week') {
      nextFrom.setDate(nextTo.getDate() - 6);
    } else {
      nextFrom.setUTCDate(1);
    }

    setFrom(nextFrom.toISOString().slice(0, 10));
    setTo(nextTo.toISOString().slice(0, 10));
  }

  return (
    <section className="mt-8 space-y-5">
      <div className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              Monitoring Guru
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
              Performa Guru Mengajar
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Fokus pada guru yang perlu tindak lanjut, bukan leaderboard.
            </p>
          </div>
          <button
            className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-black text-brand-700 transition hover:bg-blue-100"
            onClick={() => void loadDashboard()}
            type="button"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ['month', 'Bulan Ini'],
            ['week', '7 Hari'],
            ['custom', 'Custom'],
          ].map(([value, label]) => (
            <button
              className={`rounded-full border px-3 py-2 text-xs font-black ${
                quickRange === value
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-blue-100 bg-white text-brand-700'
              }`}
              key={value}
              onClick={() => applyQuickRange(value as QuickRange)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <DateInput label="Dari" onChange={(value) => { setQuickRange('custom'); setFrom(value); }} value={from} />
          <DateInput label="Sampai" onChange={(value) => { setQuickRange('custom'); setTo(value); }} value={to} />
          <button
            className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white transition hover:bg-brand-700 sm:self-end"
            disabled={loadState === 'loading'}
            onClick={() => void loadDashboard()}
            type="button"
          >
              {loadState === 'loading' ? 'Memuat...' : 'Terapkan'}
            </button>
        </div>
      </div>

      {loadState === 'error' ? (
        <div className="rounded-[2rem] border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700">
          Data performa guru belum bisa dimuat. Pastikan backend berjalan.
        </div>
      ) : null}

      {dashboard ? (
        <>
          <section className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60">
            <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
              Periode
            </p>
            <h3 className="mt-1 text-xl font-bold">
              {formatReadableDate(dashboard.from)} -{' '}
              {formatReadableDate(dashboard.to)}
            </h3>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="Total Guru" value={dashboard.totalTeachers} />
              <MetricCard label="Sesi Mengajar" value={dashboard.totalSessions} />
              <MetricCard
                label="Terlambat Submit"
                tone="warning"
                value={dashboard.totalLateSubmissions}
              />
              <MetricCard
                label="Kelas Kosong"
                tone="danger"
                value={dashboard.totalEmptyClasses}
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Cari Guru
                <input
                  className="rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm font-normal outline-none focus:border-brand-600"
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setVisibleCount(pageSize);
                  }}
                  placeholder="Ketik nama guru"
                  value={search}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  ['all', 'Semua'],
                  ['attention', 'Perlu perhatian'],
                  ['note', 'Ada catatan'],
                  ['safe', 'Aman'],
                ].map(([value, label]) => (
                  <button
                    className={`rounded-full border px-3 py-2 text-xs font-black ${
                      riskFilter === value
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-blue-100 bg-white text-brand-700'
                    }`}
                    key={value}
                    onClick={() => {
                      setRiskFilter(value as RiskFilter);
                      setVisibleCount(pageSize);
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
            {visibleTeachers.length ? (
              visibleTeachers.map((teacher) => (
                <TeacherCard key={teacher.teacherId} teacher={teacher} />
              ))
            ) : (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm font-semibold text-muted">
                Tidak ada guru yang sesuai filter pada periode ini.
              </div>
            )}
            </div>

            {visibleCount < filteredTeachers.length ? (
              <button
                className="mt-4 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-black text-brand-700 hover:bg-brand-50"
                onClick={() => setVisibleCount((current) => current + pageSize)}
                type="button"
              >
                Muat {Math.min(pageSize, filteredTeachers.length - visibleCount)} guru lagi
              </button>
            ) : null}
          </section>
        </>
      ) : null}
    </section>
  );
}

function DateInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm font-normal text-slate-900 outline-none focus:border-brand-600"
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => undefined}
        type="date"
        value={value}
      />
    </label>
  );
}

function TeacherCard({
  teacher,
}: {
  teacher: TeacherPerformanceItem;
}) {
  const [open, setOpen] = useState(false);
  const risk = getRiskLevel(teacher);
  const riskMeta = {
    attention: {
      label: 'Perlu perhatian',
      card: 'border-rose-100',
      badge: 'border-rose-100 bg-rose-50 text-rose-700',
    },
    note: {
      label: 'Ada catatan',
      card: 'border-amber-100',
      badge: 'border-amber-100 bg-amber-50 text-amber-700',
    },
    safe: {
      label: 'Aman',
      card: 'border-emerald-100',
      badge: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    },
  }[risk];

  return (
    <article
      className={`rounded-2xl border ${riskMeta.card} bg-white p-4`}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black text-slate-900">{teacher.teacherName}</h3>
            <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-black ${riskMeta.badge}`}>
              {riskMeta.label}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-muted">
            {teacher.totalSessions} sesi · submit {teacher.submitRate}% · tepat waktu {teacher.onTimeSubmissions}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-black text-slate-700 sm:flex sm:text-left">
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
        <h4 className="text-sm font-bold">Aktivitas Terbaru</h4>
        {teacher.latestSessions.map((session) => (
          <div
            className="rounded-2xl border border-blue-50 bg-slate-50 p-3"
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
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700'
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
    default: 'bg-blue-50 text-brand-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
  }[tone];

  return (
    <span className={`rounded-xl px-2 py-2 ${toneClass}`}>
      <span className="block text-[0.65rem] font-bold">{label}</span>
      <span className="block text-sm">{value}</span>
    </span>
  );
}

function getRiskLevel(teacher: TeacherPerformanceItem): Exclude<RiskFilter, 'all'> {
  if (teacher.emptyClasses > 0 || teacher.lateSubmissions >= 5) return 'attention';
  if (teacher.lateSubmissions > 0 || teacher.notSubmitted > 0) return 'note';
  return 'safe';
}
