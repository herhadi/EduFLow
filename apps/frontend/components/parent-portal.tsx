'use client';

import { useEffect, useState } from 'react';
import {
  api,
  type ParentAttendanceRecord,
  type ParentGradeRecord,
  type ParentPortalStudent,
  type ParentPortalSummary,
} from '../lib/api';
import { formatReadableDate } from '../lib/format';
import { MetricCard } from './ui/metric-card';

type LoadState = 'idle' | 'loading' | 'success' | 'error';
type ParentPortalMode = 'overview' | 'history' | 'full';

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

export function ParentPortal({
  initialContact = '',
  mode = 'full',
  title = 'Pantau Kehadiran Anak',
}: {
  initialContact?: string;
  mode?: ParentPortalMode;
  title?: string;
}) {
  const [contact, setContact] = useState(initialContact);
  const [summary, setSummary] = useState<ParentPortalSummary | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const showLookup = !initialContact;

  async function loadPortal(contactValue = contact) {
    if (!contactValue.trim()) {
      setLoadState('idle');
      return;
    }

    setLoadState('loading');

    try {
      const response = await api.getParentPortalSummary(contactValue);
      setSummary(response.data);
      setLoadState('success');
    } catch {
      setLoadState('error');
      setSummary(null);
    }
  }

  useEffect(() => {
    if (initialContact) {
      void loadPortal(initialContact);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContact]);

  const showIntroCard = showLookup || mode !== 'overview';

  return (
    <section className="mt-6 space-y-5">
      {showIntroCard ? (
        <div className="surface-card rounded-[1.75rem] p-5">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-600">Portal Orang Tua</p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {showLookup
              ? 'Masukkan nomor HP atau email wali murid untuk membuka ringkasan anak.'
              : mode === 'history'
                ? 'Riwayat presensi dan nilai harian yang sudah disubmit guru.'
                : 'Data ditampilkan dari akun wali murid yang sedang login.'}
          </p>

          {showLookup ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                className="min-w-0 rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-600"
                onChange={(event) => setContact(event.target.value)}
                placeholder="Contoh: wali@email.sch.id atau 0856..."
                value={contact}
              />
              <button
                className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white transition hover:bg-brand-700 disabled:opacity-60"
                disabled={loadState === 'loading'}
                onClick={() => void loadPortal()}
                type="button"
              >
                {loadState === 'loading' ? 'Memuat...' : 'Lihat Data'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {loadState === 'error' ? (
        <div className="rounded-[1.5rem] border border-rose-100 bg-rose-50 p-5 text-sm font-bold text-rose-700">
          Data wali murid tidak ditemukan atau backend belum bisa diakses.
        </div>
      ) : null}

      {summary ? (
        <>
          {mode === 'overview' ? (
            <ParentTodayBoard summary={summary} />
          ) : (
            <>
              {mode === 'full' ? <ParentSummaryCard summary={summary} /> : null}

              <div className="space-y-4">
                {summary.students.map((student) =>
                  mode === 'history' ? (
                    <StudentHistoryCard key={student.id} student={student} />
                  ) : (
                    <StudentOverviewCard key={student.id} showHistory student={student} />
                  ),
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="surface-card rounded-[1.5rem] p-5 text-sm leading-6 text-muted">
          {showLookup
            ? 'Gunakan kontak wali murid yang terdaftar untuk membuka data anak.'
            : 'Data anak belum tersedia untuk akun ini. Pastikan email akun wali sama dengan email wali murid di data siswa.'}
        </div>
      )}
    </section>
  );
}

function ParentTodayBoard({ summary }: { summary: ParentPortalSummary }) {
  return (
    <section className="space-y-3">
      <div className="surface-card rounded-[1.75rem] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-600">Status Hari Ini</p>
            <h3 className="mt-1 text-xl font-black">{formatReadableDate(summary.date)}</h3>
            <p className="mt-1 text-sm text-muted">
              {summary.students.length} anak terhubung ke akun {summary.guardian.name}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${summary.summary.absent ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {summary.summary.absent ? `${summary.summary.absent} Alpha` : 'Aman'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <MetricCard label="Hadir" tone="good" value={summary.summary.present} />
          <MetricCard label="Sakit" tone="warning" value={summary.summary.sick} />
          <MetricCard label="Izin" value={summary.summary.excused} />
          <MetricCard label="Alpha" tone="danger" value={summary.summary.absent} />
        </div>
      </div>

      <div className="grid gap-3">
        {summary.students.map((student) => (
          <StudentTodayStrip key={student.id} student={student} />
        ))}
      </div>
    </section>
  );
}

function StudentTodayStrip({ student }: { student: ParentPortalStudent }) {
  const primaryRecord = getPrimaryTodayRecord(student.dailySummary);
  const status = primaryRecord?.status;

  return (
    <article className="surface-card rounded-[1.5rem] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black">{student.name}</h3>
          <p className="mt-1 text-xs font-bold text-muted">
            {student.activeClass
              ? `${student.activeClass.name} · ${student.activeClass.schoolYear}`
              : 'Belum ada kelas aktif'}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${status ? statusTone[status] : 'bg-slate-100 text-slate-600'}`}>
          {status ? statusLabels[status] : 'Belum ada data'}
        </span>
      </div>

      {primaryRecord ? (
        <p className="mt-3 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-bold text-slate-700">
          Terakhir: {primaryRecord.subjectName} · {primaryRecord.teacherName}
        </p>
      ) : (
        <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-muted">
          Presensi hari ini belum masuk dari guru.
        </p>
      )}
    </article>
  );
}

function ParentSummaryCard({ summary }: { summary: ParentPortalSummary }) {
  return (
    <section className="surface-card rounded-[1.75rem] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-600">Ringkasan Hari Ini</p>
          <h3 className="mt-1 text-xl font-black">{summary.guardian.name}</h3>
          <p className="mt-1 text-sm text-muted">
            {formatReadableDate(summary.date)} · {summary.students.length} anak
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-brand-700">
          Parent
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MetricCard label="Total" value={summary.summary.total} />
        <MetricCard label="Hadir" tone="good" value={summary.summary.present} />
        <MetricCard label="Sakit" tone="warning" value={summary.summary.sick} />
        <MetricCard label="Izin" value={summary.summary.excused} />
        <MetricCard label="Alpha" tone="danger" value={summary.summary.absent} />
      </div>
    </section>
  );
}

function getPrimaryTodayRecord(records: ParentAttendanceRecord[]) {
  return (
    records.find((record) => record.status === 'ABSENT') ??
    records.find((record) => record.status === 'SICK') ??
    records.find((record) => record.status === 'EXCUSED') ??
    records[0] ??
    null
  );
}

function StudentOverviewCard({
  showHistory,
  student,
}: {
  showHistory: boolean;
  student: ParentPortalStudent;
}) {
  return (
    <article className="surface-card rounded-[1.75rem] p-5">
      <StudentIdentity student={student} />

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MetricCard label="Hari Ini" value={student.todaySummary.total} />
        <MetricCard label="Hadir" tone="good" value={student.todaySummary.present} />
        <MetricCard label="Sakit" tone="warning" value={student.todaySummary.sick} />
        <MetricCard label="Izin" value={student.todaySummary.excused} />
        <MetricCard label="Alpha" tone="danger" value={student.todaySummary.absent} />
      </div>

      <RecordSection
        emptyText="Belum ada presensi hari ini."
        records={student.dailySummary}
        title="Presensi Hari Ini"
      />

      {showHistory ? (
        <>
          <RecordSection
            emptyText="Belum ada riwayat presensi."
            records={student.history}
            title="Riwayat Presensi"
          />
          <GradeSection grades={student.grades?.records ?? []} summary={student.grades} />
        </>
      ) : null}
    </article>
  );
}

function StudentHistoryCard({ student }: { student: ParentPortalStudent }) {
  return (
    <article className="surface-card rounded-[1.75rem] p-5">
      <StudentIdentity student={student} />
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <RecordSection
          emptyText="Belum ada riwayat presensi."
          records={student.history}
          title="Riwayat Presensi"
        />
        <GradeSection grades={student.grades?.records ?? []} summary={student.grades} />
      </div>
    </article>
  );
}

function StudentIdentity({ student }: { student: ParentPortalStudent }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-600">{student.relation}</p>
        <h3 className="mt-1 text-xl font-black">{student.name}</h3>
        <p className="mt-1 text-sm text-muted">
          {student.activeClass
            ? `${student.activeClass.name} · ${student.activeClass.schoolYear}`
            : 'Belum ada kelas aktif'}
        </p>
      </div>
      {student.isPrimary ? (
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
          Anak utama
        </span>
      ) : null}
    </div>
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
    <section className="mt-5 min-w-0">
      <h4 className="text-sm font-black">{title}</h4>
      <div className="mt-3 space-y-2">
        {records.length ? (
          records.map((record) => (
            <div className="rounded-2xl border border-blue-50 bg-slate-50 p-3" key={record.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{record.subjectName}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatReadableDate(record.date)} · {record.className} · {record.teacherName}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${statusTone[record.status]}`}>
                  {statusLabels[record.status]}
                </span>
              </div>
              {record.notes ? <p className="mt-2 text-xs text-muted">Catatan: {record.notes}</p> : null}
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-blue-50 p-4 text-sm text-muted">{emptyText}</p>
        )}
      </div>
    </section>
  );
}

function GradeSection({
  grades,
  summary,
}: {
  grades: ParentGradeRecord[];
  summary?: ParentPortalStudent['grades'];
}) {
  return (
    <section className="mt-5 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-black">Nilai Harian</h4>
        {summary?.available ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            Rata-rata {summary.averageScore ?? '-'}
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-2">
        {grades.length ? (
          grades.map((grade) => (
            <div className="rounded-2xl border border-emerald-50 bg-emerald-50/50 p-3" key={grade.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{grade.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatReadableDate(grade.date)} · {grade.subjectName} · {grade.teacherName}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700">
                  {grade.score}/{grade.maxScore}
                </span>
              </div>
              {grade.notes ? <p className="mt-2 text-xs text-muted">Catatan: {grade.notes}</p> : null}
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
            Belum ada nilai harian yang disubmit guru.
          </p>
        )}
      </div>
    </section>
  );
}
