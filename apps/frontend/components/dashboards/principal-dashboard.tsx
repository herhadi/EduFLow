'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type OperationalDashboardSummary, type TeachingPlan } from '../../lib/api';
import { type CurrentUser, type LoadState } from './dashboard-types';
import { RoleActionCard, RoleHero, RoleSection } from './role-dashboard-shared';

export function PrincipalHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'Kepala Sekolah';

  return (
    <>
      <RoleHero
        description="Pantau kualitas pembelajaran, tindak lanjuti pekerjaan yang menunggu persetujuan, dan evaluasi kinerja sekolah."
        eyebrow="Kepala Sekolah"
        title={`Selamat datang, ${displayName}`}
      />
      <PrincipalDecisionSummary />
      <RoleSection description="Akses pendukung supervisi yang tidak perlu dibuka setiap hari." title="Akses Lanjutan">
        <RoleActionCard href="/principal/exports" label="Export Laporan" description="Unduh rekap operasional sekolah dalam format Excel atau PDF." />
        <RoleActionCard href="/principal/audit" label="Jejak Aktivitas" description="Telusuri aktivitas penting untuk kebutuhan supervisi." />
      </RoleSection>
    </>
  );
}

function PrincipalDecisionSummary() {
  const [summary, setSummary] = useState<OperationalDashboardSummary | null>(null);
  const [reviewPlans, setReviewPlans] = useState<TeachingPlan[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      setLoadState('loading');
      try {
        const [dashboardResponse, reviewResponse] = await Promise.all([
          api.getOperationalDashboard(),
          api.getTeachingPlanReviewQueue().catch(() => ({ data: [] as TeachingPlan[] })),
        ]);
        if (!active) return;
        setSummary(dashboardResponse.data);
        setReviewPlans(reviewResponse.data);
        setLoadState('success');
      } catch {
        if (active) setLoadState('error');
      }
    }

    void loadSummary();

    return () => {
      active = false;
    };
  }, []);

  const kbm = summary?.kbm;
  const followUpItems = kbm?.followUpItems ?? [];
  const topDecisionItems = followUpItems.slice(0, 3);
  const classesTotal = summary?.classes.totalToday ?? 0;
  const emptyTotal = followUpItems.filter((item) => item.status === 'EMPTY').length;
  const notSubmittedTotal = followUpItems.filter((item) => !isSubmittedAttendanceState(item.attendanceState)).length;
  const issueTotal = followUpItems.filter((item) => Boolean(item.issueNotes)).length;
  const statusText = summary
    ? `${followUpItems.length} agenda perlu perhatian dari ${classesTotal} agenda hari ini. ${emptyTotal} kelas kosong, ${notSubmittedTotal} belum submit, ${issueTotal} kendala.`
    : 'Memuat kondisi sekolah hari ini...';

  return (
    <section className="mt-5 grid gap-3 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:shadow-none sm:rounded-[2rem] sm:p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-700">Meja keputusan</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-[var(--text)] sm:text-xl">Perlu Dilihat Lebih Dulu</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Beranda hanya menampilkan agenda paling penting untuk keputusan cepat. Detail lengkap tetap di menu KBM.
          </p>
        </div>

        <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm font-black leading-6 text-slate-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-50">
          {statusText}
        </p>

        <div className="mt-3 space-y-2">
          {topDecisionItems.length ? (
            topDecisionItems.map((item) => (
              <PrincipalDecisionItem item={item} key={item.agendaId} />
            ))
          ) : (
            <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
              Belum ada agenda yang perlu keputusan cepat.
            </p>
          )}
        </div>

        {followUpItems.length > topDecisionItems.length ? (
          <Link
            className="mt-3 inline-flex rounded-xl bg-brand-600 px-4 py-2 text-xs font-black text-white transition hover:bg-brand-700"
            href="/principal/kbm"
          >
            Lihat {followUpItems.length - topDecisionItems.length} agenda lainnya
          </Link>
        ) : null}

        {loadState === 'error' ? (
          <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-400/10 dark:text-rose-100">
            Ringkasan KBM belum bisa dimuat.
          </p>
        ) : null}
      </div>

      <div className="rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:shadow-none sm:rounded-[2rem] sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-700">Antrian KS</p>
        <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-[var(--text)] sm:text-xl">Tugas Review</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Buka yang bernilai paling besar lebih dulu, lalu lanjut ke daftar detail.
        </p>
        <div className="mt-4 grid gap-2">
          <PrincipalQueueItem
            description="Dokumen perangkat ajar yang menunggu keputusan KS."
            href="/principal/review"
            label="Perangkat ajar"
            value={reviewPlans.length}
          />
          <PrincipalQueueItem
            description="Agenda KBM yang membutuhkan tindak lanjut hari ini."
            href="/principal/kbm"
            label="Agenda KBM"
            value={followUpItems.length}
          />
          <PrincipalQueueItem
            description="Kendala tercatat dari laporan guru hari ini."
            href="/principal/kbm?focus=issues"
            label="Kendala"
            value={issueTotal}
          />
        </div>
      </div>
    </section>
  );
}

