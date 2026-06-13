'use client';

import { sortSchoolClasses } from '@eduflow/shared';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  api,
  type SchoolClass,
  type SchoolYear,
  type Subject,
} from '../lib/api';
import { useToast } from './ui/toast';

type LoadState = 'loading' | 'success' | 'error';

const grades = ['VII', 'VIII', 'IX'];

export function AcademicMasterManagement() {
  const toast = useToast();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isSaving, setIsSaving] = useState(false);
  const [classForm, setClassForm] = useState({
    schoolYearId: '',
    grade: 'VII',
    suffix: '',
  });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '' });

  async function loadData() {
    setLoadState('loading');

    try {
      const [classResponse, subjectResponse, yearResponse] = await Promise.all([
        api.getClasses(),
        api.getSubjects(),
        api.getSchoolYears(),
      ]);
      setClasses(sortSchoolClasses(classResponse.data));
      setSubjects(subjectResponse.data);
      setSchoolYears(yearResponse.data);
      setClassForm((current) => ({
        ...current,
        schoolYearId: current.schoolYearId || yearResponse.data[0]?.id || '',
      }));
      setLoadState('success');
    } catch {
      setLoadState('error');
      toast.error('Data kelas dan mapel gagal dimuat.', 'Koneksi Gagal');
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const groupedClasses = useMemo(
    () =>
      grades.map((grade) => ({
        grade,
        classes: sortSchoolClasses(
          classes.filter((schoolClass) => schoolClass.grade === grade),
        ),
      })),
    [classes],
  );

  async function handleCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const suffix = classForm.suffix.trim().toUpperCase();

    if (!classForm.schoolYearId || !suffix) {
      toast.warning('Pilih tahun ajaran dan isi rombel, misalnya A.', 'Data Belum Lengkap');
      return;
    }

    setIsSaving(true);

    try {
      const name = `${classForm.grade}-${suffix}`;
      const response = await api.createClass({
        schoolYearId: classForm.schoolYearId,
        grade: classForm.grade,
        name,
        code: `${classForm.grade}${suffix}`,
      });
      setClasses((current) => sortSchoolClasses([...current, response.data]));
      setClassForm((current) => ({ ...current, suffix: '' }));
      toast.success(response.message ?? `${name} berhasil ditambahkan.`, 'Kelas Ditambahkan');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Gagal menambahkan kelas.',
        'Aksi Gagal',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteClass(schoolClass: SchoolClass) {
    if (!window.confirm(`Hapus kelas ${schoolClass.name}?`)) {
      return;
    }

    try {
      const response = await api.deleteClass(schoolClass.id);
      setClasses((current) => current.filter((item) => item.id !== schoolClass.id));
      toast.success(response.message ?? 'Kelas berhasil dihapus.', 'Kelas Dihapus');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Gagal menghapus kelas.',
        'Aksi Gagal',
      );
    }
  }

  async function handleCreateSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!subjectForm.name.trim()) {
      toast.warning('Nama mata pelajaran wajib diisi.', 'Data Belum Lengkap');
      return;
    }

    setIsSaving(true);

    try {
      const response = await api.createSubject({
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim().toUpperCase() || undefined,
      });
      setSubjects((current) => [...current, response.data]);
      setSubjectForm({ name: '', code: '' });
      toast.success(response.message ?? 'Mapel berhasil ditambahkan.', 'Mapel Ditambahkan');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Gagal menambahkan mapel.',
        'Aksi Gagal',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSubject(subject: Subject) {
    if (!window.confirm(`Hapus mata pelajaran ${subject.name}?`)) {
      return;
    }

    try {
      const response = await api.deleteSubject(subject.id);
      setSubjects((current) => current.filter((item) => item.id !== subject.id));
      toast.success(response.message ?? 'Mapel berhasil dihapus.', 'Mapel Dihapus');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Gagal menghapus mapel.',
        'Aksi Gagal',
      );
    }
  }

  if (loadState === 'error') {
    return (
      <div className="mt-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Data akademik belum bisa dimuat. Pastikan backend berjalan dan login masih aktif.
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <section className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">Rombongan Belajar</p>
        <h2 className="mt-1 text-2xl font-black text-ink">Manajemen Kelas</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Jumlah kelas bebas menyesuaikan jumlah siswa. Tambah atau hapus rombel tanpa mengubah kode aplikasi.
        </p>

        <form className="mt-5 grid gap-3" onSubmit={handleCreateClass}>
          <select
            className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm font-bold outline-none focus:border-brand-600"
            onChange={(event) => setClassForm((current) => ({ ...current, schoolYearId: event.target.value }))}
            value={classForm.schoolYearId}
          >
            {schoolYears.map((year) => (
              <option key={year.id} value={year.id}>{year.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <select
              className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50/60 px-3 py-3 text-sm font-bold outline-none focus:border-brand-600"
              onChange={(event) => setClassForm((current) => ({ ...current, grade: event.target.value }))}
              value={classForm.grade}
            >
              {grades.map((grade) => <option key={grade}>{grade}</option>)}
            </select>
            <input
              className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm uppercase outline-none focus:border-brand-600"
              maxLength={3}
              onChange={(event) => setClassForm((current) => ({ ...current, suffix: event.target.value }))}
              placeholder="A"
              value={classForm.suffix}
            />
            <button
              className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white disabled:bg-slate-300"
              disabled={isSaving}
              type="submit"
            >
              Tambah
            </button>
          </div>
        </form>

        <div className="mt-5 space-y-4">
          {groupedClasses.map((group) => (
            <div key={group.grade}>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-800">Kelas {group.grade}</h3>
                <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-black text-brand-700">{group.classes.length}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.classes.map((schoolClass) => (
                  <div className="flex items-center justify-between gap-2 rounded-2xl border border-blue-50 bg-slate-50 p-3" key={schoolClass.id}>
                    <span className="truncate text-sm font-black text-slate-800">{schoolClass.name}</span>
                    <button
                      className="rounded-full bg-rose-50 px-2 py-1 text-xs font-black text-rose-700 hover:bg-rose-100"
                      onClick={() => void handleDeleteClass(schoolClass)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {!group.classes.length ? <p className="col-span-full text-xs font-semibold text-muted">Belum ada kelas.</p> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">Kurikulum</p>
        <h2 className="mt-1 text-2xl font-black text-ink">Manajemen Mata Pelajaran</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Daftar mapel bersifat fleksibel. Admin dapat menambah mapel lokal atau menghapus mapel yang belum dipakai.
        </p>

        <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_0.45fr_auto]" onSubmit={handleCreateSubject}>
          <input
            className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm outline-none focus:border-brand-600"
            onChange={(event) => setSubjectForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Nama mata pelajaran"
            value={subjectForm.name}
          />
          <input
            className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm uppercase outline-none focus:border-brand-600"
            onChange={(event) => setSubjectForm((current) => ({ ...current, code: event.target.value }))}
            placeholder="Kode"
            value={subjectForm.code}
          />
          <button
            className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white disabled:bg-slate-300"
            disabled={isSaving}
            type="submit"
          >
            Tambah
          </button>
        </form>

        <div className="mt-5 grid gap-2">
          {subjects.sort((a, b) => a.name.localeCompare(b.name)).map((subject) => (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-50 bg-slate-50 p-3" key={subject.id}>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">{subject.name}</p>
                <p className="mt-1 text-xs font-bold text-muted">{subject.code ?? 'Tanpa kode'}</p>
              </div>
              <button
                className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                onClick={() => void handleDeleteSubject(subject)}
                type="button"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
