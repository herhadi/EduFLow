'use client';

import { useEffect, useState } from 'react';
import { api, type AttendanceStatus, type HomeroomOverview, type HomeroomStudent } from '../lib/api';
import { MetricCard } from './ui/metric-card';

const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: 'Hadir',
  SICK: 'Sakit',
  EXCUSED: 'Izin',
  ABSENT: 'Alpha',
};

const statusClass: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  SICK: 'bg-amber-50 text-amber-700 border-amber-100',
  EXCUSED: 'bg-blue-50 text-blue-700 border-blue-100',
  ABSENT: 'bg-rose-50 text-rose-700 border-rose-100',
};

export function HomeroomStudents() {
  const [overview, setOverview] = useState<HomeroomOverview | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    async function load() {
      try {
        const response = await api.getMyHomeroom();
        setOverview(response.data);
        setLoadState('success');
      } catch {
        setLoadState('error');
      }
    }

    void load();
  }, []);

  if (loadState === 'loading') {
    return (
      <section className="mt-6 rounded-[2rem] border border-blue-100 bg-white p-5 text-sm font-semibold text-muted shadow-sm shadow-blue-100/60">
        Memuat data kelas binaan...
      </section>
    );
  }

  if (loadState === 'error') {
    return (
      <section className="mt-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-900">
        Data kelas binaan belum bisa dimuat. Pastikan akun memiliki role wali kelas dan backend berjalan.
      </section>
    );
  }

  if (!overview?.class) {
    return (
      <section className="mt-6 rounded-[2rem] border border-blue-100 bg-white p-5 text-sm font-semibold leading-6 text-muted shadow-sm shadow-blue-100/60">
        Anda belum ditetapkan sebagai wali kelas pada tahun ajaran aktif.
      </section>
    );
  }

  return (
    <section className="mt-6 space-y-5">
      <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60">
        <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">Kelas Binaan</p>
        <h2 className="mt-1 text-2xl font-black text-slate-900">{overview.class.name}</h2>
        <p className="mt-1 text-sm font-semibold text-muted">
          {overview.class.schoolYear?.name ?? 'Tahun ajaran aktif'} · {overview.students.length} siswa aktif
        </p>
      </div>

      <div>
        <h3 className="text-sm font-black text-slate-900">Presensi Hari Ini</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <MetricCard label="Total" value={overview.summary.total} />
          <MetricCard label="Hadir" tone="good" value={overview.summary.present} />
          <MetricCard label="Sakit" tone="warning" value={overview.summary.sick} />
          <MetricCard label="Izin" value={overview.summary.excused} />
          <MetricCard label="Alpha" tone="danger" value={overview.summary.absent} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-black text-slate-900">Pantauan Bulan Ini</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <MetricCard label="Total" value={overview.monthSummary.total} />
          <MetricCard label="Hadir" tone="good" value={overview.monthSummary.present} />
          <MetricCard label="Sakit" tone="warning" value={overview.monthSummary.sick} />
          <MetricCard label="Izin" value={overview.monthSummary.excused} />
          <MetricCard label="Alpha" tone="danger" value={overview.monthSummary.absent} />
        </div>
      </div>

      {overview.riskStudents.length ? (
        <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-4">
          <h3 className="text-sm font-black text-amber-900">Perlu Perhatian</h3>
          <div className="mt-3 grid gap-2">
            {overview.riskStudents.map((student) => (
              <StudentRow compact key={student.id} student={student} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60">
        <h3 className="text-sm font-black text-slate-900">Daftar Siswa</h3>
        <div className="mt-3 grid gap-2">
          {overview.students.map((student) => (
            <StudentRow key={student.id} student={student} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StudentRow({ compact = false, student }: { compact?: boolean; student: HomeroomStudent }) {
  const primaryGuardian = student.guardians.find((guardian) => guardian.isPrimary) ?? student.guardians[0];
  const todayStatus = student.todayStatus;

  return (
    <article className="rounded-2xl border border-blue-50 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900">{student.name}</p>
          <p className="mt-1 text-xs font-semibold text-muted">
            NIS: {student.nis ?? '-'} · Wali: {primaryGuardian?.guardian.name ?? '-'}
          </p>
          {!compact ? (
            <p className="mt-1 text-xs font-semibold text-muted">
              Kontak: {primaryGuardian?.guardian.phone ?? primaryGuardian?.guardian.email ?? '-'}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {todayStatus ? (
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass[todayStatus]}`}>
              {statusLabels[todayStatus]}
            </span>
          ) : (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
              Belum ada presensi
            </span>
          )}
          <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
            Alpha {student.monthSummary.absent}
          </span>
        </div>
      </div>
    </article>
  );
}
