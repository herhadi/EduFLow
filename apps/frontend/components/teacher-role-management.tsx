'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, type SchoolClass, type Subject, type Teacher } from '../lib/api';
import { useToast } from './ui/toast';

type LoadState = 'idle' | 'loading' | 'success' | 'error';
type SaveState = 'idle' | 'loading' | 'success' | 'error';

const assignableRoles = [
  { value: 'kepala_sekolah', label: 'Kepala Sekolah' },
  { value: 'operator_sekolah', label: 'Operator Sekolah' },
  { value: 'guru', label: 'Guru' },
  { value: 'wali_kelas', label: 'Wali Kelas' },
  { value: 'bk', label: 'Guru BK' },
  { value: 'tu', label: 'TU' },
];

function toUsername(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
    .slice(0, 32);
}

function normalizeTeacherRoles(roles: string[]) {
  const uniqueRoles = [...new Set(roles)];

  if (uniqueRoles.includes('wali_kelas') && !uniqueRoles.includes('guru')) {
    return [...uniqueRoles, 'guru'];
  }

  return uniqueRoles;
}

export function TeacherRoleManagement() {
  const toast = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['guru']);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedHomeroomClassIds, setSelectedHomeroomClassIds] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoadState('loading');

      try {
        const [teacherResponse, subjectResponse, classResponse] = await Promise.all([
          api.getTeachers(),
          api.getSubjects(),
          api.getClasses(),
        ]);

        if (!isMounted) {
          return;
        }

        setTeachers(teacherResponse.data);
        setSubjects(subjectResponse.data);
        setClasses(classResponse.data);
        setSelectedTeacherId(teacherResponse.data[0]?.id ?? '');
        setLoadState('success');
      } catch {
        if (isMounted) {
          setLoadState('error');
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => teacher.id === selectedTeacherId),
    [selectedTeacherId, teachers],
  );

  useEffect(() => {
    if (!selectedTeacher) {
      return;
    }

    setUsername(selectedTeacher.user?.username ?? toUsername(selectedTeacher.name));
    setEmail(selectedTeacher.user?.email ?? selectedTeacher.email ?? '');
    setPassword('');
    setSelectedRoles(
      selectedTeacher.user?.roles.map(({ role }) => role.name) ?? ['guru'],
    );
    setSelectedSubjectIds(
      selectedTeacher.subjects?.map(({ subject }) => subject.id) ?? [],
    );
    setSelectedHomeroomClassIds(
      classes
        .filter((schoolClass) => schoolClass.homeroomTeacherId === selectedTeacher.id)
        .map((schoolClass) => schoolClass.id),
    );
    setMessage('');
    setSaveState('idle');
  }, [classes, selectedTeacher]);

  function toggleRole(role: string) {
    setSelectedRoles((currentRoles) =>
      normalizeTeacherRoles(
        currentRoles.includes(role)
          ? currentRoles.filter((currentRole) => currentRole !== role)
          : [...currentRoles, role],
      ),
    );
  }

  function toggleSubject(subjectId: string) {
    setSelectedSubjectIds((currentSubjectIds) =>
      currentSubjectIds.includes(subjectId)
        ? currentSubjectIds.filter((currentSubjectId) => currentSubjectId !== subjectId)
        : [...currentSubjectIds, subjectId],
    );
  }

  function toggleHomeroomClass(classId: string) {
    setSelectedHomeroomClassIds((currentClassIds) => {
      const nextClassIds = currentClassIds.includes(classId)
        ? currentClassIds.filter((currentClassId) => currentClassId !== classId)
        : [...currentClassIds, classId];

      if (nextClassIds.length) {
        setSelectedRoles((currentRoles) =>
          normalizeTeacherRoles([...currentRoles, 'wali_kelas']),
        );
      }

      return nextClassIds;
    });
  }

  async function handleSave() {
    if (!selectedTeacher) {
      return;
    }

    setSaveState('loading');
    setMessage('');

    try {
      await api.configureTeacherAccount(selectedTeacher.id, {
        username,
        email: email || undefined,
        password: password || undefined,
        roles: normalizeTeacherRoles(selectedRoles.length ? selectedRoles : ['guru']),
      });
      await api.setTeacherSubjects(selectedTeacher.id, selectedSubjectIds);
      await Promise.all(
        classes.map((schoolClass) => {
          const shouldAssign = selectedHomeroomClassIds.includes(schoolClass.id);
          const currentlyAssigned =
            schoolClass.homeroomTeacherId === selectedTeacher.id;

          if (shouldAssign && !currentlyAssigned) {
            return api.setClassHomeroomTeacher(schoolClass.id, selectedTeacher.id);
          }

          if (!shouldAssign && currentlyAssigned) {
            return api.setClassHomeroomTeacher(schoolClass.id, null);
          }

          return Promise.resolve();
        }),
      );
      const [teacherResponse, classResponse] = await Promise.all([
        api.getTeachers(),
        api.getClasses(),
      ]);
      setTeachers(teacherResponse.data);
      setClasses(classResponse.data);
      setSaveState('success');
      setMessage('Pengaturan guru berhasil disimpan.');
      toast.success('Pengaturan guru berhasil disimpan.', 'Berhasil');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Gagal menyimpan: ${error.message}`
          : 'Gagal menyimpan pengaturan guru.';
      setSaveState('error');
      setMessage(errorMessage);
      toast.error(errorMessage, 'Aksi Gagal');
    }
  }

  return (
    <section className="mt-6 rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
            Pengaturan Guru
          </p>
          <h2 className="mt-1 text-2xl font-black text-ink">Role, Mapel, dan Wali Kelas</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Guru mapel belum tentu wali kelas. Wali kelas adalah tugas tambahan dan wajib tetap guru mapel.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
          {loadState === 'loading' ? 'Memuat' : `${teachers.length} guru`}
        </span>
      </div>

      {loadState === 'error' ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Data guru/mapel belum bisa dimuat. Pastikan backend berjalan dan root sudah login.
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="rounded-[1.5rem] border border-blue-50 bg-slate-50 p-3">
          <p className="px-2 text-xs font-black text-muted">Pilih Guru</p>
          <div className="mt-3 grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
            {teachers.map((teacher) => {
              const active = teacher.id === selectedTeacherId;
              const roles = teacher.user?.roles.map(({ role }) => role.name).join(', ');
              const subjectNames = teacher.subjects
                ?.map(({ subject }) => subject.name)
                .join(', ');

              return (
                <button
                  className={[
                    'rounded-2xl border p-3 text-left transition',
                    active
                      ? 'border-brand-600 bg-brand-600 text-white shadow-lg shadow-blue-100'
                      : 'border-blue-100 bg-white text-slate-700 hover:bg-brand-50',
                  ].join(' ')}
                  key={teacher.id}
                  onClick={() => setSelectedTeacherId(teacher.id)}
                  type="button"
                >
                  <p className="font-black">{teacher.name}</p>
                  <p className={['mt-1 text-xs font-semibold', active ? 'text-blue-100' : 'text-muted'].join(' ')}>
                    {roles || 'Belum ada akun'}
                  </p>
                <p className={['mt-1 line-clamp-2 text-xs', active ? 'text-blue-100' : 'text-muted'].join(' ')}>
                  {subjectNames || 'Mapel belum diatur'}
                </p>
                <p className={['mt-1 line-clamp-2 text-xs', active ? 'text-blue-100' : 'text-muted'].join(' ')}>
                  Wali: {classes
                    .filter((schoolClass) => schoolClass.homeroomTeacherId === teacher.id)
                    .map((schoolClass) => schoolClass.name)
                    .join(', ') || '-'}
                </p>
                </button>
              );
            })}

            {!teachers.length ? (
              <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-muted">
                Belum ada data guru aktif.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-blue-50 bg-slate-50 p-4">
          {selectedTeacher ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-black text-brand-700">Guru Terpilih</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">{selectedTeacher.name}</h3>
                <p className="mt-1 text-xs font-semibold text-muted">
                  NIP: {selectedTeacher.nip ?? '-'} · HP: {selectedTeacher.phone ?? '-'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Username Login
                  <input
                    className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-brand-600"
                    onChange={(event) => setUsername(event.target.value)}
                    value={username}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Email Login
                  <input
                    className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-brand-600"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="opsional"
                    type="email"
                    value={email}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
                  Password Sementara
                  <span className="flex overflow-hidden rounded-2xl border border-blue-100 bg-white transition focus-within:border-brand-600">
                    <input
                      className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-normal outline-none"
                      maxLength={10}
                      minLength={6}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={
                        selectedTeacher.user
                          ? 'Kosongkan jika tidak diubah'
                          : 'Kosongkan: default 123456'
                      }
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                    />
                    <button
                      className="px-4 text-xs font-black text-brand-700"
                      onClick={() => setShowPassword((current) => !current)}
                      type="button"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </span>
                </label>
              </div>

              <div>
                <p className="text-sm font-black text-slate-800">Role Akun</p>
                <p className="mt-1 text-xs font-semibold text-muted">
                  Jika memilih Wali Kelas, role Guru otomatis ikut karena wali kelas pasti guru mapel.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {assignableRoles.map((role) => {
                    const active = selectedRoles.includes(role.value);

                    return (
                      <button
                        className={[
                          'rounded-full border px-3 py-2 text-xs font-black transition',
                          active
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-blue-100 bg-white text-brand-700 hover:bg-brand-50',
                        ].join(' ')}
                        key={role.value}
                        onClick={() => toggleRole(role.value)}
                        type="button"
                      >
                        {role.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-black text-slate-800">Mata Pelajaran Diampu</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {subjects.map((subject) => {
                    const active = selectedSubjectIds.includes(subject.id);

                    return (
                      <button
                        className={[
                          'rounded-full border px-3 py-2 text-xs font-black transition',
                          active
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-blue-100 bg-white text-slate-700 hover:bg-brand-50',
                        ].join(' ')}
                        key={subject.id}
                        onClick={() => toggleSubject(subject.id)}
                        type="button"
                      >
                        {subject.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-black text-slate-800">Kelas Binaan Wali Kelas</p>
                <p className="mt-1 text-xs font-semibold text-muted">
                  Kosongkan jika guru ini bukan wali kelas.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {classes.map((schoolClass) => {
                    const active = selectedHomeroomClassIds.includes(schoolClass.id);
                    const assignedToOtherTeacher =
                      schoolClass.homeroomTeacherId &&
                      schoolClass.homeroomTeacherId !== selectedTeacher.id;

                    return (
                      <button
                        className={[
                          'rounded-full border px-3 py-2 text-xs font-black transition',
                          active
                            ? 'border-amber-500 bg-amber-500 text-white'
                            : assignedToOtherTeacher
                              ? 'border-slate-200 bg-slate-100 text-slate-400'
                              : 'border-blue-100 bg-white text-slate-700 hover:bg-brand-50',
                        ].join(' ')}
                        disabled={Boolean(assignedToOtherTeacher)}
                        key={schoolClass.id}
                        onClick={() => toggleHomeroomClass(schoolClass.id)}
                        type="button"
                      >
                        {schoolClass.name}
                        {assignedToOtherTeacher
                          ? ` · ${schoolClass.homeroomTeacher?.name ?? 'sudah ada wali'}`
                          : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {message ? (
                <div
                  className={[
                    'rounded-2xl border p-4 text-sm font-semibold',
                    saveState === 'success'
                      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-900',
                  ].join(' ')}
                >
                  {message}
                </div>
              ) : null}

              <button
                className="w-full rounded-2xl bg-brand-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-blue-100 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={saveState === 'loading' || !username.trim() || !selectedRoles.length}
                onClick={() => void handleSave()}
                type="button"
              >
                {saveState === 'loading' ? 'Menyimpan...' : 'Simpan Pengaturan Guru'}
              </button>
            </div>
          ) : (
            <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-muted">
              Pilih guru terlebih dahulu.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
