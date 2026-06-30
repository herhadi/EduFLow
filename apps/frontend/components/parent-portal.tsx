'use client';

import { useState } from 'react';
import {
  api,
  type ParentAttendanceRecord,
  type ParentPortalSummary,
} from '../lib/api';
import { formatReadableDate } from '../lib/format';
import { MetricCard } from './ui/metric-card';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

const statusLabels: Record<ParentAttendanceRecord['status'], string> = {
  PRESENT: 'Hadir',
  SICK: 'Sakit',
  EXCUSED: 'Izin',
  ABSENT: 'Alpha',
};

const statusTone: Record<ParentAttendanceRecord['status'], string> = {
  PRESENT: 'bg-emerald-50 text-emerald-700',
  SICK: 'bg-amber-50 text-amber-700',
  EXCUSED: 'bg-blue-50 text-blue-700',
  ABSENT: 'bg-rose-50 text-rose-700',
};

export function ParentPortal() {
  const [contact, setContact] = useState('');
  const [summary, setSummary] = useState<ParentPortalSummary | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');

  async function loadPortal() {
    setLoadState('loading');

    try {
      const response = await api.getParentPortalSummary(contact);
      setSummary(response.data);
      setLoadState('success');
    } catch {
      setLoadState('error');
      setSummary(null);
    }
  }

  return (
    <section className="mt-8 space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-brand-700 to-brand-600 p-5 text-white shadow-xl shadow-blue-200 sm:p-7">
        <p className="text-sm font-semibold text-blue-100">Parent Portal</p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
          Pantau Kehadiran Anak
        </h2>
        <p className="mt-2 text-sm leading-6 text-blue-100">
          Masukkan nomor HP atau email wali murid untuk melihat
          ringkasan harian dan riwayat presensi.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="rounded-2xl border border-white/20 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-200"
            onChange={(event) => setContact(event.target.value)}
            placeholder="Contoh: 08561186917"
            value={contact}
          />
          <button
            className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-brand-700 transition hover:bg-blue-50"
            disabled={loadState === 'loading'}
            onClick={() => void loadPortal()}
            type="button"
          >
            {loadState === 'loading' ? 'Memuat...' : 'Lihat Data'}
          </button>
        </div>
      </div>

      {loadState === 'error' ? (
        <div className="rounded-[2rem] border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700">
          Data wali murid tidak ditemukan atau backend belum bisa diakses.
        </div>
      ) : null}

      {summary ? (
        <>
          <section className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60">
            <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
              Ringkasan Harian
            </p>
            <h3 className="mt-1 text-2xl font-bold">{summary.guardian.name}</h3>
            <p className="mt-1 text-sm text-muted">
              {formatReadableDate(summary.date)} · {summary.students.length} anak
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <MetricCard label="Total Presensi" value={summary.summary.total} />
              <MetricCard
                label="Hadir"
                tone="good"
                value={summary.summary.present}
              />
              <MetricCard
                label="Sakit"
                tone="warning"
                value={summary.summary.sick}
              />
              <MetricCard label="Izin" value={summary.summary.excused} />
              <MetricCard
                label="Alpha"
                tone="danger"
                value={summary.summary.absent}
              />
            </div>
          </section>

          <div className="space-y-5">
            {summary.students.map((student) => (
              <article
                className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60"
                key={student.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
                      {student.relation}
                    </p>
                    <h3 className="mt-1 text-2xl font-bold">{student.name}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {student.activeClass
                        ? `${student.activeClass.name} · ${student.activeClass.schoolYear}`
                        : 'Belum ada kelas aktif'}
                    </p>
                  </div>
                  {student.isPrimary ? (
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                      Anak utama
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <MetricCard label="Hari Ini" value={student.todaySummary.total} />
                  <MetricCard
                    label="Hadir"
                    tone="good"
                    value={student.todaySummary.present}
                  />
                  <MetricCard
                    label="Sakit"
                    tone="warning"
                    value={student.todaySummary.sick}
                  />
                  <MetricCard label="Izin" value={student.todaySummary.excused} />
                  <MetricCard
                    label="Alpha"
                    tone="danger"
                    value={student.todaySummary.absent}
                  />
                </div>

                <RecordSection
                  emptyText="Belum ada presensi hari ini."
                  records={student.dailySummary}
                  title="Ringkasan Hari Ini"
                />
                <RecordSection
                  emptyText="Belum ada riwayat presensi."
                  records={student.history}
                  title="Riwayat Presensi"
                />
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-[2rem] border border-blue-100 bg-white p-5 text-sm leading-6 text-muted shadow-sm shadow-blue-100/60">
          Gunakan kontak wali murid yang terdaftar untuk membuka data presensi
          dan riwayat anak.
        </div>
      )}
    </section>
  );
}

function RecordSection({
  emptyText,
  records,
  title,
}: {
  emptyText: string;
  records: ParentAttendanceRecord[];
  title: string;
}) {
  return (
    <section className="mt-6">
      <h4 className="font-bold">{title}</h4>
      <div className="mt-3 space-y-3">
        {records.length ? (
          records.map((record) => (
            <div
              className="rounded-2xl border border-blue-50 bg-slate-50 p-4"
              key={record.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{record.subjectName}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatReadableDate(record.date)} · {record.className} ·{' '}
                    {record.teacherName}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[record.status]}`}
                >
                  {statusLabels[record.status]}
                </span>
              </div>
              {record.notes ? (
                <p className="mt-2 text-xs text-muted">Catatan: {record.notes}</p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-blue-50 p-4 text-sm text-muted">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  );
}
