'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type AttendanceStatus,
  type SchoolClass,
  type StudentReportDashboard as StudentReportData,
  type StudentReportItem,
} from '../lib/api';
import { formatReadableDate } from '../lib/format';
import { MetricCard } from './ui/metric-card';

const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: 'Hadir',
  SICK: 'Sakit',
  EXCUSED: 'Izin',
  ABSENT: 'Alpha',
};

const riskLabels: Record<StudentReportItem['riskLevel'], string> = {
  HIGH: 'Tinggi',
  MEDIUM: 'Sedang',
  LOW: 'Rendah',
};

const riskClass: Record<StudentReportItem['riskLevel'], string> = {
  HIGH: 'border-red-100 bg-red-50 text-red-700',
  MEDIUM: 'border-amber-100 bg-amber-50 text-amber-700',
  LOW: 'border-emerald-100 bg-emerald-50 text-emerald-700',
};

function getMonthRange() {
  const now = new Date();
  const startsAt = new Date(now.getFullYear(), now.getMonth(), 1);
  const endsAt = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: startsAt.toISOString().slice(0, 10),
    to: endsAt.toISOString().slice(0, 10),
  };
}

export function StudentReportDashboard() {
  const defaultRange = useMemo(() => getMonthRange(), []);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [status, setStatus] = useState<AttendanceStatus | ''>('');
  const [search, setSearch] = useState('');
  const [report, setReport] = useState<StudentReportData | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'success' | 'error'>('loading');

  async function loadReport() {
    setLoadState('loading');

    try {
      const response = await api.getStudentReport({ classId, from, status, to });
      setReport(response.data);
      setLoadState('success');
    } catch {
      setLoadState('error');
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        const classResponse = await api.getClasses();
        setClasses(classResponse.data);
      } catch {
        setClasses([]);
      }
    }

    void loadInitialData();
    void loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!report) {
      return [];
    }

    if (!normalizedSearch) {
      return report.students;
    }

    return report.students.filter((student) =>
      [student.studentName, student.nis, student.nisn, student.className]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    );
  }, [report, search]);

  return (
    <section className="mt-8 space-y-5">
      <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              Report Siswa
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Presensi dan Risiko Siswa
            </h2>
            <p className="mt-1 text-sm text-muted">
              Nilai harian akan tampil di detail siswa setelah modul penilaian aktif.
            </p>
          </div>
          <button
            className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white transition hover:bg-brand-700"
            onClick={() => void loadReport()}
            type="button"
          >
            Terapkan Filter
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <label className="grid gap-2 text-xs font-black text-slate-700 md:col-span-2">
            Kelas
            <select
              className="min-w-0 rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-brand-600"
              onChange={(event) => setClassId(event.target.value)}
              value={classId}
            >
              <option value="">Semua kelas</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name} · {schoolClass.schoolYear?.name ?? 'TA aktif'}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-xs font-black text-slate-700">
            Dari
            <input
              className="min-w-0 rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-brand-600"
              onChange={(event) => setFrom(event.target.value)}
              type="date"
              value={from}
            />
          </label>
          <label className="grid gap-2 text-xs font-black text-slate-700">
            Sampai
            <input
              className="min-w-0 rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-brand-600"
              onChange={(event) => setTo(event.target.value)}
              type="date"
              value={to}
            />
          </label>
          <label className="grid gap-2 text-xs font-black text-slate-700">
            Status
            <select
              className="min-w-0 rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-brand-600"
              onChange={(event) => setStatus(event.target.value as AttendanceStatus | '')}
              value={status}
            >
              <option value="">Semua</option>
              <option value="PRESENT">Hadir</option>
              <option value="SICK">Sakit</option>
              <option value="EXCUSED">Izin</option>
              <option value="ABSENT">Alpha</option>
            </select>
          </label>
        </div>
      </div>

      {loadState === 'error' ? (
        <div className="rounded-[2rem] border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700">
          Report siswa belum dapat dimuat.
        </div>
      ) : null}

      {report ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
            <MetricCard label="Total" value={report.summary.total} />
            <MetricCard label="Hadir" tone="good" value={report.summary.present} />
            <MetricCard label="Sakit" tone="warning" value={report.summary.sick} />
            <MetricCard label="Izin" value={report.summary.excused} />
            <MetricCard label="Alpha" tone="danger" value={report.summary.absent} />
            <MetricCard label="Risiko Tinggi" tone="danger" value={report.summary.highRisk} />
            <MetricCard label="Risiko Sedang" tone="warning" value={report.summary.mediumRisk} />
          </div>

          <div className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Daftar Siswa</h3>
                <p className="mt-1 text-sm text-muted">
                  {formatReadableDate(report.from)} - {formatReadableDate(report.to)}
                </p>
              </div>
              <input
                className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-brand-600 sm:w-72"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama/NIS/kelas"
                value={search}
              />
            </div>

            <div className="mt-4 space-y-2">
              {filteredStudents.map((student) => (
                <StudentReportRow
                  expanded={expandedId === student.studentId}
                  key={student.studentId}
                  onToggle={() =>
                    setExpandedId((current) =>
                      current === student.studentId ? null : student.studentId,
                    )
                  }
                  student={student}
                />
              ))}
              {!filteredStudents.length ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-muted">
                  Tidak ada data siswa sesuai filter.
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function StudentReportRow({
  expanded,
  onToggle,
  student,
}: {
  expanded: boolean;
  onToggle: () => void;
  student: StudentReportItem;
}) {
  return (
    <article className="rounded-2xl border border-blue-50 bg-slate-50/70 p-3">
      <button
        className="grid w-full gap-3 text-left md:grid-cols-[1.4fr_0.9fr_1.2fr_auto]"
        onClick={onToggle}
        type="button"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900">{student.studentName}</p>
          <p className="mt-1 text-xs font-semibold text-muted">
            NIS: {student.nis ?? '-'} · {student.className ?? '-'}
          </p>
        </div>
        <div className="text-xs font-semibold text-muted">
          <p>Wali: {student.guardianName ?? '-'}</p>
          <p className="mt-1">{student.guardianContact ?? '-'}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <MiniStat label="H" value={student.summary.present} />
          <MiniStat label="S" value={student.summary.sick} />
          <MiniStat label="I" value={student.summary.excused} />
          <MiniStat danger label="A" value={student.summary.absent} />
        </div>
        <span className={`h-fit rounded-full border px-3 py-1 text-xs font-black ${riskClass[student.riskLevel]}`}>
          {riskLabels[student.riskLevel]}
        </span>
      </button>

      {expanded ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-xl bg-white p-3">
            <p className="text-xs font-black text-slate-900">Riwayat Presensi Terbaru</p>
            <div className="mt-2 space-y-2">
              {student.latestRecords.length ? (
                student.latestRecords.map((record) => (
                  <div
                    className="flex flex-col gap-1 rounded-lg border border-slate-100 p-2 text-xs sm:flex-row sm:items-center sm:justify-between"
                    key={record.id}
                  >
                    <div>
                      <p className="font-black text-slate-800">
                        {record.subjectName} · {record.className}
                      </p>
                      <p className="mt-0.5 text-muted">
                        {formatReadableDate(record.date)} · {record.teacherName}
                      </p>
                    </div>
                    <span className="font-black text-brand-700">
                      {statusLabels[record.status]}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs font-semibold text-muted">
                  Belum ada presensi pada rentang ini.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-white p-3">
            <p className="text-xs font-black text-slate-900">Nilai Harian</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-muted">
              Belum tersedia. Nanti bagian ini menampilkan rata-rata nilai harian,
              nilai terbaru, dan daftar penilaian per mapel untuk siswa ini.
            </p>
            <p className="mt-3 rounded-lg bg-blue-50 p-2 text-xs font-black text-brand-700">
              {student.riskReason}
            </p>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function MiniStat({
  danger = false,
  label,
  value,
}: {
  danger?: boolean;
  label: string;
  value: number;
}) {
  return (
    <span
      className={`rounded-lg px-2 py-1 text-xs font-black ${
        danger ? 'bg-red-50 text-red-700' : 'bg-white text-slate-700'
      }`}
    >
      {label}: {value}
    </span>
  );
}
