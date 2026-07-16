import {
  type SchoolClass,
  type SchoolYear,
  type Student,
  type Subject,
  type Teacher,
} from '../../lib/api';
import {
  getClassRows,
  getSchoolYearRows,
  getStudentRows,
  getSubjectRows,
  getTeacherRows,
} from './master-data-utils';
import { EmptyState } from '../ui/empty-state';
import { Table, TableShell } from '../ui/table';

export function TeacherList({ teachers }: { teachers: Teacher[] }) {
  return (
    <ResponsiveList
      emptyLabel="Belum ada guru."
      headers={['Nama Guru', 'NIP', 'No HP', 'Status']}
      rows={getTeacherRows(teachers)}
    />
  );
}

export function StudentList({ students }: { students: Student[] }) {
  return (
    <ResponsiveList
      emptyLabel="Belum ada siswa."
      headers={['Nama Siswa', 'NIS', 'NISN', 'Kelas Aktif', 'Wali Utama']}
      rows={getStudentRows(students)}
    />
  );
}

export function ClassList({ classes }: { classes: SchoolClass[] }) {
  return (
    <ResponsiveList
      emptyLabel="Belum ada kelas."
      headers={['Nama Kelas', 'Kode', 'Tingkat', 'Tahun Ajaran']}
      rows={getClassRows(classes)}
    />
  );
}

export function SubjectList({ subjects }: { subjects: Subject[] }) {
  return (
    <ResponsiveList
      emptyLabel="Belum ada mata pelajaran."
      headers={['Mata Pelajaran', 'Kode', 'Status']}
      rows={getSubjectRows(subjects)}
    />
  );
}

export function SchoolYearList({ schoolYears }: { schoolYears: SchoolYear[] }) {
  return (
    <ResponsiveList
      emptyLabel="Belum ada tahun ajaran."
      headers={['Tahun Ajaran', 'Mulai', 'Selesai']}
      rows={getSchoolYearRows(schoolYears)}
    />
  );
}

function ResponsiveList({
  emptyLabel,
  headers,
  rows,
}: {
  emptyLabel: string;
  headers: string[];
  rows: string[][];
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyLabel} />;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row, rowIndex) => (
          <article
            className="rounded-2xl border border-blue-100 bg-slate-50 p-4 dark:border-blue-400/20 dark:bg-blue-500/10"
            key={`${row.join('-')}-${rowIndex}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                  {row[0]}
                </h3>
                {row[1] ? (
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {headers[1]}: {row[1]}
                  </p>
                ) : null}
              </div>
              {row[row.length - 1] ? (
                <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-blue-500/15 dark:text-blue-100">
                  {row[row.length - 1]}
                </span>
              ) : null}
            </div>

            <dl className="mt-4 grid gap-2">
              {row.slice(1).map((cell, cellIndex) => (
                <div
                  className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2 dark:bg-slate-950"
                  key={`${cell}-${cellIndex}`}
                >
                  <dt className="text-xs font-bold text-muted">
                    {headers[cellIndex + 1]}
                  </dt>
                  <dd className="max-w-[60%] text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {cell}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      <TableShell className="hidden md:block">
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <thead className="bg-slate-50 text-xs font-bold tracking-[0.08em] text-slate-500 uppercase dark:bg-slate-900 dark:text-slate-300">
              <tr>
                {headers.map((header) => (
                  <th className="px-4 py-3" key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row, rowIndex) => (
                <tr key={`${row.join('-')}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-200" key={`${cell}-${cellIndex}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </TableShell>
    </>
  );
}
