'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type AttendanceDemoResult,
  type Schedule,
  type SchoolClass,
} from '../lib/api';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

export function AcademicDashboard() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [demoResult, setDemoResult] = useState<AttendanceDemoResult | null>(
    null,
  );
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [demoState, setDemoState] = useState<LoadState>('idle');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoadState('loading');

      try {
        const [classResponse, scheduleResponse] = await Promise.all([
          api.getClasses(),
          api.getSchedules(),
        ]);

        if (!isMounted) {
          return;
        }

        setClasses(classResponse.data);
        setSchedules(scheduleResponse.data);
        setLoadState('success');
      } catch {
        if (isMounted) {
          setLoadState('error');
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const uniqueTeachers = useMemo(
    () => new Set(schedules.map((schedule) => schedule.teacher.id)).size,
    [schedules],
  );

  async function runDemo() {
    setDemoState('loading');

    try {
      const response = await api.runTeacherFlowDemo();
      setDemoResult(response.data);
      setDemoState('success');
    } catch {
      setDemoState('error');
    }
  }

  return (
    <section className="mt-12 space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          description="Kelas tersedia dari API backend"
          title="Kelas"
          value={classes.length}
        />
        <SummaryCard
          description="Template jadwal aktif"
          title="Jadwal"
          value={schedules.length}
        />
        <SummaryCard
          description="Guru dalam jadwal"
          title="Guru"
          value={uniqueTeachers}
        />
      </div>

      {loadState === 'error' ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Backend belum bisa diakses. Jalankan `npm run start --workspace
          backend`.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Jadwal Aktif</h2>
              <p className="mt-1 text-sm text-muted">
                Data ini dibaca dari `GET /api/academic/schedules`.
              </p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              {loadState === 'loading' ? 'Loading' : `${schedules.length} jadwal`}
            </span>
          </div>

          <div className="mt-5 divide-y divide-slate-100">
            {schedules.map((schedule) => (
              <div className="grid gap-1 py-4" key={schedule.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{schedule.class.name}</strong>
                  <span className="text-sm text-muted">•</span>
                  <span>{schedule.subject.name}</span>
                </div>
                <p className="text-sm text-muted">
                  {schedule.teacher.name} · Hari ke-{schedule.dayOfWeek} ·{' '}
                  {schedule.startsAt}-{schedule.endsAt}
                </p>
              </div>
            ))}

            {loadState === 'success' && schedules.length === 0 ? (
              <p className="py-4 text-sm text-muted">Belum ada jadwal.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Demo Flow Guru</h2>
          <p className="mt-1 text-sm text-muted">
            Menjalankan reminder → buka kelas → attendance → submit → summary.
          </p>

          <button
            className="mt-5 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={demoState === 'loading'}
            onClick={runDemo}
            type="button"
          >
            {demoState === 'loading' ? 'Menjalankan...' : 'Jalankan Demo'}
          </button>

          {demoState === 'error' ? (
            <p className="mt-4 text-sm text-red-600">
              Demo gagal. Pastikan backend, PostgreSQL, dan Redis berjalan.
            </p>
          ) : null}

          {demoResult ? (
            <div className="mt-5 space-y-4">
              <ol className="space-y-2">
                {demoResult.steps.map((step) => (
                  <li
                    className="rounded-xl bg-slate-50 px-3 py-2 text-sm"
                    key={step}
                  >
                    {step}
                  </li>
                ))}
              </ol>

              <div className="rounded-xl border border-slate-200 p-4 text-sm">
                <p>
                  Attendance: <strong>{demoResult.attendance.state}</strong>
                </p>
                <p>Item siswa: {demoResult.attendance.itemCount}</p>
                <p>Summary queue: {demoResult.summaryJob.queue}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  description,
  title,
  value,
}: {
  description: string;
  title: string;
  value: number;
}) {
  return (
    <article className="grid gap-2.5 rounded-2xl border border-slate-200 bg-white p-6">
      <p>{title}</p>
      <strong className="text-4xl text-brand-600">{value}</strong>
      <span className="text-sm leading-5 text-muted">{description}</span>
    </article>
  );
}

