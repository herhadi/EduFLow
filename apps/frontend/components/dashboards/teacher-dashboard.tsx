'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, type Assessment, type DailyAgenda, type Schedule, type TeachingPlan } from '../../lib/api';
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
      <RoleSection description="Akses akademik yang jarang dibuka dari navbar utama." title="Aksi Lanjutan">
        <RoleActionCard href="/teacher/teaching-plans" label="Perangkat Ajar" description="Kelola program, modul ajar, KKTP, dan buku KBM." />
      </RoleSection>
    </>
  );
}

function TeacherDashboardSummary({ isHomeroom }: { isHomeroom: boolean }) {
  const [agendas, setAgendas] = useState<DailyAgenda[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [plans, setPlans] = useState<TeachingPlan[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const today = useMemo(() => getLocalDateOnly(), []);

  useEffect(() => {
    let ignore = false;

    async function loadTeacherDashboard() {
      setState('loading');

      try {
        const [agendaResponse, scheduleResponse, planResponse, assessmentResponse] = await Promise.all([
          api.getMyAgendas(today),
          api.getMySchedules(),
          api.getMyTeachingPlans(),
          api.getMyAssessments(),
        ]);

        if (ignore) {
          return;
        }

        setAgendas(agendaResponse.data);
        setSchedules(scheduleResponse.data);
        setPlans(planResponse.data);
        setAssessments(assessmentResponse.data);
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

  const submittedStates = ['SUBMITTED', 'APPROVED', 'CORRECTED', 'LOCKED'];
  const todaySubmitted = agendas.filter((agenda) => agenda.attendance && submittedStates.includes(agenda.attendance.state));
  const todayPending = agendas.filter((agenda) => !agenda.attendance || !submittedStates.includes(agenda.attendance.state));
  const nextAgenda = [...todayPending, ...agendas]
    .sort((first, second) => (first.schedule?.startsAt ?? '').localeCompare(second.schedule?.startsAt ?? ''))[0];
  const dayOfWeek = getLocalDayOfWeek();
  const weeklyToday = schedules.filter((schedule) => schedule.dayOfWeek === dayOfWeek);
  const revisionPlans = plans.filter((plan) => plan.status === 'REVISION_REQUESTED');
  const waitingPlans = plans.filter((plan) => plan.status === 'SUBMITTED');
  const approvedPlans = plans.filter((plan) => plan.status === 'APPROVED');
  const draftAssessments = assessments.filter((assessment) => assessment.status === 'DRAFT' || assessment.status === 'REVISION_REQUESTED');
  const urgentActions = [
    todayPending.length > 0
      ? {
          href: '/teacher/attendance',
          label: 'Selesaikan presensi',
          value: `${todayPending.length} agenda`,
        }
      : null,
    revisionPlans.length > 0
      ? {
          href: '/teacher/teaching-plans',
          label: 'Perbaiki perangkat ajar',
          value: `${revisionPlans.length} revisi`,
        }
      : null,
    draftAssessments.length > 0
      ? {
          href: '/teacher/assessments',
          label: 'Lanjutkan nilai harian',
          value: `${draftAssessments.length} draft`,
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
    <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
      <div className="surface-card rounded-[2rem] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-700">Agenda Hari Ini</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 sm:text-xl">
              {state === 'loading' ? 'Memuat ringkasan mengajar...' : `${agendas.length} agenda mengajar`}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {formatReadableDate(today)} · {weeklyToday.length} sesi pada jadwal mingguan.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-56">
            <TeacherMiniStat label="Sudah submit" value={todaySubmitted.length} tone="success" />
            <TeacherMiniStat label="Belum submit" value={todayPending.length} tone={todayPending.length ? 'warning' : 'neutral'} />
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
            {nextAgenda ? (
              <div className="mt-2 min-w-0">
                <h3 className="truncate text-base font-black text-slate-900 dark:text-[var(--text)]">
                  {nextAgenda.subject.name}
                </h3>
                <p className="mt-1 text-sm font-semibold text-muted">
                  {nextAgenda.class.name} · {nextAgenda.schedule?.startsAt ?? '--:--'}-{nextAgenda.schedule?.endsAt ?? '--:--'}
                </p>
                <p className="mt-2 text-xs font-black text-slate-600">
                  {getAgendaLabel(nextAgenda)}
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
            <div className="mt-2 space-y-2">
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
          <TeacherMiniStat label="Revisi ajar" value={revisionPlans.length} tone={revisionPlans.length ? 'warning' : 'neutral'} />
          <TeacherMiniStat label="Disetujui" value={approvedPlans.length} tone="success" />
          <TeacherMiniStat label="Menunggu KS" value={waitingPlans.length} tone={waitingPlans.length ? 'primary' : 'neutral'} />
          <TeacherMiniStat label="Draft nilai" value={draftAssessments.length} tone={draftAssessments.length ? 'warning' : 'neutral'} />
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

function getLocalDayOfWeek() {
  const day = new Date().getDay();

  return day === 0 ? 7 : day;
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

function getAgendaLabel(agenda: DailyAgenda) {
  if (agenda.attendance?.state === 'SUBMITTED') return 'Presensi sudah dikirim';
  if (agenda.attendance?.state === 'APPROVED') return 'Presensi disetujui';
  if (agenda.attendance?.state === 'CORRECTED') return 'Presensi sudah dikoreksi';
  if (agenda.attendance?.state === 'LOCKED') return 'Presensi dikunci';
  if (agenda.status === 'EMPTY') return 'Kelas kosong, perlu tindak lanjut';
  if (agenda.substituteTeacher) return `Guru pengganti: ${agenda.substituteTeacher.name}`;
  if (agenda.attendance) return 'Presensi sedang dikerjakan';

  return 'Belum buka presensi';
}
