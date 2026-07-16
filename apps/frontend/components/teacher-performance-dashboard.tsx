'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type TeacherPerformanceDashboard as TeacherPerformanceData,
} from '../lib/api';
import { formatReadableDate } from '../lib/format';
import { DateInput, TeacherCard } from './teacher-performance/teacher-performance-components';
import {
  filterTeacherPerformanceItems,
  getDefaultTeacherPerformanceRange,
  getQuickRangeDates,
  teacherPerformancePageSize,
  type QuickRange,
  type RiskFilter,
} from './teacher-performance/teacher-performance-utils';
import { MetricCard } from './ui/metric-card';
import { Button } from './ui/button';
import { EmptyState } from './ui/empty-state';
import { SurfaceCard } from './ui/card';
import { SearchInput } from './ui/search';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

export function TeacherPerformanceDashboard() {
  const defaultRange = getDefaultTeacherPerformanceRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [quickRange, setQuickRange] = useState<QuickRange>('month');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(teacherPerformancePageSize);
  const [dashboard, setDashboard] = useState<TeacherPerformanceData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');

  async function loadDashboard() {
    setLoadState('loading');

    try {
      const response = await api.getTeacherPerformance(from, to);
      setDashboard(response.data);
      setVisibleCount(teacherPerformancePageSize);
      setLoadState('success');
    } catch {
      setLoadState('error');
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const filteredTeachers = useMemo(() => {
    return filterTeacherPerformanceItems({
      riskFilter,
      search,
      teachers: dashboard?.teachers ?? [],
    });
  }, [dashboard?.teachers, riskFilter, search]);

  const visibleTeachers = filteredTeachers.slice(0, visibleCount);

  function applyQuickRange(range: QuickRange) {
    setQuickRange(range);
    if (range === 'custom') return;

    const dates = getQuickRangeDates(range);

    setFrom(dates.from);
    setTo(dates.to);
  }

  return (
    <section className="mt-8 space-y-5">
      <SurfaceCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              Monitoring Guru
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100 sm:text-2xl">
              Performa Guru Mengajar
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Fokus pada guru yang perlu tindak lanjut, bukan leaderboard.
            </p>
          </div>
          <Button
            onClick={() => void loadDashboard()}
            variant="outline"
          >
            Refresh
          </Button>
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
                  : 'border-blue-100 bg-white text-brand-700 dark:border-blue-400/20 dark:bg-slate-950 dark:text-blue-100'
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
          <Button
            className="sm:self-end"
            disabled={loadState === 'loading'}
            onClick={() => void loadDashboard()}
          >
              {loadState === 'loading' ? 'Memuat...' : 'Terapkan'}
            </Button>
        </div>
      </SurfaceCard>

      {loadState === 'error' ? (
        <div className="rounded-[2rem] border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/15 dark:text-rose-100">
          Data performa guru belum bisa dimuat. Pastikan backend berjalan.
        </div>
      ) : null}

      {dashboard ? (
        <>
          <SurfaceCard>
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
          </SurfaceCard>

          <SurfaceCard>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                Cari Guru
                <SearchInput
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setVisibleCount(teacherPerformancePageSize);
                  }}
                  onClear={() => {
                    setSearch('');
                    setVisibleCount(teacherPerformancePageSize);
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
                        : 'border-blue-100 bg-white text-brand-700 dark:border-blue-400/20 dark:bg-slate-950 dark:text-blue-100'
                    }`}
                    key={value}
                    onClick={() => {
                      setRiskFilter(value as RiskFilter);
                      setVisibleCount(teacherPerformancePageSize);
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
              <EmptyState title="Tidak ada guru yang sesuai filter pada periode ini." />
            )}
            </div>

            {visibleCount < filteredTeachers.length ? (
              <Button
                className="mt-4 w-full"
                onClick={() => setVisibleCount((current) => current + teacherPerformancePageSize)}
                variant="outline"
              >
                Muat {Math.min(teacherPerformancePageSize, filteredTeachers.length - visibleCount)} guru lagi
              </Button>
            ) : null}
          </SurfaceCard>
        </>
      ) : null}
    </section>
  );
}
