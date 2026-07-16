import { type StudentReportItem } from '../../lib/api';
import { formatReadableDate } from '../../lib/format';
import { Badge } from '../ui/badge';
import { MiniStat } from './student-report-stats';
import {
  riskClass,
  riskLabels,
  statusLabels,
  type StudentDetailPanel,
} from './student-report-utils';

type StudentReportRowProps = {
  activePanel: StudentDetailPanel | null;
  onSelectPanel: (panel: StudentDetailPanel) => void;
  student: StudentReportItem;
};

export function StudentReportRow({
  activePanel,
  onSelectPanel,
  student,
}: StudentReportRowProps) {
  return (
    <article className="rounded-2xl border border-blue-50 bg-slate-50/70 p-3 dark:border-[var(--border)] dark:bg-[var(--surface-soft)]">
      <div className="grid w-full gap-3 md:grid-cols-[1.4fr_0.9fr_1.2fr_auto]">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900 dark:text-[var(--text)]">{student.studentName}</p>
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

      <div className="mt-3 flex flex-col gap-2 border-t border-blue-50 pt-3 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
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
        <div className="mt-3 rounded-xl bg-white p-3 dark:bg-[var(--surface-solid)]">
          {activePanel === 'attendance' ? (
            <AttendanceDetail student={student} />
          ) : (
            <GradeDetail student={student} />
          )}
          <p className="mt-3 rounded-lg bg-blue-50 p-2 text-xs font-black text-brand-700 dark:bg-blue-400/10 dark:text-blue-100">
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
          ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100'
          : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:text-brand-700 dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:text-[var(--text)]'
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
      <p className="text-xs font-black text-slate-900 dark:text-[var(--text)]">Riwayat Presensi Terbaru</p>
      <div className="mt-2 space-y-2">
        {student.latestRecords.length ? (
          student.latestRecords.map((record) => (
            <div
              className="flex flex-col gap-1 rounded-lg border border-slate-100 p-2 text-xs dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between"
              key={record.id}
            >
              <div>
                <p className="font-black text-slate-800 dark:text-[var(--text)]">
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
      <p className="text-xs font-black text-slate-900 dark:text-[var(--text)]">Nilai Harian</p>
      {student.dailyGrades.available ? (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <MiniStat label="Rata-rata" value={student.dailyGrades.averageScore ?? 0} />
            <MiniStat label="Terbaru" value={student.dailyGrades.latestScore ?? 0} />
          </div>
          <div className="mt-2 space-y-2">
            {student.dailyGrades.records.map((record) => (
              <div className="rounded-lg border border-slate-100 p-2 text-xs dark:border-[var(--border)]" key={record.id}>
                <p className="font-black text-slate-800 dark:text-[var(--text)]">
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
