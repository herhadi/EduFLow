'use client';

import { useEffect, useState } from 'react';
import {
  api,
  type TeacherPerformanceDashboard as TeacherPerformanceData,
  type TeacherPerformanceItem,
} from '../lib/api';
import { formatReadableDate } from '../lib/format';
import { MetricCard } from './ui/metric-card';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

function getDefaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function TeacherPerformanceDashboard() {
  const defaultRange = getDefaultRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [dashboard, setDashboard] = useState<TeacherPerformanceData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');

  async function loadDashboard() {
    setLoadState('loading');

    try {
      const response = await api.getTeacherPerformance(from, to);
      setDashboard(response.data);
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
            <p className="text-sm font-semibold text-blue-100">
              Teacher Performance
            </p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
              Performa Guru Mengajar
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              Pantau sesi mengajar, keterlambatan submit, kelas kosong, dan
              konsistensi presensi.
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

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <DateInput label="Dari" onChange={setFrom} value={from} />
          <DateInput label="Sampai" onChange={setTo} value={to} />
          <button
            className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-brand-700 transition hover:bg-blue-50 sm:self-end"
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

          <div className="space-y-4">
            {dashboard.teachers.length ? (
              dashboard.teachers.map((teacher, index) => (
                <TeacherCard index={index} key={teacher.teacherId} teacher={teacher} />
              ))
            ) : (
              <div className="rounded-[2rem] border border-blue-100 bg-white p-5 text-sm text-muted shadow-sm shadow-blue-100/60">
                Belum ada agenda mengajar pada periode ini.
              </div>
            )}
          </div>
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
    <label className="grid gap-2 text-sm font-semibold text-blue-50">
      {label}
      <input
        className="rounded-2xl border border-white/20 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-200"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}

function TeacherCard({
  index,
  teacher,
}: {
  index: number;
  teacher: TeacherPerformanceItem;
}) {
  const riskTone =
    teacher.emptyClasses > 0 || teacher.lateSubmissions >= 5
      ? 'border-rose-100'
      : teacher.lateSubmissions > 0
        ? 'border-amber-100'
        : 'border-blue-100';

  return (
    <article
      className={`rounded-[2rem] border ${riskTone} bg-white p-5 shadow-sm shadow-blue-100/60`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
            Ranking #{index + 1}
          </p>
          <h3 className="mt-1 text-2xl font-bold">{teacher.teacherName}</h3>
          <p className="mt-1 text-sm text-muted">
            Submit rate {teacher.submitRate}% · tepat waktu{' '}
            {teacher.onTimeSubmissions} sesi
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
          {teacher.totalSessions} sesi
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MetricCard label="Mengajar" value={teacher.totalSessions} />
        <MetricCard
          label="Sudah Submit"
          tone="good"
          value={teacher.submittedSessions}
        />
        <MetricCard
          label="Terlambat Submit"
          tone="warning"
          value={teacher.lateSubmissions}
        />
        <MetricCard
          label="Kelas Kosong"
          tone="danger"
          value={teacher.emptyClasses}
        />
        <MetricCard
          label="Belum Submit"
          tone="warning"
          value={teacher.notSubmitted}
        />
      </div>

      <div className="mt-5 space-y-3">
        <h4 className="text-sm font-bold">Aktivitas Terbaru</h4>
        {teacher.latestSessions.map((session) => (
          <div
            className="rounded-2xl border border-blue-50 bg-slate-50 p-4"
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
    </article>
  );
}
