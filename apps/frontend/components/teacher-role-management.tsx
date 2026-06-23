'use client';

import { sortSchoolClasses } from '@eduflow/shared';
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api, type SchoolClass, type SchoolYear, type Subject, type Teacher, type TeacherAssignmentStatus, type TeacherSchoolYearAssignment } from '../lib/api';
import { getUpcomingSchoolYear } from '../lib/school-year';
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

const assignmentStatusMeta: Record<TeacherAssignmentStatus, { label: string; cardClass: string; textClass: string }> = {
  ACTIVE: {
    label: 'Aktif mengajar',
    cardClass: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100',
    textClass: 'text-emerald-800',
  },
  ON_LEAVE: {
    label: 'Cuti',
    cardClass: 'border-amber-200 bg-amber-50 hover:bg-amber-100',
    textClass: 'text-amber-900',
  },
  RETIRED: {
    label: 'Pensiun',
    cardClass: 'border-rose-200 bg-rose-50 hover:bg-rose-100',
    textClass: 'text-rose-800',
  },
  TRANSFERRED: {
    label: 'Pindah sekolah',
    cardClass: 'border-sky-200 bg-sky-50 hover:bg-sky-100',
    textClass: 'text-sky-800',
  },
  INACTIVE: {
    label: 'Tidak ditugaskan',
    cardClass: 'border-slate-200 bg-slate-100 hover:bg-slate-200',
    textClass: 'text-slate-700',
  },
};

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

function getEffectiveAssignment(
  assignments: TeacherSchoolYearAssignment[] | undefined,
  schoolYear?: SchoolYear,
) {
  if (!schoolYear) return undefined;

  return (assignments ?? [])
    .filter((assignment) =>
      assignment.schoolYear?.startsAt &&
      new Date(assignment.schoolYear.startsAt) <= new Date(schoolYear.startsAt),
    )
    .sort((first, second) =>
      new Date(second.schoolYear?.startsAt ?? 0).getTime() - new Date(first.schoolYear?.startsAt ?? 0).getTime(),
    )[0];
}

