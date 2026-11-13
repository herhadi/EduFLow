'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { getPreferredSchoolYear } from '../../lib/school-year';
import type { Student } from '../../lib/api-types';
import { PrintPreview } from '../print/print-preview';

type ClassGroup = { key: string; name: string; students: Student[] };
type LoadState = 'loading' | 'success' | 'error';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function genderLabel(value?: Student['gender']) {
  if (value === 'MALE') return 'Laki-laki';
  if (value === 'FEMALE') return 'Perempuan';
  return '—';
}

function relationLabel(value: string) {
  const labels: Record<string, string> = { FATHER: 'Ayah', MOTHER: 'Ibu', GUARDIAN: 'Wali', OTHER: 'Lainnya' };
  return labels[value] ?? value;
}

function getGuardians(student: Student) {
  return (student.guardians ?? []).map((item) => ({
    name: item.guardian.name,
    relation: relationLabel(item.relation),
    phone: item.guardian.phone || '—',
    email: item.guardian.email || '—',
    address: item.guardian.address || '—',
    primary: item.isPrimary,
  }));
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function TuActiveStudents({ audience = 'tu' }: { audience?: 'tu' | 'operator' }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [schoolYearId, setSchoolYearId] = useState<string>();
  const [schoolYearName, setSchoolYearName] = useState('Tahun ajaran berjalan');
  const [search, setSearch] = useState('');
  const [selectedClassKeys, setSelectedClassKeys] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoadState('loading');
      try {
        const [studentResponse, yearResponse] = await Promise.all([
          api.getStudents(),
          api.getSchoolYears(),
        ]);
        if (ignore) return;
        const year = getPreferredSchoolYear(yearResponse.data);
        setSchoolYearId(year?.id);
        setSchoolYearName(year?.name ?? 'Tahun ajaran belum ditentukan');
        setStudents(studentResponse.data.filter((student) =>
          student.isActive !== false &&
          student.enrollments?.some((enrollment) =>
            enrollment.isActive && (!year?.id || enrollment.schoolYear?.id === year.id),
          ),
        ));
        setLoadState('success');
      } catch {
        if (!ignore) setLoadState('error');
      }
    }
    void load();
    return () => { ignore = true; };
  }, []);

  const classGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID');
    const filtered = students.filter((student) =>
      !query ||
      student.name.toLocaleLowerCase('id-ID').includes(query) ||
      (student.nis ?? '').toLocaleLowerCase('id-ID').includes(query) ||
      (student.nisn ?? '').toLocaleLowerCase('id-ID').includes(query),
    );
    const grouped = Object.values(filtered.reduce<Record<string, ClassGroup>>((acc, student) => {
      const enrollment = student.enrollments.find((item) =>
        item.isActive && (!schoolYearId || item.schoolYear?.id === schoolYearId),
      );
      const name = enrollment?.class?.name ?? 'Belum ada kelas';
      const key = enrollment?.class?.id ?? 'unassigned';
      if (!acc[key]) acc[key] = { key, name, students: [] };
      acc[key].students.push(student);
      return acc;
    }, {}));
    return grouped
      .sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }))
      .map((group) => ({
        ...group,
        students: [...group.students].sort((a, b) =>
          a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }),
        ),
      }));
  }, [students, search, schoolYearId]);

  const selectedGroups = classGroups.filter((group) => selectedClassKeys.includes(group.key));

  const previewPages = selectedGroups.flatMap((group) => {
    const pageSize = 22;
    const chunks: Student[][] = [];
    for (let index = 0; index < group.students.length; index += pageSize) {
      chunks.push(group.students.slice(index, index + pageSize));
    }
    return chunks.map((chunk, pageIndex) => (
      <div className="h-full" key={group.key + '-' + pageIndex}>
        <div className="mb-3 border-b-2 border-slate-900 pb-2 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-widest">Daftar Siswa Aktif</p>
          <h2 className="mt-1 text-base font-black">{group.name}</h2>
          <p className="mt-1 text-[9px]">
            Tahun Ajaran: {schoolYearName} · Jumlah: {group.students.length} siswa
            {chunks.length > 1 ? ' · Lembar ' + (pageIndex + 1) + '/' + chunks.length : ''}
          </p>
        </div>
        <table className="w-full table-fixed border-collapse text-[8px] leading-tight">
          <thead>
            <tr className="bg-slate-100">
              <th className="w-[4%] border border-slate-400 px-1 py-1 text-center">No</th>
              <th className="w-[10%] border border-slate-400 px-1 py-1 text-left">NIS / NISN</th>
              <th className="w-[18%] border border-slate-400 px-1 py-1 text-left">Nama siswa</th>
              <th className="w-[8%] border border-slate-400 px-1 py-1 text-left">JK</th>
              <th className="w-[12%] border border-slate-400 px-1 py-1 text-left">Tanggal lahir</th>
              <th className="w-[10%] border border-slate-400 px-1 py-1 text-left">HP siswa</th>
              <th className="w-[15%] border border-slate-400 px-1 py-1 text-left">Nama wali</th>
              <th className="w-[8%] border border-slate-400 px-1 py-1 text-left">Hubungan</th>
              <th className="w-[15%] border border-slate-400 px-1 py-1 text-left">Kontak wali</th>
            </tr>
          </thead>
          <tbody>
            {chunk.map((student, index) => {
              const guardians = getGuardians(student);
              return (
                <tr key={student.id}>
                  <td className="border border-slate-300 px-1 py-1 text-center">{pageIndex * pageSize + index + 1}</td>
                  <td className="break-words border border-slate-300 px-1 py-1">
                    {student.nis || '—'}<br />{student.nisn || '—'}
                  </td>
                  <td className="break-words border border-slate-300 px-1 py-1 font-semibold">{student.name}</td>
                  <td className="border border-slate-300 px-1 py-1">{genderLabel(student.gender)}</td>
                  <td className="border border-slate-300 px-1 py-1">{formatDate(student.birthDate)}</td>
                  <td className="break-words border border-slate-300 px-1 py-1">{student.phone || '—'}</td>
                  <td className="break-words border border-slate-300 px-1 py-1">
                    {guardians.map((guardian) => guardian.name + (guardian.primary ? ' (Utama)' : '')).join(', ') || '—'}
                  </td>
                  <td className="border border-slate-300 px-1 py-1">
                    {guardians.map((guardian) => guardian.relation).join(', ') || '—'}
                  </td>
                  <td className="break-words border border-slate-300 px-1 py-1">
                    {guardians.map((guardian) =>
                      [guardian.phone, guardian.email, guardian.address]
                        .filter((value) => value !== '—')
                        .join(' / '),
                    ).join('; ') || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ));
  });

  function downloadStudentExcel() {
    if (!selectedGroups.length) return;
    const header = [
      'Tahun Ajaran', 'Kelas', 'No', 'NIS', 'NISN', 'Nama Lengkap',
      'Jenis Kelamin', 'Tanggal Lahir', 'Telepon Siswa', 'Status Siswa',
      'Nama Wali', 'Hubungan', 'Wali Utama', 'Telepon Wali', 'Email Wali', 'Alamat Wali',
    ];
    const rows = selectedGroups.flatMap((group) => group.students.flatMap((student, index) => {
      const guardians = getGuardians(student);
      const guardianRows = guardians.length ? guardians : [{
        name: '', relation: '', phone: '', email: '', address: '', primary: false,
      }];
      return guardianRows.map((guardian) => [
        schoolYearName, group.name, index + 1, student.nis || '', student.nisn || '',
        student.name, genderLabel(student.gender), formatDate(student.birthDate),
        student.phone || '', student.isActive === false ? 'Tidak aktif' : 'Aktif',
        guardian.name, guardian.relation, guardian.primary ? 'Ya' : 'Tidak',
        guardian.phone, guardian.email, guardian.address,
      ]);
    }));
    const tableRows = [header, ...rows].map((row, rowIndex) => {
      const cells = row.map((value) =>
        '<td' + (rowIndex === 0 ? ' style="font-weight:bold;background:#e2e8f0"' : '') +
        '>' + escapeHtml(value) + '</td>',
      ).join('');
      return '<tr>' + cells + '</tr>';
    }).join('');
    const workbook = '<html><head><meta charset="utf-8"></head><body><table border="1"><tbody>' +
      tableRows + '</tbody></table></body></html>';
    const blob = new Blob(['\uFEFF' + workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'daftar-siswa-' + new Date().toISOString().slice(0, 10) + '.xls';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-700">{audience === "tu" ? "Tata Usaha" : "Operator Sekolah"}</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-[var(--text)]">Daftar Siswa Aktif</h1>
          <p className="mt-1 text-sm text-muted">{schoolYearName} · {students.length.toLocaleString('id-ID')} siswa</p>
        </div>
        <Link className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-brand-300 hover:text-brand-700 dark:border-[var(--border)] dark:text-[var(--text)]" href={audience === "tu" ? "/tu/dashboard" : "/opsek/dashboard"}>Kembali ke Dashboard</Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama, NIS, atau NISN siswa…"
            value={search}
          />
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted">
            <span>{classGroups.reduce((total, group) => total + group.students.length, 0)} siswa · {classGroups.length} kelas</span>
            <button className="font-bold text-brand-700 hover:underline dark:text-brand-300" onClick={() => setSelectedClassKeys(classGroups.map((group) => group.key))} type="button">Pilih semua</button>
            <button className="font-bold hover:underline" onClick={() => setSelectedClassKeys([])} type="button">Hapus pilihan</button>
          </div>
        </div>

        {loadState === 'loading' ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-muted dark:bg-[var(--surface-soft)]">Memuat data siswa…</p> : null}
        {loadState === 'error' ? <p className="rounded-xl bg-rose-50 p-5 text-sm text-rose-700">Data siswa gagal dimuat. Silakan muat ulang halaman.</p> : null}
        {loadState === 'success' && classGroups.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-muted">Tidak ada siswa yang cocok dengan pencarian.</p> : null}

        {loadState === 'success' && classGroups.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {classGroups.map((group) => (
              <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-[var(--border)] dark:bg-[var(--surface-solid)]" key={group.key}>
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-[var(--border)]">
                  <label className="flex min-w-0 items-center gap-2">
                    <input
                      aria-label={'Pilih kelas ' + group.name + ' untuk preview'}
                      checked={selectedClassKeys.includes(group.key)}
                      className="h-4 w-4 shrink-0 accent-blue-600"
                      onChange={(event) => setSelectedClassKeys((current) =>
                        event.target.checked ? [...current, group.key] : current.filter((key) => key !== group.key),
                      )}
                      type="checkbox"
                    />
                    <h2 className="truncate text-sm font-black text-slate-900 dark:text-[var(--text)]">{group.name}</h2>
                  </label>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{group.students.length}</span>
                </div>
                <ol className="space-y-2">
                  {group.students.map((student, index) => (
                    <li className="flex min-w-0 items-start gap-2 text-xs" key={student.id}>
                      <span className="w-5 shrink-0 text-right tabular-nums text-muted">{index + 1}.</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-slate-800 dark:text-[var(--text-soft)]">{student.name}</span>
                        <span className="block truncate text-[11px] text-muted">{student.nis || 'NIS —'}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-[var(--border)]">
          <p className="text-xs text-muted">{selectedGroups.length} kelas dipilih untuk dokumen.</p>
          <button
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!selectedGroups.length || loadState !== 'success'}
            onClick={() => setShowPreview(true)}
            type="button"
          >
            Preview {selectedGroups.length ? '(' + selectedGroups.length + ' kelas)' : ''}
          </button>
        </div>
      </section>

      {showPreview ? (
        <PrintPreview
          footerText="Dokumen administrasi sekolah"
          onClose={() => setShowPreview(false)}
          onDownloadExcel={downloadStudentExcel}
          paperId="tu-active-students-print-paper"
          pages={previewPages}
          paperSize="A4_LANDSCAPE"
          title="Daftar Siswa Aktif"
        />
      ) : null}
    </main>
  );
}
