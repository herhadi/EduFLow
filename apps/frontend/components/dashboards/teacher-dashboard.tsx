'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, type TeacherDashboardSummary as TeacherDashboardSummaryData } from '../../lib/api';
import { UserAvatar } from '../ui/user-avatar';
import { type CurrentUser } from './dashboard-types';
import { RoleActionCard, RoleSection } from './role-dashboard-shared';

export function TeacherHome({
  currentUser,
  isHomeroom,
  photoUrl,
}: {
  currentUser: CurrentUser | null;
  isHomeroom: boolean;
  photoUrl?: string | null;
}) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'Guru';

  return (
    <>
      <section className="page-hero relative w-full overflow-hidden rounded-[2rem] border border-blue-100/70 p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-4 sm:gap-5">
          <UserAvatar className="size-20 sm:size-24" name={displayName} photoUrl={photoUrl} />
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">{isHomeroom ? 'Guru & Wali Kelas' : 'Guru'}</p>
            <h1 className="mt-2 truncate text-2xl font-black tracking-tight sm:text-4xl">Halo, {displayName}</h1>
            <p className="mt-2 text-sm leading-6 text-muted">Pantau agenda mengajar, presensi yang belum selesai, perangkat ajar, dan nilai harian dari satu beranda.</p>
          </div>
        </div>
      </section>

      <TeacherDashboardSummary isHomeroom={isHomeroom} />
      <RoleSection description="Akses pendukung yang sekarang diringkas dari navbar mobile." title="Aksi Lanjutan">
        <RoleActionCard href="/teacher/teaching-plans" label="Perangkat Ajar" description="Kelola program, modul ajar, KKTP, dan buku KBM." />
        <RoleActionCard href="/teacher/notifications" label="Inbox Guru" description="Lihat notifikasi revisi, presensi, dan tindak lanjut akademik." />
        <RoleActionCard href="/teacher/profile" label="Profil & Telegram" description="Kelola foto profil, sandi, sesi aktif, dan aktivasi Telegram." />
        {isHomeroom ? (
          <RoleActionCard href="/homeroom/leave-requests" label="Izin/Sakit" description="Review pengajuan izin atau sakit dari wali murid kelas binaan." />
        ) : null}
      </RoleSection>
    </>
  );
}

