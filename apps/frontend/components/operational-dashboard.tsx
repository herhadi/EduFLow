'use client';

import { useEffect, useState } from 'react';
import { api, type OperationalDashboardSummary } from '../lib/api';
import { formatNumber, formatReadableDate } from '../lib/format';
import { KbmControlPanel } from './operational-dashboard/kbm-control-panel';
import {
  emptySummary,
  getStudentTotal,
  type PrincipalPriorityKey,
} from './operational-dashboard/operational-dashboard-utils';
import { PrincipalPriorityPanel } from './operational-dashboard/principal-priority-panel';
import { MetricCard } from './ui/metric-card';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

export function OperationalDashboard({
  audience = 'operations',
  className = 'mt-8',
  initialPrincipalPriority = 'all',
}: {
  audience?: 'operations' | 'principal';
  className?: string;
  initialPrincipalPriority?: PrincipalPriorityKey;
} = {}) {
  const [summary, setSummary] =
    useState<OperationalDashboardSummary>(emptySummary);
  const [loadState, setLoadState] = useState<LoadState>('idle');

  async function loadDashboard() {
    setLoadState('loading');

    try {
      const response = await api.getOperationalDashboard();
      setSummary(response.data);
      setLoadState('success');
    } catch {
      setLoadState('error');
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  return (
    <section className={`${className} ${audience === 'principal' ? 'space-y-3 sm:space-y-5' : 'space-y-6'}`}>
      <div className={audience === 'principal'
        ? 'rounded-[1.25rem] border border-blue-100 bg-white p-3 shadow-sm sm:rounded-[2rem] sm:p-5'
        : 'rounded-[2rem] bg-gradient-to-br from-brand-700 to-brand-600 p-5 text-white shadow-xl sm:p-7'}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={audience === 'principal' ? 'text-xs font-black uppercase tracking-[0.12em] text-brand-700' : 'text-sm font-semibold text-blue-100'}>Hari Ini</p>
            <h2 className={audience === 'principal' ? 'mt-1 text-lg font-black text-slate-900 sm:text-2xl' : 'mt-1 text-2xl font-bold sm:text-3xl'}>
              {audience === 'principal' ? 'Ringkasan Cepat' : 'Monitoring Operasional'}
            </h2>
            <p className={audience === 'principal' ? 'mt-1 text-xs font-semibold text-muted sm:text-sm' : 'mt-2 text-sm text-blue-100'}>
              {formatReadableDate(summary.date)}
            </p>
          </div>
          <button
            className={audience === 'principal'
              ? 'rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-brand-700 transition hover:bg-blue-100 sm:rounded-2xl sm:px-4 sm:text-sm'
              : 'rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25'}
            onClick={() => void loadDashboard()}
            type="button"
          >
            Refresh
          </button>
        </div>

        {loadState === 'error' ? (
          <p className="mt-4 rounded-2xl bg-white/15 p-3 text-sm text-blue-50">
            Backend belum bisa diakses. Data operasional belum dapat dimuat.
          </p>
        ) : null}
      </div>

      {audience === 'principal' ? (
        <>
          <PrincipalPriorityPanel initialPriority={initialPrincipalPriority} summary={summary} />
          <PrincipalKbmStrip summary={summary} />
        </>
      ) : null}

      <div className={audience === 'principal' ? 'grid gap-3 xl:grid-cols-2' : 'space-y-6'}>
        <MetricSection
          compact={audience === 'principal'}
          description="Status semua kelas dari DailyAgenda hari ini."
          title="Kelas Hari Ini"
        >
          <MetricCard label="Kelas Hari Ini" value={summary.classes.totalToday} />
          <MetricCard
            label="Sedang Berlangsung"
            tone="good"
            value={summary.classes.inProgress}
          />
          <MetricCard label="Selesai" tone="good" value={summary.classes.completed} />
          <MetricCard label="Kelas Kosong" tone="danger" value={summary.classes.empty} />
          <MetricCard
            label="Belum Submit"
            tone="warning"
            value={summary.classes.notSubmitted}
          />
        </MetricSection>

        <MetricSection
          badge={`${formatNumber(summary.teachers.totalTeaching)} guru`}
          compact={audience === 'principal'}
          description="Ringkasan guru yang mengajar dan submit presensi."
          title="Guru"
        >
          <MetricCard
            label="Total Guru Mengajar"
            value={summary.teachers.totalTeaching}
          />
          <MetricCard
            label="Sudah Submit"
            tone="good"
            value={summary.teachers.submitted}
          />
          <MetricCard
            label="Belum Submit"
            tone="warning"
            value={summary.teachers.notSubmitted}
          />
        </MetricSection>
      </div>

      <MetricSection
        badge={`${formatNumber(getStudentTotal(summary))} catatan`}
        compact={audience === 'principal'}
        description={audience === 'principal'
          ? 'Akumulasi siswa pada agenda hari ini yang presensinya sudah submit, bukan total seluruh siswa sekolah.'
          : 'Akumulasi AttendanceItem dari presensi yang sudah submit.'}
        title="Siswa"
      >
        <MetricCard label="Hadir" tone="good" value={summary.students.present} />
        <MetricCard label="Sakit" tone="warning" value={summary.students.sick} />
        <MetricCard label="Izin" value={summary.students.excused} />
        <MetricCard label="Alpha" tone="danger" value={summary.students.absent} />
      </MetricSection>

      {audience === 'operations' ? (
        <>
          <MetricSection
            description="Status pengiriman reminder dan summary."
            title="Notifikasi"
          >
            <MetricCard
              label="Reminder Terkirim"
              tone="good"
              value={summary.notifications.reminderSent}
            />
            <MetricCard
              label="Summary Terkirim"
              tone="good"
              value={summary.notifications.summarySent}
            />
            <MetricCard
              label="Gagal"
              tone="danger"
              value={summary.notifications.failed}
            />
          </MetricSection>

          <KbmControlPanel summary={summary} />

          <section className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold">Tindak Lanjut Hari Ini</h3>
              <p className="mt-1 text-sm text-muted">
                Prioritas operasional yang perlu dipantau admin sekolah.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <FollowUpCard
                label="Kelas Belum Submit"
                tone={summary.classes.notSubmitted > 0 ? 'warning' : 'good'}
                value={summary.classes.notSubmitted}
              />
              <FollowUpCard
                label="Kelas Kosong"
                tone={summary.classes.empty > 0 ? 'danger' : 'good'}
                value={summary.classes.empty}
              />
              <FollowUpCard
                label="Notifikasi Gagal"
                tone={summary.notifications.failed > 0 ? 'danger' : 'good'}
                value={summary.notifications.failed}
              />
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}

function PrincipalKbmStrip({ summary }: { summary: OperationalDashboardSummary }) {
  const kbm = summary.kbm ?? emptySummary.kbm!;
  const items = [
    { label: 'Guru hadir', value: kbm.checklist.teacherPresent },
    { label: 'Presensi', value: kbm.checklist.studentAttendanceDone },
    { label: 'Materi', value: kbm.checklist.materialFilled },
    { label: 'Foto', value: kbm.checklist.classPhotoDone },
  ];

  return (
    <section className="rounded-[1.25rem] border border-blue-100 bg-white p-3 shadow-sm sm:rounded-[2rem] sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 sm:text-base">Kendali KBM</h3>
          <p className="mt-0.5 text-xs font-semibold text-muted">
            Cek kualitas laporan guru: hadir, presensi siswa, materi, dan foto kelas.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-black text-brand-700">
          {formatReadableDate(summary.date)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {items.map((item) => (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center" key={item.label}>
            <p className="text-lg font-black text-slate-900">{formatNumber(item.value)}</p>
            <p className="mt-0.5 truncate text-[10px] font-bold text-muted sm:text-xs">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricSection({
  badge,
  children,
  compact = false,
  description,
  title,
}: {
  badge?: string;
  children: React.ReactNode;
  compact?: boolean;
  description: string;
  title: string;
}) {
  return (
    <section className={compact ? 'rounded-[1.25rem] border border-blue-100 bg-white p-3 shadow-sm sm:rounded-[2rem] sm:p-4' : 'rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm sm:p-6'}>
      <div className={compact ? 'mb-2 flex items-start justify-between gap-3' : 'mb-4 flex items-start justify-between gap-3'}>
        <div>
          <h3 className={compact ? 'text-base font-black sm:text-lg' : 'text-xl font-bold'}>{title}</h3>
          <p className={compact ? 'hidden text-sm text-muted sm:mt-1 sm:block' : 'mt-1 text-sm text-muted'}>{description}</p>
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
            {badge}
          </span>
        ) : null}
      </div>
      <div className={compact ? 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'}>
        {children}
      </div>
    </section>
  );
}

function FollowUpCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'good' | 'warning' | 'danger';
  value: number;
}) {
  const toneClass = {
    good: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-200',
    warning: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-200',
    danger: 'border-red-100 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-200',
  }[tone];

  return (
    <article className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-80">
        {label}
      </p>
      <strong className="mt-2 block text-2xl font-black">
        {formatNumber(value)}
      </strong>
    </article>
  );
}
