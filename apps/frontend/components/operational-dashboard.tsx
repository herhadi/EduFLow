'use client';

import { useEffect, useState } from 'react';
import { api, type OperationalDashboardSummary } from '../lib/api';
import { formatNumber, formatReadableDate } from '../lib/format';
import { MetricCard } from './ui/metric-card';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

const fallbackSummary: OperationalDashboardSummary = {
  date: new Date().toISOString().slice(0, 10),
  classes: {
    totalToday: 42,
    inProgress: 12,
    completed: 25,
    empty: 1,
    notSubmitted: 4,
  },
  teachers: {
    totalTeaching: 35,
    submitted: 31,
    notSubmitted: 4,
  },
  students: {
    present: 820,
    sick: 12,
    excused: 8,
    absent: 4,
  },
  notifications: {
    reminderSent: 35,
    summarySent: 820,
    failed: 3,
  },
};

export function OperationalDashboard() {
  const [summary, setSummary] =
    useState<OperationalDashboardSummary>(fallbackSummary);
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
    <section className="mt-8 space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-brand-700 to-brand-600 p-5 text-white shadow-xl shadow-blue-200 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-100">Hari Ini</p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
              Monitoring Operasional
            </h2>
            <p className="mt-2 text-sm text-blue-100">
              {formatReadableDate(summary.date)}
            </p>
          </div>
          <button
            className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
            onClick={() => void loadDashboard()}
            type="button"
          >
            Refresh
          </button>
        </div>

        {loadState === 'error' ? (
          <p className="mt-4 rounded-2xl bg-white/15 p-3 text-sm text-blue-50">
            Backend belum bisa diakses. Angka fallback ditampilkan sementara.
          </p>
        ) : null}
      </div>

      <MetricSection
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

      <MetricSection
        description="Akumulasi AttendanceItem dari presensi yang sudah submit."
        title="Siswa"
      >
        <MetricCard label="Hadir" tone="good" value={summary.students.present} />
        <MetricCard label="Sakit" tone="warning" value={summary.students.sick} />
        <MetricCard label="Izin" value={summary.students.excused} />
        <MetricCard label="Alpha" tone="danger" value={summary.students.absent} />
      </MetricSection>

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

      <section className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
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
    </section>
  );
}

function MetricSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
