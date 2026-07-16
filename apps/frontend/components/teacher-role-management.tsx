'use client';

import { sortSchoolClasses } from '@eduflow/shared';
import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api, type SchoolClass, type SchoolYear, type Subject, type Teacher, type TeacherAssignmentStatus, type TeacherSchoolYearAssignment } from '../lib/api';
import { getUpcomingSchoolYear } from '../lib/school-year';
import { TeacherAccountRolePanel } from './teacher-role-management/teacher-account-role-panel';
import { TeacherAssignmentPanel } from './teacher-role-management/teacher-assignment-panel';
import { TeacherDetailActions } from './teacher-role-management/teacher-detail-actions';
import { TeacherHomeroomPanel } from './teacher-role-management/teacher-homeroom-panel';
import { TeacherIdentityAccountPanel } from './teacher-role-management/teacher-identity-account-panel';
import { TeacherListPanel } from './teacher-role-management/teacher-list-panel';
import {
  emptyNewTeacherForm,
  getTeacherAccountDraft,
  getTeacherAssignmentDraft,
  getTeacherHomeroomClassIds,
  getTeacherIdentityDraft,
  normalizeTeacherRoles,
  toggleStringSelection,
  type NewTeacherForm,
  type TeacherIdentity,
} from './teacher-role-management/teacher-role-management-utils';
import { useToast } from './ui/toast';

type LoadState = 'idle' | 'loading' | 'success' | 'error';
type SaveState = 'idle' | 'loading' | 'success' | 'error';

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
  const [identity, setIdentity] = useState<TeacherIdentity>({
    name: '',
    nip: '',
    nuptk: '',
    phone: '',
    email: '',
    photoUrl: '',
  });
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState('');
  const detailCardRef = useRef<HTMLDivElement>(null);
  const [detailCardHeight, setDetailCardHeight] = useState<number>();
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [newTeacher, setNewTeacher] = useState<NewTeacherForm>(emptyNewTeacherForm);

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

    const accountDraft = getTeacherAccountDraft(selectedTeacher);

    setUsername(accountDraft.username);
    setEmail(accountDraft.email);
    setIdentity(getTeacherIdentityDraft(selectedTeacher));
    setSelectedRoles(accountDraft.roles);
    setSelectedHomeroomClassIds(getTeacherHomeroomClassIds(classes, selectedTeacher.id));
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
    const assignmentDraft = getTeacherAssignmentDraft({
      assignmentSchoolYearId,
      schoolYears,
      selectedTeacher,
      teacherAssignments,
    });

    setAssignmentStatus(assignmentDraft.status);
    setAssignmentSubjectIds(assignmentDraft.subjectIds);
    setAssignmentNotes(assignmentDraft.notes);
  }, [assignmentSchoolYearId, schoolYears, selectedTeacher, teacherAssignments]);

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
      normalizeTeacherRoles(toggleStringSelection(currentRoles, role)),
    );
  }

  function toggleAssignmentSubject(subjectId: string) {
    setAssignmentSubjectIds((currentSubjectIds) =>
      toggleStringSelection(currentSubjectIds, subjectId),
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
      setNewTeacher(emptyNewTeacherForm);
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

  function handleTeacherPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    if (!selectedTeacher) return;

    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.warning('Foto guru maksimal 2 MB.', 'Foto Guru');
      event.target.value = '';
      return;
    }

    void api.uploadTeacherPhoto(selectedTeacher.id, file)
      .then((response) => {
        setIdentity((current) => ({
          ...current,
          photoUrl: response.data.photoUrl ?? '',
        }));
        setTeachers((current) =>
          current.map((teacher) =>
            teacher.id === selectedTeacher.id
              ? { ...teacher, photoUrl: response.data.photoUrl }
              : teacher,
          ),
        );
        toast.success(response.message ?? 'Foto guru berhasil diunggah.', 'Foto Guru');
      })
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : 'Upload foto guru gagal.',
          'Foto Guru',
        ),
      );
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
    <section className="surface-card mt-6 min-w-0 rounded-[2rem] p-4 sm:p-6">
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
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700 dark:bg-blue-500/15 dark:text-blue-100">
          {loadState === 'loading' ? 'Memuat' : `${teachers.length} guru`}
        </span>
      </div>

      {loadState === 'error' ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100">
          Data guru/mapel belum bisa dimuat. Pastikan backend berjalan dan root sudah login.
        </div>
      ) : null}

      <div className="mt-5 grid min-w-0 items-stretch gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <TeacherListPanel
          assignmentSchoolYearId={assignmentSchoolYearId}
          classes={classes}
          detailCardHeight={detailCardHeight}
          loadState={loadState}
          newTeacher={newTeacher}
          onCreateTeacher={handleCreateTeacher}
          onNewTeacherChange={(field, value) =>
            setNewTeacher((current) => ({ ...current, [field]: value }))
          }
          onSelectTeacher={selectTeacher}
          onToggleCreateTeacher={() => setShowCreateTeacher((current) => !current)}
          saveState={saveState}
          schoolYears={schoolYears}
          selectedTeacherId={selectedTeacherId}
          showCreateTeacher={showCreateTeacher}
          teachers={teachers}
        />

        <div
          className="min-w-0 scroll-mt-24 rounded-[1.5rem] border border-blue-50 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
          ref={detailCardRef}
        >
          {selectedTeacher ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-black text-brand-700">Guru Terpilih</p>
                <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">{selectedTeacher.name}</h3>
                <p className="mt-1 text-xs font-semibold text-muted">
                  NIP: {selectedTeacher.nip ?? '-'} · HP: {selectedTeacher.phone ?? '-'}
                </p>
              </div>

              <TeacherIdentityAccountPanel
                email={email}
                identity={identity}
                onEmailChange={setEmail}
                onIdentityChange={(field, value) =>
                  setIdentity((current) => ({ ...current, [field]: value }))
                }
                onPhotoChange={handleTeacherPhotoChange}
                onUsernameChange={setUsername}
                selectedTeacher={selectedTeacher}
                username={username}
              />

              <TeacherAccountRolePanel
                onToggleRole={toggleRole}
                selectedRoles={selectedRoles}
              />

              <TeacherAssignmentPanel
                assignmentNotes={assignmentNotes}
                assignmentSchoolYearId={assignmentSchoolYearId}
                assignmentStatus={assignmentStatus}
                assignmentSubjectIds={assignmentSubjectIds}
                onNotesChange={setAssignmentNotes}
                onSave={saveTeacherSchoolYearAssignment}
                onSchoolYearChange={setAssignmentSchoolYearId}
                onStatusChange={setAssignmentStatus}
                onToggleSubject={toggleAssignmentSubject}
                schoolYears={schoolYears}
                subjects={subjects}
              />

              <TeacherHomeroomPanel
                classes={classes}
                onClearHomeroomClasses={clearHomeroomClasses}
                onToggleHomeroomClass={toggleHomeroomClass}
                selectedHomeroomClassIds={selectedHomeroomClassIds}
                selectedTeacher={selectedTeacher}
              />

              <TeacherDetailActions
                message={message}
                onResetPassword={resetTeacherPassword}
                onSave={handleSave}
                saveDisabled={saveState === 'loading' || !username.trim() || !selectedRoles.length}
                saveState={saveState}
                selectedTeacher={selectedTeacher}
              />
            </div>
          ) : (
            <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-muted dark:bg-slate-950">
              Pilih guru terlebih dahulu.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