function TeacherDashboardSummary({ isHomeroom }: { isHomeroom: boolean }) {
  const [summary, setSummary] = useState<TeacherDashboardSummaryData | null>(null);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const today = useMemo(() => getLocalDateOnly(), []);

  useEffect(() => {
    let ignore = false;

    async function loadTeacherDashboard() {
      setState('loading');

      try {
        const response = await api.getMyDashboard();

        if (ignore) {
          return;
        }

        setSummary(response.data);
        setState('success');
      } catch {
        if (!ignore) {
          setState('error');
        }
      }
    }

    void loadTeacherDashboard();

    return () => {
      ignore = true;
    };
  }, [today]);

  const agendaSummary = summary?.agenda ?? { total: 0, submitted: 0, pending: 0, next: null };
  const scheduleSummary = summary?.schedule ?? { today: 0 };
  const teachingPlanSummary = summary?.teachingPlan ?? { revision: 0, waiting: 0, approved: 0 };
  const assessmentSummary = summary?.assessment ?? { draft: 0 };
  const urgentActions = [
    agendaSummary.pending > 0
      ? {
          href: '/teacher/attendance',
          label: 'Selesaikan presensi',
          value: `${agendaSummary.pending} agenda`,
        }
      : null,
    teachingPlanSummary.revision > 0
      ? {
          href: '/teacher/teaching-plans',
          label: 'Perbaiki perangkat ajar',
          value: `${teachingPlanSummary.revision} revisi`,
        }
      : null,
    assessmentSummary.draft > 0
      ? {
          href: '/teacher/assessments',
          label: 'Lanjutkan nilai harian',
          value: `${assessmentSummary.draft} draft`,
        }
      : null,
    isHomeroom
      ? {
          href: '/homeroom/students',
          label: 'Pantau kelas binaan',
          value: 'Wali kelas',
        }
      : null,
  ].filter((item): item is { href: string; label: string; value: string } => Boolean(item));

  return (
    <section className="mt-6 grid min-h-[36rem] items-start gap-4 sm:min-h-[28rem] xl:min-h-[22rem] xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <div className="surface-card rounded-[2rem] p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)] lg:items-start">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-700">Agenda Hari Ini</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 sm:text-xl">
              {state === 'loading' ? 'Memuat ringkasan mengajar...' : `${agendaSummary.total} agenda mengajar`}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {formatReadableDate(today)} · {scheduleSummary.today} sesi pada jadwal mingguan.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            <TeacherMiniStat label="Total agenda" value={agendaSummary.total} tone="primary" />
            <TeacherMiniStat label="Jadwal hari ini" value={scheduleSummary.today} tone="neutral" />
            <TeacherMiniStat label="Sudah submit" value={agendaSummary.submitted} tone="success" />
            <TeacherMiniStat label="Belum submit" value={agendaSummary.pending} tone={agendaSummary.pending ? 'warning' : 'neutral'} />
          </div>
        </div>

        {state === 'error' ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
            Ringkasan guru belum bisa dimuat. Menu tetap bisa dibuka dari pintasan di bawah.
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3 dark:border-blue-400/20 dark:bg-blue-400/10">
            <p className="text-xs font-black text-brand-700">Prioritas berikutnya</p>
            {agendaSummary.next ? (
              <div className="mt-2 min-w-0">
                <h3 className="truncate text-base font-black text-slate-900 dark:text-[var(--text)]">
                  {agendaSummary.next.subjectName}
                </h3>
                <p className="mt-1 text-sm font-semibold text-muted">
                  {agendaSummary.next.className} · {agendaSummary.next.startsAt ?? '--:--'}-{agendaSummary.next.endsAt ?? '--:--'}
                </p>
                <p className="mt-2 text-xs font-black text-slate-600">
                  {getAgendaLabel(agendaSummary.next.state)}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold text-muted">
                Belum ada agenda mengajar hari ini.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-[var(--border)] dark:bg-[var(--surface-soft)]">
            <p className="text-xs font-black text-slate-600 dark:text-[var(--text-soft)]">Aksi cepat</p>
            <div className="mt-2 min-h-32 space-y-2">
              {urgentActions.slice(0, 3).map((action) => (
                <Link
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900 transition hover:border-brand-300 hover:text-brand-700 dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:text-[var(--text)]"
                  href={action.href}
                  key={action.href}
                >
                  <span className="min-w-0 truncate">{action.label}</span>
                  <span className="shrink-0 text-xs text-muted">{action.value}</span>
                </Link>
              ))}
              {urgentActions.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-muted dark:border-[var(--border)] dark:bg-[var(--surface-solid)]">
                  Tidak ada tugas mendesak.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-[2rem] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-700">Tugas Akademik</p>
            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-[var(--text)]">Yang perlu dipantau</h2>
          </div>
          {isHomeroom ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-100">
              Wali kelas
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <TeacherMiniStat label="Revisi ajar" value={teachingPlanSummary.revision} tone={teachingPlanSummary.revision ? 'warning' : 'neutral'} />
          <TeacherMiniStat label="Disetujui" value={teachingPlanSummary.approved} tone="success" />
          <TeacherMiniStat label="Menunggu KS" value={teachingPlanSummary.waiting} tone={teachingPlanSummary.waiting ? 'primary' : 'neutral'} />
          <TeacherMiniStat label="Draft nilai" value={assessmentSummary.draft} tone={assessmentSummary.draft ? 'warning' : 'neutral'} />
        </div>
      </div>
    </section>
  );
}

function TeacherMiniStat({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'neutral' | 'primary' | 'success' | 'warning';
  value: number;
}) {
  const toneClass = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]',
    primary: 'border-blue-100 bg-blue-50 text-brand-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100',
    warning: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100',
  }[tone];

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <p className="text-xl font-black leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-black leading-tight">{label}</p>
    </div>
  );
}

function getLocalDateOnly() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatReadableDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getAgendaLabel(state?: string | null) {
  if (state === 'SUBMITTED') return 'Presensi sudah dikirim';
  if (state === 'APPROVED') return 'Presensi disetujui';
  if (state === 'CORRECTED') return 'Presensi sudah dikoreksi';
  if (state === 'LOCKED') return 'Presensi dikunci';
  if (state) return 'Presensi sedang dikerjakan';

  return 'Belum buka presensi';
}
