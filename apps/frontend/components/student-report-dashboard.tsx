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
import { StudentReportRow } from './student-report-dashboard/student-report-row';
import { CompactSummaryStat, ReportFilterStat } from './student-report-dashboard/student-report-stats';
import {
  getMonthRange,
  studentReportPageSize,
  summarizeStudents,
  type StudentDetailPanel,
} from './student-report-dashboard/student-report-utils';
import { EmptyState } from './ui/empty-state';
import { LoadingState } from './ui/loading';
import { Pagination } from './ui/pagination';
import { SearchInput } from './ui/search';

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
    () => filteredStudents.slice((page - 1) * studentReportPageSize, page * studentReportPageSize),
    [filteredStudents, page],
  );
  const filteredSummary = useMemo(() => summarizeStudents(filteredStudents), [filteredStudents]);

  useEffect(() => {
    setPage(1);
    setActiveDetail(null);
  }, [classId, from, risk, search, status, to]);

  useEffect(() => {
    const totalPages = Math.max(Math.ceil(filteredStudents.length / studentReportPageSize), 1);

    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filteredStudents.length, page]);

  return (
    <section className="mt-8 space-y-5">
      <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:shadow-none">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              Report Siswa
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-[var(--text)]">
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
          <label className="grid gap-2 text-xs font-black text-slate-700 dark:text-[var(--text-soft)] md:col-span-2">
            Kelas
            <select
              className="min-w-0 rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-brand-600 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]"
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
          <label className="grid gap-2 text-xs font-black text-slate-700 dark:text-[var(--text-soft)]">
            Dari
            <input
              className="min-w-0 rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-brand-600 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]"
              onChange={(event) => setFrom(event.target.value)}
              type="date"
              value={from}
            />
          </label>
          <label className="grid gap-2 text-xs font-black text-slate-700 dark:text-[var(--text-soft)]">
            Sampai
            <input
              className="min-w-0 rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-brand-600 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]"
              onChange={(event) => setTo(event.target.value)}
              type="date"
              value={to}
            />
          </label>
          <label className="grid gap-2 text-xs font-black text-slate-700 dark:text-[var(--text-soft)]">
            Status
            <select
              className="min-w-0 rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-brand-600 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]"
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
          <label className="grid gap-2 text-xs font-black text-slate-700 dark:text-[var(--text-soft)]">
            Risiko
            <select
              className="min-w-0 rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-brand-600 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]"
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
        <div className="rounded-[2rem] border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100">
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

          <div className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:shadow-none sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-[var(--text)]">Daftar Siswa</h3>
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
              pageSize={studentReportPageSize}
              totalItems={filteredStudents.length}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