function PrincipalDecisionItem({
  item,
}: {
  item: NonNullable<OperationalDashboardSummary['kbm']>['followUpItems'][number];
}) {
  const focus = item.status === 'EMPTY'
    ? 'empty'
    : item.issueNotes
      ? 'issues'
      : !isSubmittedAttendanceState(item.attendanceState)
        ? 'notSubmitted'
        : 'all';

  return (
    <Link
      className="block rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:border-brand-500 hover:bg-white dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:hover:bg-[var(--surface-solid)]"
      href={`/principal/kbm?focus=${focus}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900 dark:text-[var(--text)]">
            {item.className} · {item.subjectName}
          </p>
          <p className="mt-1 text-xs font-bold text-muted">
            {formatAgendaTime(item.startsAt, item.endsAt)} · {item.teacherName}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${getPrincipalDecisionTone(item)}`}>
          {getPrincipalDecisionLabel(item)}
        </span>
      </div>
      {item.substituteTeacherName ? (
        <p className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-100">
          Pengganti: {item.substituteTeacherName}
        </p>
      ) : null}
      {item.issueNotes ? (
        <p className="mt-2 line-clamp-2 rounded-xl bg-amber-50 p-2 text-xs font-semibold text-amber-800 dark:bg-amber-400/10 dark:text-amber-100">
          {item.issueNotes}
        </p>
      ) : null}
    </Link>
  );
}

function PrincipalQueueItem({
  description,
  href,
  label,
  value,
}: {
  description: string;
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link
      className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3 transition hover:-translate-y-0.5 hover:border-brand-500 hover:bg-white dark:border-blue-400/20 dark:bg-blue-400/10 dark:hover:bg-[var(--surface-solid)]"
      href={href}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-900 dark:text-[var(--text)]">{label}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-muted">{description}</p>
        </div>
        <span className="rounded-xl bg-white px-3 py-2 text-lg font-black text-brand-700 dark:bg-blue-950/40 dark:text-blue-100">
          {value}
        </span>
      </div>
    </Link>
  );
}

function getPrincipalDecisionLabel(
  item: NonNullable<OperationalDashboardSummary['kbm']>['followUpItems'][number],
) {
  if (item.status === 'EMPTY') return 'Kelas kosong';
  if (item.issueNotes) return 'Kendala';
  if (item.substituteTeacherName) return 'Guru pengganti';
  if (!isSubmittedAttendanceState(item.attendanceState)) return 'Belum submit';

  return 'Perlu cek';
}

function getPrincipalDecisionTone(
  item: NonNullable<OperationalDashboardSummary['kbm']>['followUpItems'][number],
) {
  if (item.status === 'EMPTY') return 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-100';
  if (item.issueNotes) return 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-100';
  if (item.substituteTeacherName) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-100';
  if (!isSubmittedAttendanceState(item.attendanceState)) return 'bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-100';

  return 'bg-slate-100 text-slate-700 dark:bg-slate-400/10 dark:text-slate-100';
}

function formatAgendaTime(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt || !endsAt) return 'Jam belum tercatat';

  return `${startsAt.slice(0, 5)}-${endsAt.slice(0, 5)}`;
}

function isSubmittedAttendanceState(state?: string | null) {
  return ['SUBMITTED', 'APPROVED', 'CORRECTED', 'LOCKED'].includes(state ?? '');
}
