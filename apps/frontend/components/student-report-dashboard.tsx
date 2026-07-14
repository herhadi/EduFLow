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
import { Badge } from './ui/badge';
import { EmptyState } from './ui/empty-state';
import { LoadingState } from './ui/loading';
import { Pagination } from './ui/pagination';
import { SearchInput } from './ui/search';

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
type StudentDetailPanel = 'attendance' | 'grades';
const pageSize = 10;

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
  const [risk, setRisk] = useState<StudentReportItem['riskLevel'] | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<StudentReportData | null>(null);
  const [activeDetail, setActiveDetail] = useState<{
    panel: StudentDetailPanel;
    studentId: string;
  } | null>(null);
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

    return report.students.filter((student) => {
      const matchesRisk = risk ? student.riskLevel === risk : true;
      const matchesSearch = normalizedSearch
        ? [student.studentName, student.nis, student.nisn, student.className]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch))
        : true;

      return matchesRisk && matchesSearch;
    });
  }, [report, risk, search]);
  const paginatedStudents = useMemo(
    () => filteredStudents.slice((page - 1) * pageSize, page * pageSize),
    [filteredStudents, page],
  );
  const filteredSummary = useMemo(() => summarizeStudents(filteredStudents), [filteredStudents]);

  useEffect(() => {
    setPage(1);
    setActiveDetail(null);
  }, [classId, from, risk, search, status, to]);

  useEffect(() => {
    const totalPages = Math.max(Math.ceil(filteredStudents.length / pageSize), 1);

    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filteredStudents.length, page]);

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

        <div className="mt-5 grid gap-3 md:grid-cols-6">
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
          <label className="grid gap-2 text-xs font-black text-slate-700">
            Risiko
            <select
              className="min-w-0 rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-brand-600"
              onChange={(event) => setRisk(event.target.value as StudentReportItem['riskLevel'] | '')}
              value={risk}
            >
              <option value="">Semua</option>
              <option value="HIGH">Tinggi</option>
              <option value="MEDIUM">Sedang</option>
              <option value="LOW">Rendah</option>
            </select>
          </label>
        </div>
      </div>

      {loadState === 'error' ? (
        <div className="rounded-[2rem] border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700">
          Report siswa belum dapat dimuat.
        </div>
      ) : null}

      {loadState === 'loading' && !report ? (
        <LoadingState label="Memuat report siswa..." />
      ) : null}

      {report ? (
        <>
          <div className="grid grid-cols-4 gap-2 lg:grid-cols-7">
            <CompactSummaryStat label="Total" value={report.summary.total} />
            <CompactSummaryStat label="Hadir" tone="good" value={report.summary.present} />
            <CompactSummaryStat label="Sakit" tone="warning" value={report.summary.sick} />
            <CompactSummaryStat label="Izin" value={report.summary.excused} />
            <CompactSummaryStat label="Alpha" tone="danger" value={report.summary.absent} />
            <CompactSummaryStat label="Risiko Tinggi" shortLabel="R. Tinggi" tone="danger" value={report.summary.highRisk} />
            <CompactSummaryStat label="Risiko Sedang" shortLabel="R. Sedang" tone="warning" value={report.summary.mediumRisk} />
          </div>

          <div className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Daftar Siswa</h3>
                <p className="mt-1 text-sm text-muted">
                  {formatReadableDate(report.from)} - {formatReadableDate(report.to)} · {filteredStudents.length} siswa sesuai filter
                </p>
              </div>
              <SearchInput
                className="sm:w-72"
                onClear={() => setSearch('')}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama/NIS/kelas"
                value={search}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
              <ReportFilterStat label="Siswa" value={filteredSummary.students} />
              <ReportFilterStat label="Hadir" tone="good" value={filteredSummary.present} />
              <ReportFilterStat label="Sakit/Izin" tone="warning" value={filteredSummary.sick + filteredSummary.excused} />
              <ReportFilterStat label="Alpha" tone="danger" value={filteredSummary.absent} />
              <ReportFilterStat label="Risiko tinggi" tone="danger" value={filteredSummary.highRisk} />
            </div>

            <div className="mt-4 space-y-2">
              {paginatedStudents.map((student) => (
                <StudentReportRow
                  activePanel={
                    activeDetail?.studentId === student.studentId ? activeDetail.panel : null
                  }
                  key={student.studentId}
                  onSelectPanel={(panel) =>
                    setActiveDetail((current) =>
                      current?.studentId === student.studentId && current.panel === panel
                        ? null
                        : { panel, studentId: student.studentId },
                    )
                  }
                  student={student}
                />
              ))}
              {!filteredStudents.length ? (
                <EmptyState
                  description="Ubah kata kunci, kelas, status, atau rentang tanggal untuk melihat data lain."
                  title="Tidak ada data siswa sesuai filter."
                />
              ) : null}
            </div>
            <Pagination
              onPageChange={setPage}
              page={page}
              pageSize={pageSize}
              totalItems={filteredStudents.length}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}

function summarizeStudents(students: StudentReportItem[]) {
  return students.reduce(
    (summary, student) => ({
      students: summary.students + 1,
      present: summary.present + student.summary.present,
      sick: summary.sick + student.summary.sick,
      excused: summary.excused + student.summary.excused,
      absent: summary.absent + student.summary.absent,
      highRisk: summary.highRisk + (student.riskLevel === 'HIGH' ? 1 : 0),
    }),
    { absent: 0, excused: 0, highRisk: 0, present: 0, sick: 0, students: 0 },
  );
}

function ReportFilterStat({
  label,
  tone = 'neutral',
  value,
}: {
  label: string;
  tone?: 'danger' | 'good' | 'neutral' | 'warning';
  value: number;
}) {
  const toneClass = {
    danger: 'border-red-100 bg-red-50 text-red-700',
    good: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    neutral: 'border-slate-100 bg-slate-50 text-slate-700',
    warning: 'border-amber-100 bg-amber-50 text-amber-700',
  }[tone];

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <p className="text-xl font-black">{value}</p>
      <p className="text-[11px] font-black">{label}</p>
    </div>
  );
}

