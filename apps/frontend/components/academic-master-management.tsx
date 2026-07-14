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
import { getPreferredSchoolYear, getUpcomingSchoolYear } from '../lib/school-year';
import { AcademicTimeSlotForm } from './academic-master/academic-time-slot-form';
import {
  type AcademicClassFormState,
  type AcademicTimeSlotFormState,
  type CloneSchoolYearMasterFormState,
  createDefaultTimeSlotForm,
  grades,
  schoolYearNameRegex,
  timeSlotTypeOptions,
  weekdayOptions,
} from './academic-master/academic-master-constants';
import { ClassManagementPanel } from './academic-master/class-management-panel';
import { SubjectManagementPanel } from './academic-master/subject-management-panel';
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
        const sourceSchoolYear = getPreferredSchoolYear(yearResponse.data);
        const upcomingSchoolYear = getUpcomingSchoolYear(yearResponse.data);
        const targetSchoolYear =
          upcomingSchoolYear?.id !== sourceSchoolYear?.id
            ? upcomingSchoolYear
            : yearResponse.data.find((schoolYear) => schoolYear.id !== sourceSchoolYear?.id);

        return {
          ...current,
          sourceSchoolYearId: current.sourceSchoolYearId || sourceSchoolYear?.id || '',
          targetSchoolYearId: current.targetSchoolYearId || targetSchoolYear?.id || '',
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
    () =>
      grades.map((grade) => ({
        grade,
        classes: sortSchoolClasses(
          classes.filter(
            (schoolClass) =>
              schoolClass.grade === grade &&
              (!classForm.schoolYearId || schoolClass.schoolYearId === classForm.schoolYearId),
          ),
        ),
      })),
    [classForm.schoolYearId, classes],
  );

  const timeSlotsByDay = useMemo(
    () =>
      weekdayOptions.map((day) => ({
        ...day,
        slots: timeSlots
          .filter((slot) => slot.schoolYearId === selectedTimeSlotSchoolYearId && slot.dayOfWeek === day.value)
          .sort((first, second) => first.startsAt.localeCompare(second.startsAt)),
      })),
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
      const payload = {
        schoolYearId: timeSlotForm.schoolYearId,
        dayOfWeek: Number(timeSlotForm.dayOfWeek),
        periodNumber: timeSlotForm.periodNumber ? Number(timeSlotForm.periodNumber) : undefined,
        name: timeSlotForm.name.trim(),
        type: timeSlotForm.type,
        startsAt: timeSlotForm.startsAt,
        endsAt: timeSlotForm.endsAt,
        isAssignable: timeSlotForm.isAssignable,
      };
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
        return next.sort((first, second) =>
          first.schoolYearId.localeCompare(second.schoolYearId) ||
          first.dayOfWeek - second.dayOfWeek ||
          first.startsAt.localeCompare(second.startsAt),
        );
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
    setTimeSlotForm({
      schoolYearId: slot.schoolYearId,
      dayOfWeek: slot.dayOfWeek,
      periodNumber: slot.periodNumber ? String(slot.periodNumber) : '',
      name: slot.name,
      type: slot.type,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      isAssignable: slot.isAssignable,
    });
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

      <section className="min-w-0 rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">Jadwal Sekolah</p>
        <h2 className="mt-1 text-2xl font-black text-ink">Manajemen Jam Pelajaran</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Atur susunan jam per hari untuk setiap tahun ajaran. Di sinilah operator mengubah jam mulai, jam selesai, nomor jam, dan jenis slot seperti istirahat atau upacara.
        </p>

        <div className="mt-5 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="grid gap-1 text-xs font-black text-slate-700" htmlFor="time-slot-school-year-filter">
            Tahun Ajaran
            <select
              className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-brand-600"
              id="time-slot-school-year-filter"
              onChange={(event) => handleTimeSlotSchoolYearChange(event.target.value)}
              value={selectedTimeSlotSchoolYearId}
            >
              {schoolYears.map((year) => (
                <option key={year.id} value={year.id}>{year.name}</option>
              ))}
            </select>
          </label>
          <button
            className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white disabled:bg-slate-300"
            disabled={!selectedTimeSlotSchoolYearId}
            onClick={startAddTimeSlot}
            type="button"
          >
            Tambah Jam Pelajaran
          </button>
        </div>

        {isAddingTimeSlot ? (
          <div className="mt-3">
            {renderTimeSlotForm('Tambah Jam Pelajaran')}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {timeSlotsByDay.map((day) => (
            <div className="rounded-2xl border border-blue-50 bg-slate-50 p-4" key={day.value}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-black text-slate-900">{day.label}</h3>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-brand-700">{day.slots.length}</span>
              </div>
              <div className="mt-3 space-y-2">
                {day.slots.map((slot) => (
                  <div
                    className={`rounded-xl bg-white p-3 ${editingTimeSlotId === slot.id ? 'ring-2 ring-brand-200' : ''}`}
                    key={slot.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">
                          {slot.name}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-muted">
                          {slot.startsAt}-{slot.endsAt}
                          {slot.periodNumber ? ` · Jam ${slot.periodNumber}` : ''}
                          {' · '}
                          {timeSlotTypeOptions.find((option) => option.value === slot.type)?.label ?? slot.type}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-brand-700">
                          {slot.isAssignable ? 'Dipakai untuk jadwal' : 'Slot non-pelajaran'}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-brand-700"
                          onClick={() => startEditTimeSlot(slot)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700"
                          onClick={() => void handleDeleteTimeSlot(slot)}
                          type="button"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                    {editingTimeSlotId === slot.id ? (
                      <div className="mt-3 border-t border-blue-50 pt-3">
                        {renderTimeSlotForm('Simpan Perubahan Jam')}
                      </div>
                    ) : null}
                  </div>
                ))}
                {!day.slots.length ? (
                  <p className="rounded-xl bg-white px-3 py-3 text-xs font-semibold text-muted">
                    Belum ada slot waktu.
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
