import {
  type SchoolClass,
  type SchoolYear,
  type Semester,
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
import { useState } from 'react';
import { api } from '../../lib/api';
import { EmptyState } from '../ui/empty-state';
import { Table, TableShell } from '../ui/table';
import { formatSchoolDate } from '../../lib/school-time';

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

export function SchoolYearList({ schoolYears, semesters, onSemesterSaved }: {
  schoolYears: SchoolYear[];
  semesters: Semester[];
  onSemesterSaved: (semester: Semester) => void;
}) {
  const [editingId, setEditingId] = useState('');
  const [dates, setDates] = useState({ startsAt: '', endsAt: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function dateInput(value: string) { return value.slice(0, 10); }
  async function saveSemester(id: string) {
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await api.updateSemesterDates(id, dates);
      onSemesterSaved(response.data);
      setEditingId('');
      setNotice(response.message ?? 'Tanggal semester berhasil disimpan.');
    } catch (cause) {
      setError((cause as Error).message);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Daftar Tahun Ajaran</h3>
        <div className="mt-3"><ResponsiveList emptyLabel="Belum ada tahun ajaran." headers={['Tahun Ajaran', 'Mulai', 'Selesai']} rows={getSchoolYearRows(schoolYears)} /></div>
      </div>
      <section className="rounded-2xl border border-[var(--border)] p-4 sm:p-5">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Pengaturan Periode Semester</h3>
          <p className="mt-1 text-sm text-muted">Atur tanggal mulai dan selesai setiap semester. Tanggal harus berada dalam tahun ajaran dan tidak boleh bertumpang tindih.</p>
        </div>
        {notice && <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
        <div className="mt-4 space-y-4">
          {schoolYears.map((year) => (
            <div key={year.id} className="rounded-xl border border-[var(--border)] p-3 sm:p-4">
              <h4 className="font-extrabold text-slate-900 dark:text-slate-100">{year.name}</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(['ODD', 'EVEN'] as const).map((type) => {
                  const semester = semesters.find((item) => item.schoolYearId === year.id && item.type === type);
                  if (!semester) return <p key={type} className="text-sm text-muted">{type === 'ODD' ? 'Semester Ganjil' : 'Semester Genap'} belum tersedia.</p>;
                  const editing = editingId === semester.id;
                  return (
                    <div key={semester.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-sm text-slate-800 dark:text-slate-100">{type === 'ODD' ? 'Semester Ganjil' : 'Semester Genap'}</strong>
                        {!editing && <button type="button" className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-400/40 dark:text-blue-200 dark:hover:bg-blue-500/10" onClick={() => { setEditingId(semester.id); setDates({ startsAt: dateInput(semester.startsAt), endsAt: dateInput(semester.endsAt) }); setError(''); }}>Ubah tanggal</button>}
                      </div>
                      {editing ? (
                        <div className="mt-3 grid gap-2">
                          <label className="grid gap-1 text-xs font-semibold text-muted">Mulai<input type="date" value={dates.startsAt} onChange={(event) => setDates((current) => ({ ...current, startsAt: event.target.value }))} className="rounded-lg border border-[var(--border)] bg-white p-2 text-sm text-slate-900 dark:bg-slate-950 dark:text-slate-100" /></label>
                          <label className="grid gap-1 text-xs font-semibold text-muted">Selesai<input type="date" value={dates.endsAt} onChange={(event) => setDates((current) => ({ ...current, endsAt: event.target.value }))} className="rounded-lg border border-[var(--border)] bg-white p-2 text-sm text-slate-900 dark:bg-slate-950 dark:text-slate-100" /></label>
                          <div className="flex gap-2 pt-1"><button type="button" disabled={saving || !dates.startsAt || !dates.endsAt} onClick={() => void saveSemester(semester.id)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Menyimpan…' : 'Simpan'}</button><button type="button" disabled={saving} onClick={() => setEditingId('')} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold text-muted">Batal</button></div>
                        </div>
                      ) : <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{formatSchoolDate(semester.startsAt)} – {formatSchoolDate(semester.endsAt)}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
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