export function TeacherRoleManagement() {
  const toast = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherSchoolYearAssignment[]>([]);
  const [assignmentSchoolYearId, setAssignmentSchoolYearId] = useState('');
  const [assignmentStatus, setAssignmentStatus] = useState<TeacherAssignmentStatus>('ACTIVE');
  const [assignmentSubjectIds, setAssignmentSubjectIds] = useState<string[]>([]);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['guru']);
  const [selectedHomeroomClassIds, setSelectedHomeroomClassIds] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [identity, setIdentity] = useState({ name: '', nip: '', nuptk: '', phone: '', email: '', photoUrl: '' });
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState('');
  const detailCardRef = useRef<HTMLDivElement>(null);
  const [detailCardHeight, setDetailCardHeight] = useState<number>();
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    nip: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoadState('loading');

      try {
        const [teacherResponse, subjectResponse, classResponse, schoolYearResponse] = await Promise.all([
          api.getTeachers(),
          api.getSubjects(),
          api.getClasses(),
          api.getSchoolYears(),
        ]);

        if (!isMounted) {
          return;
        }

        setTeachers(teacherResponse.data);
        setSubjects(subjectResponse.data);
        setClasses(sortSchoolClasses(classResponse.data));
        setSchoolYears(schoolYearResponse.data);
        setAssignmentSchoolYearId(getUpcomingSchoolYear(schoolYearResponse.data)?.id ?? '');
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
    setIdentity({
      name: selectedTeacher.name,
      nip: selectedTeacher.nip ?? '',
      nuptk: selectedTeacher.nuptk ?? '',
      phone: selectedTeacher.phone ?? '',
      email: selectedTeacher.email ?? '',
      photoUrl: selectedTeacher.photoUrl ?? '',
    });
    setSelectedRoles(
      selectedTeacher.user?.roles.map(({ role }) => role.name) ?? ['guru'],
    );
    setSelectedHomeroomClassIds(
      classes
        .filter((schoolClass) => schoolClass.homeroomTeacherId === selectedTeacher.id)
        .map((schoolClass) => schoolClass.id),
    );
    setMessage('');
    setSaveState('idle');
  }, [classes, selectedTeacher]);

  useEffect(() => {
    if (!selectedTeacherId) return;
    void api.getTeacherSchoolYearAssignments(selectedTeacherId)
      .then((response) => setTeacherAssignments(response.data))
      .catch(() => setTeacherAssignments([]));
  }, [selectedTeacherId]);

  useEffect(() => {
    const targetSchoolYear = schoolYears.find((item) => item.id === assignmentSchoolYearId);
    const assignment = teacherAssignments
      .filter((item) =>
        targetSchoolYear && item.schoolYear?.startsAt && new Date(item.schoolYear.startsAt) <= new Date(targetSchoolYear.startsAt),
      )
      .sort((first, second) =>
        new Date(second.schoolYear?.startsAt ?? 0).getTime() - new Date(first.schoolYear?.startsAt ?? 0).getTime(),
      )[0];
    setAssignmentStatus(assignment?.status ?? 'ACTIVE');
    setAssignmentSubjectIds(assignment?.subjects.map(({ subject }) => subject.id) ?? []);
    setAssignmentNotes(assignment?.notes ?? '');
  }, [assignmentSchoolYearId, schoolYears, teacherAssignments]);

  useEffect(() => {
    const detailCard = detailCardRef.current;
    const desktopMedia = window.matchMedia('(min-width: 1024px)');

    if (!detailCard || !desktopMedia.matches) {
      setDetailCardHeight(undefined);
      return;
    }

    const syncHeight = () => setDetailCardHeight(detailCard.offsetHeight);
    const observer = new ResizeObserver(syncHeight);
    syncHeight();
    observer.observe(detailCard);

    return () => observer.disconnect();
  }, [selectedTeacherId]);

  function toggleRole(role: string) {
    setSelectedRoles((currentRoles) =>
      normalizeTeacherRoles(
        currentRoles.includes(role)
          ? currentRoles.filter((currentRole) => currentRole !== role)
          : [...currentRoles, role],
      ),
    );
  }

  function toggleAssignmentSubject(subjectId: string) {
    setAssignmentSubjectIds((currentSubjectIds) =>
      currentSubjectIds.includes(subjectId)
        ? currentSubjectIds.filter((currentSubjectId) => currentSubjectId !== subjectId)
        : [...currentSubjectIds, subjectId],
    );
  }

  async function saveTeacherSchoolYearAssignment() {
    if (!selectedTeacher || !assignmentSchoolYearId) return;
    try {
      const response = await api.setTeacherSchoolYearAssignment(selectedTeacher.id, assignmentSchoolYearId, {
        status: assignmentStatus,
        subjectIds: assignmentSubjectIds,
        notes: assignmentNotes || undefined,
      });
      setTeacherAssignments((current) => [
        ...current.filter((item) => item.schoolYearId !== assignmentSchoolYearId),
        response.data,
      ]);
      toast.success(response.message ?? 'Penugasan tahun ajaran disimpan.', 'Riwayat Guru');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Penugasan tahun ajaran gagal disimpan.', 'Riwayat Guru');
    }
  }

  async function resetTeacherPassword() {
    if (!selectedTeacher?.user) return;
    if (!window.confirm(`Reset password ${selectedTeacher.name} ke password default? Sesi aktifnya akan dikeluarkan.`)) return;

    try {
      const response = await api.resetTeacherPassword(selectedTeacher.id);
      toast.success(response.message ?? 'Password guru berhasil direset.', 'Reset Password');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reset password gagal.', 'Reset Password');
    }
  }

  function toggleHomeroomClass(classId: string) {
    setSelectedHomeroomClassIds((currentClassIds) => {
      const nextClassIds = currentClassIds.includes(classId)
        ? []
        : [classId];

      if (nextClassIds.length) {
        setSelectedRoles((currentRoles) =>
          normalizeTeacherRoles([...currentRoles, 'wali_kelas']),
        );
      } else {
        setSelectedRoles((currentRoles) =>
          currentRoles.filter((currentRole) => currentRole !== 'wali_kelas'),
        );
      }

      return nextClassIds;
    });
  }

  function clearHomeroomClasses() {
    setSelectedHomeroomClassIds([]);
    setSelectedRoles((currentRoles) =>
      currentRoles.filter((currentRole) => currentRole !== 'wali_kelas'),
    );
  }

  async function handleSave() {
    if (!selectedTeacher) {
      return;
    }

    setSaveState('loading');
    setMessage('');

    try {
      await api.updateTeacher(selectedTeacher.id, {
        name: identity.name,
        nip: identity.nip || undefined,
        nuptk: identity.nuptk || undefined,
        phone: identity.phone || undefined,
        email: identity.email || undefined,
        photoUrl: identity.photoUrl || undefined,
      });
      await api.configureTeacherAccount(selectedTeacher.id, {
        username,
        email: email || undefined,
        roles: normalizeTeacherRoles(selectedRoles.length ? selectedRoles : ['guru']),
      });
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
      setClasses(sortSchoolClasses(classResponse.data));
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

  async function handleCreateTeacher() {
    if (!newTeacher.name.trim()) return;

    setSaveState('loading');
    try {
      const response = await api.createTeacher({
        name: newTeacher.name.trim(),
        nip: newTeacher.nip.trim() || undefined,
        phone: newTeacher.phone.trim() || undefined,
        email: newTeacher.email.trim() || undefined,
      });
      setTeachers((currentTeachers) =>
        [...currentTeachers, response.data].sort((a, b) => a.name.localeCompare(b.name)),
      );
      selectTeacher(response.data.id);
      setNewTeacher({ name: '', nip: '', phone: '', email: '' });
      setShowCreateTeacher(false);
      setSaveState('success');
      toast.success('Guru berhasil ditambahkan.', 'Berhasil');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Guru gagal ditambahkan.';
      setSaveState('error');
      toast.error(errorMessage, 'Aksi Gagal');
    }
  }

  function selectTeacher(teacherId: string) {
    setSelectedTeacherId(teacherId);

    if (window.matchMedia('(max-width: 1023px)').matches) {
      window.requestAnimationFrame(() => {
        detailCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
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

      <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div
          className="flex flex-col rounded-[1.5rem] border border-blue-50 bg-slate-50 p-3 lg:h-[var(--detail-card-height)] lg:min-h-0 lg:overflow-hidden"
          style={
            {
              '--detail-card-height': detailCardHeight
                ? `${detailCardHeight}px`
                : 'auto',
            } as CSSProperties
          }
        >
          <div className="flex items-center justify-between gap-3 px-2">
            <p className="text-xs font-black text-muted">Pilih Guru</p>
            <button
              className="rounded-full bg-brand-600 px-3 py-2 text-xs font-black text-white"
              onClick={() => setShowCreateTeacher((current) => !current)}
              type="button"
            >
              + Tambah Guru
            </button>
          </div>

          {showCreateTeacher ? (
            <div className="mt-3 grid gap-2 rounded-2xl border border-blue-100 bg-white p-3">
              {[
                ['name', 'Nama guru *'],
                ['nip', 'NIP'],
                ['phone', 'Nomor HP'],
                ['email', 'Email'],
              ].map(([field, placeholder]) => (
                <input
                  className="rounded-xl border border-blue-100 px-3 py-2 text-sm outline-none focus:border-brand-600"
                  key={field}
                  onChange={(event) =>
                    setNewTeacher((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  placeholder={placeholder}
                  type={field === 'email' ? 'email' : 'text'}
                  value={newTeacher[field as keyof typeof newTeacher]}
                />
              ))}
              <button
                className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300"
                disabled={saveState === 'loading' || !newTeacher.name.trim()}
                onClick={() => void handleCreateTeacher()}
                type="button"
              >
                Simpan Guru Baru
              </button>
            </div>
          ) : null}

          <div className="mt-3 grid content-start gap-2 pr-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
            {teachers.map((teacher) => {
              const active = teacher.id === selectedTeacherId;
              const assignment = getEffectiveAssignment(
                teacher.yearAssignments,
                schoolYears.find((schoolYear) => schoolYear.id === assignmentSchoolYearId),
              );
              const status = assignmentStatusMeta[assignment?.status ?? 'INACTIVE'];
              const roles = teacher.user?.roles.map(({ role }) => role.name).join(', ');
              const subjectNames = teacher.subjects
                ?.map(({ subject }) => subject.name)
                .join(', ');

              return (
                <button
                  className={[
                    'rounded-2xl border p-3 text-left transition',
                    active
                      ? `${status.cardClass} ring-2 ring-brand-600 ring-offset-1`
                      : status.cardClass,
                  ].join(' ')}
                  key={teacher.id}
                  onClick={() => selectTeacher(teacher.id)}
                  type="button"
                >
                  <p className="font-black text-slate-900">{teacher.name}</p>
                  <p className={['mt-1 text-xs font-black', status.textClass].join(' ')}>
                    {status.label}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {roles || 'Belum ada akun'}
                  </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">
                  {subjectNames || 'Mapel belum diatur'}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">
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

        <div
          className="scroll-mt-24 rounded-[1.5rem] border border-blue-50 bg-slate-50 p-4"
          ref={detailCardRef}
        >
          {selectedTeacher ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-black text-brand-700">Guru Terpilih</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">{selectedTeacher.name}</h3>
                <p className="mt-1 text-xs font-semibold text-muted">
                  NIP: {selectedTeacher.nip ?? '-'} · HP: {selectedTeacher.phone ?? '-'}
                </p>
              </div>

              <div>
                <p className="text-sm font-black text-slate-800">Identitas Guru</p>
                <p className="mt-1 text-xs font-semibold text-muted">Lengkapi atau koreksi data hasil import sebelum mengatur akun dan jadwal.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    ['name', 'Nama Lengkap'],
                    ['nip', 'NIP'],
                    ['nuptk', 'NUPTK'],
                    ['phone', 'Nomor HP'],
                    ['email', 'Email Guru'],
                  ].map(([field, label]) => (
                    <label className="grid gap-2 text-sm font-bold text-slate-700" key={field}>
                      {label}
                      <input
                        className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-brand-600"
                        onChange={(event) => setIdentity((current) => ({ ...current, [field]: event.target.value }))}
                        type={field === 'email' ? 'email' : 'text'}
                        value={identity[field as keyof typeof identity]}
                      />
                    </label>
                  ))}
                </div>
                <label className="mt-3 grid gap-2 text-sm font-bold text-slate-700">
                  Foto Guru
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-black file:text-brand-700"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast.warning('Foto guru maksimal 2 MB.', 'Foto Guru');
                        event.target.value = '';
                        return;
                      }
                      void api.uploadTeacherPhoto(selectedTeacher.id, file)
                        .then((response) => {
                          setIdentity((current) => ({ ...current, photoUrl: response.data.photoUrl ?? '' }));
                          setTeachers((current) => current.map((teacher) => teacher.id === selectedTeacher.id ? { ...teacher, photoUrl: response.data.photoUrl } : teacher));
                          toast.success(response.message ?? 'Foto guru berhasil diunggah.', 'Foto Guru');
                        })
                        .catch((error) => toast.error(error instanceof Error ? error.message : 'Upload foto guru gagal.', 'Foto Guru'));
                    }}
                    type="file"
                  />
                </label>
                {identity.photoUrl ? (
                  <img alt={`Foto ${selectedTeacher.name}`} className="mt-3 size-20 rounded-xl border border-blue-100 object-cover" src={identity.photoUrl} />
                ) : null}
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

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="text-sm font-black text-emerald-900">Riwayat Penugasan Tahun Ajaran</p>
                <p className="mt-1 text-xs font-semibold text-emerald-800">Menjadi acuan utama untuk jadwal tahun ajaran yang dipilih.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-bold text-slate-700">
                    Tahun ajaran
                    <select className="rounded-xl border border-emerald-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-emerald-600" onChange={(event) => setAssignmentSchoolYearId(event.target.value)} value={assignmentSchoolYearId}>
                      {schoolYears.map((schoolYear) => <option key={schoolYear.id} value={schoolYear.id}>{schoolYear.name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-bold text-slate-700">
                    Status penugasan
                    <select className="rounded-xl border border-emerald-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-emerald-600" onChange={(event) => setAssignmentStatus(event.target.value as TeacherAssignmentStatus)} value={assignmentStatus}>
                      <option value="ACTIVE">Aktif mengajar</option>
                      <option value="ON_LEAVE">Cuti</option>
                      <option value="TRANSFERRED">Pindah sekolah</option>
                      <option value="RETIRED">Pensiun</option>
                      <option value="INACTIVE">Tidak ditugaskan</option>
                    </select>
                  </label>
                </div>
                <p className="mt-4 text-xs font-black text-slate-700">Mapel ampu pada tahun ajaran ini</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {subjects.map((subject) => {
                    const active = assignmentSubjectIds.includes(subject.id);
                    return (
                      <button
                        className={[
                          'rounded-full border px-3 py-2 text-xs font-black transition',
                          active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-emerald-200 bg-white text-slate-700 hover:bg-emerald-100',
                        ].join(' ')}
                        key={subject.id}
                        onClick={() => toggleAssignmentSubject(subject.id)}
                        type="button"
                      >
                        {subject.name}
                      </button>
                    );
                  })}
                </div>
                <label className="mt-4 grid gap-1 text-sm font-bold text-slate-700">
                  Catatan riwayat
                  <input className="rounded-xl border border-emerald-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-emerald-600" onChange={(event) => setAssignmentNotes(event.target.value)} placeholder="Contoh: pensiun per 1 Juli 2027" value={assignmentNotes} />
                </label>
                <button className="mt-4 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-300" disabled={!assignmentSchoolYearId} onClick={() => void saveTeacherSchoolYearAssignment()} type="button">Simpan Penugasan Tahun Ajaran</button>
              </div>

              <div>
                <p className="text-sm font-black text-slate-800">Kelas Binaan Wali Kelas</p>
                <p className="mt-1 text-xs font-semibold text-muted">
                  Klik kelas aktif untuk mengosongkan/default. Pilih kelas lain untuk mengganti sebelum simpan.
                </p>
                {selectedHomeroomClassIds.length ? (
                  <button
                    className="mt-3 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800"
                    onClick={clearHomeroomClasses}
                    type="button"
                  >
                    Kosongkan wali kelas
                  </button>
                ) : null}
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
                        {active ? ' · aktif, klik untuk kosongkan' : ''}
                        {assignedToOtherTeacher
                          ? ` · ${schoolClass.homeroomTeacher?.name ?? 'sudah ada wali'}`
                          : ''}
                      </button>
                    );
                  })}

                  {!classes.length ? (
                    <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-900">
                      Data kelas belum tersedia atau belum berhasil dimuat. Cek
                      halaman `/admin/akademik` untuk memastikan kelas sudah ada,
                      lalu refresh halaman ini.
                    </div>
                  ) : null}
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

              {selectedTeacher.user ? (
                <button
                  className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900 hover:bg-amber-100"
                  onClick={() => void resetTeacherPassword()}
                  type="button"
                >
                  Reset Password ke Default
                </button>
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
