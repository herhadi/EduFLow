'use client';

import { useEffect, useState } from 'react';
import { api, type OperationalDashboardSummary } from '../lib/api';
import { formatNumber, formatReadableDate } from '../lib/format';
import { KbmControlPanel } from './operational-dashboard/kbm-control-panel';
import {
  emptySummary,
  formatTimeRange,
  getAgendaStatusClass,
  getAgendaStatusLabel,
  getStudentTotal,
  type PrincipalPriorityKey,
} from './operational-dashboard/operational-dashboard-utils';
import { PrincipalPriorityPanel } from './operational-dashboard/principal-priority-panel';
import { Badge } from './ui/badge';
import { MetricCard } from './ui/metric-card';
import { SurfaceCard } from './ui/card';

type LoadState = 'idle' | 'loading' | 'success' | 'error';
type KbmTodayItem = NonNullable<OperationalDashboardSummary['kbm']>['todayItems'][number];
type ClassMonitorFilter = 'all' | 'IN_PROGRESS' | 'COMPLETED' | 'EMPTY' | 'NOT_SUBMITTED';

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
        ? 'surface-card rounded-[1.25rem] p-3 sm:rounded-[2rem] sm:p-5'
        : 'rounded-[2rem] bg-gradient-to-br from-brand-700 to-brand-600 p-5 text-white shadow-xl sm:p-7'}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={audience === 'principal' ? 'text-xs font-black uppercase tracking-[0.12em] text-brand-700' : 'text-sm font-semibold text-blue-100'}>Hari Ini</p>
            <h2 className={audience === 'principal' ? 'mt-1 text-lg font-black text-slate-900 dark:text-slate-100 sm:text-2xl' : 'mt-1 text-2xl font-bold sm:text-3xl'}>
              {audience === 'principal' ? 'Ringkasan Cepat' : 'Monitoring Operasional'}
            </h2>
            <p className={audience === 'principal' ? 'mt-1 text-xs font-semibold text-muted sm:text-sm' : 'mt-2 text-sm text-blue-100'}>
              {formatReadableDate(summary.date)}
            </p>
          </div>
          <button
            className={audience === 'principal'
              ? 'rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-brand-700 transition hover:bg-blue-100 dark:border-blue-400/20 dark:bg-blue-500/15 dark:text-blue-100 sm:rounded-2xl sm:px-4 sm:text-sm'
              : 'rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25'}
            onClick={() => void loadDashboard()}
            type="button"
          >
            Refresh
          </button>
        </div>

        {loadState === 'error' ? (
          <p className={audience === 'principal'
            ? 'mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/15 dark:text-rose-100'
            : 'mt-4 rounded-2xl bg-white/15 p-3 text-sm text-blue-50'}
          >
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
        {audience === 'principal' ? (
          <PrincipalClassMonitor summary={summary} />
        ) : (
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
        )}

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

          <SurfaceCard className="sm:p-6">
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
          </SurfaceCard>
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
    <SurfaceCard className="rounded-[1.25rem] p-3 sm:rounded-[2rem] sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 sm:text-base">Kendali KBM</h3>
          <p className="mt-0.5 text-xs font-semibold text-muted">
            Cek kualitas laporan guru: hadir, presensi siswa, materi, dan foto kelas.
          </p>
        </div>
        <Badge tone="brand">
          {formatReadableDate(summary.date)}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {items.map((item) => (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center dark:border-slate-700 dark:bg-slate-900" key={item.label}>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">{formatNumber(item.value)}</p>
            <p className="mt-0.5 truncate text-[10px] font-bold text-muted sm:text-xs">{item.label}</p>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

function PrincipalClassMonitor({ summary }: { summary: OperationalDashboardSummary }) {
  const kbm = summary.kbm ?? emptySummary.kbm!;
  const [filter, setFilter] = useState<ClassMonitorFilter>('IN_PROGRESS');
  const [expandedAgendaId, setExpandedAgendaId] = useState<string | null>(null);
  const todayItems = kbm.todayItems ?? [];
  const filterCards = [
    { key: 'all', label: 'Semua', value: summary.classes.totalToday, tone: 'info' },
    { key: 'IN_PROGRESS', label: 'Berjalan', value: summary.classes.inProgress, tone: 'good' },
    { key: 'COMPLETED', label: 'Selesai', value: summary.classes.completed, tone: 'good' },
    { key: 'EMPTY', label: 'Kosong', value: summary.classes.empty, tone: 'danger' },
    { key: 'NOT_SUBMITTED', label: 'Belum Submit', value: summary.classes.notSubmitted, tone: 'warning' },
  ] satisfies Array<{
    key: ClassMonitorFilter;
    label: string;
    tone: 'danger' | 'good' | 'info' | 'warning';
    value: number;
  }>;
  const visibleItems = todayItems.filter((item) => matchesClassMonitorFilter(item, filter));
  const activeLabel = filterCards.find((item) => item.key === filter)?.label ?? 'Detail';

  return (
    <SurfaceCard className="rounded-[1.25rem] p-3 sm:rounded-[2rem] sm:p-4 xl:col-span-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-black sm:text-lg">Pantauan Kelas Hari Ini</h3>
          <p className="mt-1 text-sm text-muted">
            Klik status untuk melihat kelas, materi KBM, checklist presensi, kendala, dan foto kelas.
          </p>
        </div>
        <Badge className="w-fit" tone="brand">
          {activeLabel}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {filterCards.map((item) => (
          <button
            className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${getClassMonitorTone(item.tone)} ${filter === item.key ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-950' : ''}`}
            key={item.key}
            onClick={() => {
              setFilter(item.key);
              setExpandedAgendaId(null);
            }}
            type="button"
          >
            <strong className="block text-xl font-black">{formatNumber(item.value)}</strong>
            <span className="mt-1 block text-xs font-black text-slate-900 dark:text-slate-100">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {visibleItems.length ? (
          visibleItems.map((item) => (
            <PrincipalClassDetailCard
              expanded={expandedAgendaId === item.agendaId}
              item={item}
              key={item.agendaId}
              onToggle={() => setExpandedAgendaId((current) => current === item.agendaId ? null : item.agendaId)}
            />
          ))
        ) : (
          <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-100">
            Tidak ada agenda pada kategori ini.
          </p>
        )}
      </div>
    </SurfaceCard>
  );
}

function PrincipalClassDetailCard({
  expanded,
  item,
  onToggle,
}: {
  expanded: boolean;
  item: KbmTodayItem;
  onToggle: () => void;
}) {
  const checklist = [
    { done: item.teacherPresent === true, label: 'Guru' },
    { done: item.studentAttendanceDone === true, label: 'Presensi' },
    { done: item.materialFilled === true, label: 'Materi' },
    { done: item.classPhotoDone === true, label: 'Foto' },
  ];

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-[var(--border)] dark:bg-[var(--surface-soft)]">
      <button
        className="flex w-full flex-wrap items-start justify-between gap-2 text-left"
        onClick={onToggle}
        type="button"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900 dark:text-slate-100">
            {item.className} · {item.subjectName}
          </p>
          <p className="mt-1 text-xs font-semibold text-muted">
            {formatTimeRange(item.startsAt, item.endsAt)} · {item.teacherName}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${getAgendaStatusClass(item.status)}`}>
          {getAgendaStatusLabel(item.status)}
        </span>
      </button>

      {item.isPastDue || item.isLateSubmitted ? (
        <p className="mt-2 rounded-xl bg-amber-50 px-2.5 py-2 text-xs font-black text-amber-700 dark:bg-amber-400/10 dark:text-amber-100">
          {item.isLateSubmitted ? 'Submit terlambat' : 'Lewat batas submit'}
          {item.deadlineAt ? ` · batas ${formatDateTime(item.deadlineAt)}` : ''}
        </p>
      ) : null}

      {item.substituteTeacherName ? (
        <p className="mt-2 rounded-xl bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-100">
          Guru pengganti: {item.substituteTeacherName}
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {checklist.map((check) => (
          <span
            className={`rounded-lg px-2 py-1 text-center text-[10px] font-black ${check.done ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-100' : 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-100'}`}
            key={check.label}
          >
            {check.label}
          </span>
        ))}
      </div>

      <button
        className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-brand-700 transition hover:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-blue-100"
        onClick={onToggle}
        type="button"
      >
        {expanded ? 'Tutup detail' : 'Lihat materi, foto, dan lokasi'}
      </button>

      {expanded ? (
      <div className="mt-3 space-y-2 text-xs">
        <div className="rounded-xl bg-white p-2.5 dark:bg-slate-950">
          <p className="font-black text-slate-900 dark:text-slate-100">Materi/Catatan KBM</p>
          <p className="mt-1 leading-5 text-muted">
            {item.materialNotes?.trim() || 'Belum ada materi/catatan KBM.'}
          </p>
        </div>
        {item.issueNotes ? (
          <div className="rounded-xl bg-amber-50 p-2.5 text-amber-800 dark:bg-amber-400/10 dark:text-amber-100">
            <p className="font-black">Kendala</p>
            <p className="mt-1 leading-5">{item.issueNotes}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 dark:bg-slate-950">
          <div>
            <p className="font-black text-slate-900 dark:text-slate-100">Foto Kelas</p>
            <p className="mt-1 font-semibold text-muted">
              {item.classPhotoName
                ? `${item.classPhotoName}${item.classPhotoSize ? ` · ${formatBytes(item.classPhotoSize)}` : ''}`
                : 'Belum ada foto kelas.'}
            </p>
            {item.classPhotoTakenAt ? (
              <p className="mt-1 font-semibold text-muted">
                Diambil: {formatDateTime(item.classPhotoTakenAt)}
              </p>
            ) : null}
            <p className="mt-1 font-semibold text-muted">
              Lokasi: {formatPhotoLocation(item)}
            </p>
          </div>
          {item.classPhotoUrl ? (
            <a
              className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-black text-white transition hover:bg-brand-700"
              href={item.classPhotoUrl}
              rel="noreferrer"
              target="_blank"
            >
              Buka Foto
            </a>
          ) : null}
        </div>
      </div>
      ) : null}
    </article>
  );
}

function matchesClassMonitorFilter(item: KbmTodayItem, filter: ClassMonitorFilter) {
  if (filter === 'all') return true;
  if (filter === 'NOT_SUBMITTED') return !isSubmittedAttendanceState(item.attendanceState) && item.status !== 'COMPLETED';
  return item.status === filter;
}

function getClassMonitorTone(tone: 'danger' | 'good' | 'info' | 'warning') {
  return {
    danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/15 dark:text-rose-100',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-100',
    info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/15 dark:text-blue-100',
    warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
  }[tone];
}

function isSubmittedAttendanceState(state?: string | null) {
  return ['SUBMITTED', 'APPROVED', 'CORRECTED', 'LOCKED'].includes(state ?? '');
}

function formatBytes(size: number) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatPhotoLocation(item: KbmTodayItem) {
  if (item.classPhotoLatitude === null || item.classPhotoLatitude === undefined || item.classPhotoLongitude === null || item.classPhotoLongitude === undefined) {
    return 'Tidak tersedia';
  }

  const accuracy = item.classPhotoAccuracy ? ` · akurasi ${Math.round(item.classPhotoAccuracy)} m` : '';
  return `${item.classPhotoLatitude.toFixed(6)}, ${item.classPhotoLongitude.toFixed(6)}${accuracy}`;
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
    <SurfaceCard className={compact ? 'rounded-[1.25rem] p-3 sm:rounded-[2rem] sm:p-4' : 'sm:p-6'}>
      <div className={compact ? 'mb-2 flex items-start justify-between gap-3' : 'mb-4 flex items-start justify-between gap-3'}>
        <div>
          <h3 className={compact ? 'text-base font-black sm:text-lg' : 'text-xl font-bold'}>{title}</h3>
          <p className={compact ? 'hidden text-sm text-muted sm:mt-1 sm:block' : 'mt-1 text-sm text-muted'}>{description}</p>
        </div>
        {badge ? (
          <Badge className="shrink-0" tone="brand">
            {badge}
          </Badge>
        ) : null}
      </div>
      <div className={compact ? 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'}>
        {children}
      </div>
    </SurfaceCard>
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
