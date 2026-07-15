'use client';

import { sortSchoolClasses } from '@eduflow/shared';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  api,
  type AcademicTimeSlot,
  type SchoolClass,
  type SchoolYear,
  type Subject,
} from '../lib/api';
import { getPreferredSchoolYear } from '../lib/school-year';
import { AcademicTimeSlotForm } from './academic-master/academic-time-slot-form';
import {
  type AcademicClassFormState,
  type AcademicTimeSlotFormState,
  type CloneSchoolYearMasterFormState,
  createDefaultTimeSlotForm,
  schoolYearNameRegex,
} from './academic-master/academic-master-constants';
import {
  getGroupedClasses,
  getInitialCloneSelection,
  getTimeSlotEditForm,
  getTimeSlotPayload,
  getTimeSlotsByDay,
  sortAcademicTimeSlots,
} from './academic-master/academic-master-utils';
import { ClassManagementPanel } from './academic-master/class-management-panel';
import { SubjectManagementPanel } from './academic-master/subject-management-panel';
import { TimeSlotManagementPanel } from './academic-master/time-slot-management-panel';
import { useToast } from './ui/toast';

type LoadState = 'loading' | 'success' | 'error';

export function AcademicMasterManagement() {
  const toast = useToast();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [timeSlots, setTimeSlots] = useState<AcademicTimeSlot[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingSchoolYear, setIsCreatingSchoolYear] = useState(false);
  const [isCloningMaster, setIsCloningMaster] = useState(false);
  const [isSavingTimeSlot, setIsSavingTimeSlot] = useState(false);
  const [editingTimeSlotId, setEditingTimeSlotId] = useState('');
  const [selectedTimeSlotSchoolYearId, setSelectedTimeSlotSchoolYearId] = useState('');
  const [isAddingTimeSlot, setIsAddingTimeSlot] = useState(false);
  const [classForm, setClassForm] = useState<AcademicClassFormState>({
    schoolYearId: '',
    grade: 'VII',
    suffix: '',
  });
  const [cloneForm, setCloneForm] = useState<CloneSchoolYearMasterFormState>({
    sourceSchoolYearId: '',
    targetSchoolYearId: '',
    includeClasses: true,
    includeTimeSlots: true,
    includeClassActivities: true,
  });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '' });
  const [schoolYearName, setSchoolYearName] = useState('');
  const [timeSlotForm, setTimeSlotForm] = useState<AcademicTimeSlotFormState>(
    createDefaultTimeSlotForm(),
  );

  async function loadData() {
    setLoadState('loading');

    try {
      const [classResponse, subjectResponse, yearResponse, timeSlotResponse] = await Promise.all([
        api.getClasses(),
        api.getSubjects(),
        api.getSchoolYears(),
        api.getAcademicTimeSlots(),
      ]);
      setClasses(sortSchoolClasses(classResponse.data));
      setSubjects(subjectResponse.data);
      setSchoolYears(yearResponse.data);
      setTimeSlots(timeSlotResponse.data);
      setCloneForm((current) => {
        const selection = getInitialCloneSelection(yearResponse.data);

        return {
          ...current,
          sourceSchoolYearId: current.sourceSchoolYearId || selection.sourceSchoolYearId,
          targetSchoolYearId: current.targetSchoolYearId || selection.targetSchoolYearId,
        };
      });
      setClassForm((current) => ({
        ...current,
        schoolYearId: current.schoolYearId || getPreferredSchoolYear(yearResponse.data)?.id || '',
      }));
      setTimeSlotForm((current) => ({
        ...current,
        schoolYearId: current.schoolYearId || getPreferredSchoolYear(yearResponse.data)?.id || '',
      }));
      setSelectedTimeSlotSchoolYearId((current) => current || getPreferredSchoolYear(yearResponse.data)?.id || '');
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
    () => getGroupedClasses(classes, classForm.schoolYearId),
    [classForm.schoolYearId, classes],
  );

  const timeSlotsByDay = useMemo(
    () => getTimeSlotsByDay(timeSlots, selectedTimeSlotSchoolYearId),
    [selectedTimeSlotSchoolYearId, timeSlots],
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

  async function handleCreateSchoolYear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = schoolYearName.trim();

    if (!schoolYearNameRegex.test(name)) {
      toast.warning('Gunakan format tahun ajaran, misalnya 2026/2027.', 'Format Belum Sesuai');
      return;
    }

    setIsCreatingSchoolYear(true);

    try {
      const response = await api.createSchoolYear({ name });
      setSchoolYears((current) => [response.data, ...current]);
      setClassForm((current) => ({ ...current, schoolYearId: response.data.id }));
      setCloneForm((current) => ({ ...current, targetSchoolYearId: response.data.id }));
      setSchoolYearName('');
      toast.success(response.message ?? 'Tahun ajaran berhasil ditambahkan.', 'Tahun Ajaran Ditambahkan');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Gagal menambahkan tahun ajaran.',
        'Aksi Gagal',
      );
    } finally {
      setIsCreatingSchoolYear(false);
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

  function resetTimeSlotForm(schoolYearId = timeSlotForm.schoolYearId) {
    setEditingTimeSlotId('');
    setIsAddingTimeSlot(false);
    setTimeSlotForm(createDefaultTimeSlotForm(schoolYearId));
  }

  async function handleSaveTimeSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!timeSlotForm.schoolYearId || !timeSlotForm.name.trim()) {
      toast.warning('Pilih tahun ajaran dan isi nama slot waktu.', 'Data Belum Lengkap');
      return;
    }

    setIsSavingTimeSlot(true);

    try {
      const payload = getTimeSlotPayload(timeSlotForm);
      const response = editingTimeSlotId
        ? await api.updateAcademicTimeSlot(editingTimeSlotId, {
            ...payload,
            periodNumber: payload.periodNumber ?? null,
          })
        : await api.createAcademicTimeSlot(payload);

      setTimeSlots((current) => {
        const next = [
          ...current.filter((item) => item.id !== response.data.id),
          response.data,
        ];
        return sortAcademicTimeSlots(next);
      });
      resetTimeSlotForm(selectedTimeSlotSchoolYearId || timeSlotForm.schoolYearId);
      toast.success(
        response.message ?? (editingTimeSlotId ? 'Slot waktu berhasil diperbarui.' : 'Slot waktu berhasil ditambahkan.'),
        'Jam Pelajaran',
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Slot waktu gagal disimpan.',
        'Aksi Gagal',
      );
    } finally {
      setIsSavingTimeSlot(false);
    }
  }

  function startEditTimeSlot(slot: AcademicTimeSlot) {
    setIsAddingTimeSlot(false);
    setEditingTimeSlotId(slot.id);
    setTimeSlotForm(getTimeSlotEditForm(slot));
  }

  function startAddTimeSlot() {
    resetTimeSlotForm(selectedTimeSlotSchoolYearId);
    setIsAddingTimeSlot(true);
  }

  function handleTimeSlotSchoolYearChange(schoolYearId: string) {
    setSelectedTimeSlotSchoolYearId(schoolYearId);
    resetTimeSlotForm(schoolYearId);
  }

  async function handleDeleteTimeSlot(slot: AcademicTimeSlot) {
    if (!window.confirm(`Hapus slot waktu ${slot.name} ${slot.startsAt}-${slot.endsAt}?`)) {
      return;
    }

    try {
      const response = await api.deleteAcademicTimeSlot(slot.id);
      setTimeSlots((current) => current.filter((item) => item.id !== slot.id));
      if (editingTimeSlotId === slot.id) {
        resetTimeSlotForm(slot.schoolYearId);
      }
      toast.success(response.message ?? 'Slot waktu berhasil dihapus.', 'Jam Pelajaran');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Slot waktu gagal dihapus.',
        'Aksi Gagal',
      );
    }
  }

  async function handleCloneSchoolYearMaster(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cloneForm.sourceSchoolYearId || !cloneForm.targetSchoolYearId) {
      toast.warning('Pilih tahun sumber dan target.', 'Data Belum Lengkap');
      return;
    }

    if (cloneForm.sourceSchoolYearId === cloneForm.targetSchoolYearId) {
      toast.warning('Tahun sumber dan target tidak boleh sama.', 'Pilihan Belum Sesuai');
      return;
    }

    if (!cloneForm.includeClasses && !cloneForm.includeTimeSlots && !cloneForm.includeClassActivities) {
      toast.warning('Pilih minimal satu data master untuk disalin.', 'Data Belum Lengkap');
      return;
    }

    setIsCloningMaster(true);

    try {
      const response = await api.cloneSchoolYearMaster(cloneForm);
      await loadData();
      setClassForm((current) => ({ ...current, schoolYearId: cloneForm.targetSchoolYearId }));
      toast.success(response.message ?? 'Master tahun ajaran berhasil disalin.', 'Master Disalin');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Gagal menyalin master tahun ajaran.',
        'Aksi Gagal',
      );
    } finally {
      setIsCloningMaster(false);
    }
  }

  if (loadState === 'error') {
    return (
      <div className="mt-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Data akademik belum bisa dimuat. Pastikan backend berjalan dan login masih aktif.
      </div>
    );
  }

  const renderTimeSlotForm = (submitLabel: string) => (
    <AcademicTimeSlotForm
      form={timeSlotForm}
      isSaving={isSavingTimeSlot}
      onCancel={() => resetTimeSlotForm(selectedTimeSlotSchoolYearId || timeSlotForm.schoolYearId)}
      onSubmit={handleSaveTimeSlot}
      setForm={setTimeSlotForm}
      submitLabel={submitLabel}
    />
  );

  return (
    <div className="mt-6 grid gap-5">
      <ClassManagementPanel
        classForm={classForm}
        cloneForm={cloneForm}
        groupedClasses={groupedClasses}
        isCloningMaster={isCloningMaster}
        isCreatingSchoolYear={isCreatingSchoolYear}
        isSaving={isSaving}
        onCloneSchoolYearMaster={handleCloneSchoolYearMaster}
        onCreateClass={handleCreateClass}
        onCreateSchoolYear={handleCreateSchoolYear}
        onDeleteClass={handleDeleteClass}
        schoolYearName={schoolYearName}
        schoolYears={schoolYears}
        setClassForm={setClassForm}
        setCloneForm={setCloneForm}
        setSchoolYearName={setSchoolYearName}
      />

      <SubjectManagementPanel
        isSaving={isSaving}
        onCreateSubject={handleCreateSubject}
        onDeleteSubject={handleDeleteSubject}
        setSubjectForm={setSubjectForm}
        subjectForm={subjectForm}
        subjects={subjects}
      />

      <TimeSlotManagementPanel
        editingTimeSlotId={editingTimeSlotId}
        isAddingTimeSlot={isAddingTimeSlot}
        onDeleteTimeSlot={handleDeleteTimeSlot}
        onSchoolYearChange={handleTimeSlotSchoolYearChange}
        onStartAdd={startAddTimeSlot}
        onStartEdit={startEditTimeSlot}
        renderTimeSlotForm={renderTimeSlotForm}
        schoolYears={schoolYears}
        selectedSchoolYearId={selectedTimeSlotSchoolYearId}
        timeSlotsByDay={timeSlotsByDay}
      />
    </div>
  );
}