function CompactSummaryStat({
  label,
  shortLabel,
  tone = 'neutral',
  value,
}: {
  label: string;
  shortLabel?: string;
  tone?: 'danger' | 'good' | 'neutral' | 'warning';
  value: number;
}) {
  const toneClass = {
    danger: 'border-red-100 bg-red-50 text-red-700',
    good: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    neutral: 'border-slate-100 bg-white text-slate-700',
    warning: 'border-amber-100 bg-amber-50 text-amber-700',
  }[tone];

  return (
    <div className={`min-w-0 rounded-2xl border px-2.5 py-2 text-center ${toneClass}`}>
      <p className="text-lg font-black leading-5 sm:text-xl">{value}</p>
      <p className="mt-1 truncate text-[10px] font-black leading-3 sm:text-[11px]">
        <span className="sm:hidden">{shortLabel ?? label}</span>
        <span className="hidden sm:inline">{label}</span>
      </p>
    </div>
  );
}

function StudentReportRow({
  activePanel,
  onSelectPanel,
  student,
}: {
  activePanel: StudentDetailPanel | null;
  onSelectPanel: (panel: StudentDetailPanel) => void;
  student: StudentReportItem;
}) {
  return (
    <article className="rounded-2xl border border-blue-50 bg-slate-50/70 p-3">
      <div className="grid w-full gap-3 md:grid-cols-[1.4fr_0.9fr_1.2fr_auto]">
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
        <Badge className={riskClass[student.riskLevel]} tone="muted">
          {riskLabels[student.riskLevel]}
        </Badge>
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-blue-50 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-muted">
          Klik Riwayat atau Nilai Harian untuk membuka detail siswa ini.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <DetailButton
            active={activePanel === 'attendance'}
            label={`Riwayat (${student.latestRecords.length})`}
            onClick={() => onSelectPanel('attendance')}
          />
          <DetailButton
            active={activePanel === 'grades'}
            label={`Nilai Harian (${student.dailyGrades.records.length})`}
            onClick={() => onSelectPanel('grades')}
          />
        </div>
      </div>

      {activePanel ? (
        <div className="mt-3 rounded-xl bg-white p-3">
          {activePanel === 'attendance' ? (
            <AttendanceDetail student={student} />
          ) : (
            <GradeDetail student={student} />
          )}
          <p className="mt-3 rounded-lg bg-blue-50 p-2 text-xs font-black text-brand-700">
            {student.riskReason}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function DetailButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
        active
          ? 'border-brand-200 bg-brand-50 text-brand-700'
          : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:text-brand-700'
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function AttendanceDetail({ student }: { student: StudentReportItem }) {
  return (
    <>
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
    </>
  );
}

function GradeDetail({ student }: { student: StudentReportItem }) {
  return (
    <>
      <p className="text-xs font-black text-slate-900">Nilai Harian</p>
      {student.dailyGrades.available ? (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <MiniStat label="Rata-rata" value={student.dailyGrades.averageScore ?? 0} />
            <MiniStat label="Terbaru" value={student.dailyGrades.latestScore ?? 0} />
          </div>
          <div className="mt-2 space-y-2">
            {student.dailyGrades.records.map((record) => (
              <div className="rounded-lg border border-slate-100 p-2 text-xs" key={record.id}>
                <p className="font-black text-slate-800">
                  {record.title} · {record.subjectName}
                </p>
                <p className="mt-0.5 text-muted">
                  {formatReadableDate(record.date)} · {record.teacherName}
                </p>
                <p className="mt-1 font-black text-brand-700">
                  {record.score}/{record.maxScore}
                </p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs font-semibold leading-5 text-muted">
          Belum ada nilai harian yang disubmit pada rentang laporan ini.
        </p>
      )}
    </>
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
