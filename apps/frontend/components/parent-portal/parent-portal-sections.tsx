import {
  type ParentAttendanceRecord,
  type ParentGradeRecord,
  type ParentPortalStudent,
  type ParentPortalSummary,
} from '../../lib/api';
import { formatReadableDate } from '../../lib/format';
import { MetricCard } from '../ui/metric-card';
import {
  getPrimaryTodayRecord,
  parentAttendanceStatusLabels,
  parentAttendanceStatusTone,
} from './parent-portal-utils';

export function ParentTodayBoard({ summary }: { summary: ParentPortalSummary }) {
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
          <span className={`rounded-full px-3 py-1 text-xs font-black ${summary.summary.absent ? 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-100' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-100'}`}>
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

export function ParentSummaryCard({ summary }: { summary: ParentPortalSummary }) {
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
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-brand-700 dark:bg-blue-400/10 dark:text-blue-100">
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

export function StudentOverviewCard({
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

export function StudentHistoryCard({ student }: { student: ParentPortalStudent }) {
  return (
    <article className="surface-card rounded-[1.5rem] p-4 sm:rounded-[1.75rem] sm:p-5">
      <StudentIdentity student={student} />
      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
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
        <span className={`rounded-full px-3 py-1 text-xs font-black ${status ? parentAttendanceStatusTone[status] : 'bg-slate-100 text-slate-600'}`}>
          {status ? parentAttendanceStatusLabels[status] : 'Belum ada data'}
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

function StudentIdentity({ student }: { student: ParentPortalStudent }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-600">{student.relation}</p>
        <h3 className="mt-1 truncate text-lg font-black sm:text-xl">{student.name}</h3>
        <p className="mt-1 text-sm text-muted">
          {student.activeClass
            ? `${student.activeClass.name} · ${student.activeClass.schoolYear}`
            : 'Belum ada kelas aktif'}
        </p>
      </div>
      {student.isPrimary ? (
        <span className="w-fit shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700 dark:bg-blue-400/10 dark:text-blue-100">
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
    <section className="mt-5 min-w-0 rounded-2xl border border-blue-50 bg-white/70 p-3 dark:border-[var(--border)] dark:bg-[var(--surface-soft)]">
      <h4 className="text-sm font-black">{title}</h4>
      <div className="mt-3 space-y-2">
        {records.length ? (
          records.map((record) => (
            <div className="rounded-2xl border border-blue-50 bg-slate-50 p-3 dark:border-[var(--border)] dark:bg-[var(--surface-solid)]" key={record.id}>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{record.subjectName}</p>
                  <p className="mt-1 break-words text-xs leading-5 text-muted">
                    {formatReadableDate(record.date)} · {record.className} · {record.teacherName}
                  </p>
                </div>
                <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-black ${parentAttendanceStatusTone[record.status]}`}>
                  {parentAttendanceStatusLabels[record.status]}
                </span>
              </div>
              {record.notes ? <p className="mt-2 text-xs text-muted">Catatan: {record.notes}</p> : null}
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-blue-50 p-4 text-sm text-muted dark:bg-blue-400/10">{emptyText}</p>
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
    <section className="mt-5 min-w-0 rounded-2xl border border-emerald-50 bg-white/70 p-3 dark:border-[var(--border)] dark:bg-[var(--surface-soft)]">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-sm font-black">Nilai Harian</h4>
        {summary?.available ? (
          <span className="w-fit shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-100">
            Rata-rata {summary.averageScore ?? '-'}
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-2">
        {grades.length ? (
          grades.map((grade) => (
            <div className="rounded-2xl border border-emerald-50 bg-emerald-50/50 p-3 dark:border-emerald-400/20 dark:bg-emerald-400/10" key={grade.id}>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{grade.title}</p>
                  <p className="mt-1 break-words text-xs leading-5 text-muted">
                    {formatReadableDate(grade.date)} · {grade.subjectName} · {grade.teacherName}
                  </p>
                </div>
                <span className="w-fit shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100">
                  {grade.score}/{grade.maxScore}
                </span>
              </div>
              {grade.notes ? <p className="mt-2 text-xs text-muted">Catatan: {grade.notes}</p> : null}
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted dark:bg-[var(--surface-solid)]">
            Belum ada nilai harian yang disubmit guru.
          </p>
        )}
      </div>
    </section>
  );
}
