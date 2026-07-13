'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type OperationalDashboardSummary } from '../lib/api';
import { formatNumber, formatReadableDate } from '../lib/format';
import { MetricCard } from './ui/metric-card';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

const emptySummary: OperationalDashboardSummary = {
  date: new Date().toISOString().slice(0, 10),
  classes: {
    totalToday: 0,
    inProgress: 0,
    completed: 0,
    empty: 0,
    notSubmitted: 0,
  },
  teachers: {
    totalTeaching: 0,
    submitted: 0,
    notSubmitted: 0,
  },
  students: {
    present: 0,
    sick: 0,
    excused: 0,
    absent: 0,
  },
  notifications: {
    reminderSent: 0,
    summarySent: 0,
    failed: 0,
  },
  kbm: {
    checklist: {
      teacherPresent: 0,
      studentAttendanceDone: 0,
      materialFilled: 0,
      classPhotoDone: 0,
      missing: 0,
      withIssueNotes: 0,
    },
    substitutes: {
      total: 0,
      items: [],
    },
    followUpItems: [],
  },
};

export function OperationalDashboard({
  audience = 'operations',
  className = 'mt-8',
}: {
  audience?: 'operations' | 'principal';
  className?: string;
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
        ? 'rounded-[1.25rem] border border-blue-100 bg-white p-3 shadow-sm shadow-blue-100/60 sm:rounded-[2rem] sm:p-5'
        : 'rounded-[2rem] bg-gradient-to-br from-brand-700 to-brand-600 p-5 text-white shadow-xl shadow-blue-200 sm:p-7'}
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
          <PrincipalPriorityPanel summary={summary} />
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
        compact={audience === 'principal'}
        description="Akumulasi AttendanceItem dari presensi yang sudah submit."
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
        </>
      ) : null}
    </section>
  );
}

function PrincipalPriorityPanel({ summary }: { summary: OperationalDashboardSummary }) {
  const kbm = summary.kbm ?? emptySummary.kbm!;
  const urgentItems = [
    {
      label: 'Kelas kosong',
      value: summary.classes.empty,
      description: 'Perlu keputusan cepat agar kelas tidak tanpa pendamping.',
      tone: summary.classes.empty > 0 ? 'danger' : 'good',
    },
    {
      label: 'Belum submit',
      value: summary.classes.notSubmitted,
      description: 'Presensi atau laporan KBM belum masuk dari guru.',
      tone: summary.classes.notSubmitted > 0 ? 'warning' : 'good',
    },
    {
      label: 'Kendala KBM',
      value: kbm.checklist.withIssueNotes,
      description: 'Catatan kendala dari kelas yang sudah berjalan.',
      tone: kbm.checklist.withIssueNotes > 0 ? 'danger' : 'good',
    },
    {
      label: 'Checklist kurang',
      value: kbm.checklist.missing,
      description: 'Presensi, materi, atau foto kelas belum lengkap.',
      tone: kbm.checklist.missing > 0 ? 'warning' : 'good',
    },
    {
      label: 'Guru pengganti',
      value: kbm.substitutes.total,
      description: 'Informasi perubahan pengajar hari ini.',
      tone: kbm.substitutes.total > 0 ? 'info' : 'good',
    },
  ] satisfies Array<{
    description: string;
    label: string;
    tone: 'danger' | 'good' | 'info' | 'warning';
    value: number;
  }>;
  const followUpItems = kbm.followUpItems.slice(0, 4);

  return (
    <section className="min-w-0 rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
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
        <Link
          className="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white transition hover:bg-brand-700 sm:w-auto sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm"
          href="/principal/review"
        >
          Buka Review
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {urgentItems.map((item) => (
          <PrincipalPriorityCard
            description={item.description}
            key={item.label}
            label={item.label}
            tone={item.tone}
            value={item.value}
          />
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-black text-slate-900">Daftar Perhatian Teratas</h4>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600">
            {formatNumber(kbm.followUpItems.length)}
          </span>
        </div>
        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          {followUpItems.length > 0 ? (
            followUpItems.map((item) => (
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
  description,
  label,
  tone,
  value,
}: {
  description: string;
  label: string;
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
    <article className={`min-w-0 rounded-xl border p-3 sm:rounded-2xl sm:p-4 ${toneClass}`}>
      <p className="text-xl font-black sm:text-2xl">{formatNumber(value)}</p>
      <h4 className="mt-1 text-xs font-black text-slate-900 sm:mt-2 sm:text-sm">{label}</h4>
      <p className="mt-1 hidden text-xs font-semibold leading-5 opacity-80 sm:block">{description}</p>
    </article>
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
    <section className="rounded-[1.25rem] border border-blue-100 bg-white p-3 shadow-sm shadow-blue-100/60 sm:rounded-[2rem] sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 sm:text-base">Kendali KBM</h3>
          <p className="mt-0.5 text-xs font-semibold text-muted">
            Checklist inti hari ini
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

function KbmControlPanel({ summary }: { summary: OperationalDashboardSummary }) {
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

function AgendaFollowUpItem({
  item,
}: {
  item: NonNullable<OperationalDashboardSummary['kbm']>['followUpItems'][number];
}) {
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

function formatTimeRange(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt || !endsAt) {
    return 'Jam belum tercatat';
  }

  return `${startsAt.slice(0, 5)}-${endsAt.slice(0, 5)}`;
}

function getAgendaStatusLabel(status: string) {
  const labels: Record<string, string> = {
    SCHEDULED: 'Terjadwal',
    IN_PROGRESS: 'Berjalan',
    COMPLETED: 'Selesai',
    EMPTY: 'Kosong',
    CANCELLED: 'Batal',
  };

  return labels[status] ?? status;
}

function getAgendaStatusClass(status: string) {
  if (status === 'EMPTY') {
    return 'bg-red-50 text-red-700';
  }

  if (status === 'COMPLETED') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (status === 'IN_PROGRESS') {
    return 'bg-blue-50 text-blue-700';
  }

  return 'bg-amber-50 text-amber-700';
}

function MetricSection({
  children,
  compact = false,
  description,
  title,
}: {
  children: React.ReactNode;
  compact?: boolean;
  description: string;
  title: string;
}) {
  return (
    <section className={compact ? 'rounded-[1.25rem] border border-blue-100 bg-white p-3 shadow-sm shadow-blue-100/60 sm:rounded-[2rem] sm:p-4' : 'rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6'}>
      <div className={compact ? 'mb-2' : 'mb-4'}>
        <h3 className={compact ? 'text-base font-black sm:text-lg' : 'text-xl font-bold'}>{title}</h3>
        <p className={compact ? 'hidden text-sm text-muted sm:mt-1 sm:block' : 'mt-1 text-sm text-muted'}>{description}</p>
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
