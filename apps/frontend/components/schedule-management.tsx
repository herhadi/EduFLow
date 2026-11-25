'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { getCurrentSessionUser } from '../lib/session';
import { ScheduleClassPanel } from './schedule-management/schedule-class-panel';
import { ScheduleGlobalMatrix } from './schedule-management/schedule-global-matrix';
import { ScheduleEditorForm } from './schedule-management/schedule-editor-form';
import {
  emptyScheduleForm,
  getAgendaClassIds,
  getAvailableGrades,
  getDayLabel,
  getEffectiveSchedulesByClass,
  getFilteredClasses,
  getInitialScheduleSelection,
  getScheduleEditDraft,
  getSchoolYearScheduleSelection,
  getSemesterScheduleSelection,
  getSlotClassSelection,
  getTeacherSubjectOptions,
  groupClassesByGrade,
  getToday,
} from './schedule-management/schedule-management-utils';
import { useToast } from './ui/toast';
import {
  api,
  type AcademicTimeSlot,
  type BulkSchedulePayload,
  type DailyAgenda,
  type Schedule,
  type SchedulePayload,
  type SchoolClass,
  type SchoolYear,
  type Semester,
  type Teacher,
} from '../lib/api';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

export function ScheduleManagement(_props: { dashboardHref?: string } = {}) {
  const toast = useToast();
  const [, setLoadState] = useState<LoadState>('idle');
  const [submitState, setSubmitState] = useState<LoadState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generateStartsAt, setGenerateStartsAt] = useState(getToday());
  const [generateEndsAt, setGenerateEndsAt] = useState(getToday());
  const [viewDate, setViewDate] = useState(getToday());
  const [generatedAgendas, setGeneratedAgendas] = useState<DailyAgenda[]>([]);
  const [agendaCoverage, setAgendaCoverage] = useState<{
    expected: number;
    existing: number;
    missing: number;
    blockedDates: number;
  } | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [timeSlots, setTimeSlots] = useState<AcademicTimeSlot[]>([]);
  const [form, setForm] = useState<SchedulePayload>(emptyScheduleForm);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('VII');
  const [slotClassIds, setSlotClassIds] = useState<Record<string, string[]>>({});
  const [scheduleClassId, setScheduleClassId] = useState('');
  const [scheduleDayFilter, setScheduleDayFilter] = useState('all');
  const [canGenerateAgenda, setCanGenerateAgenda] = useState(false);
  const [activeSection, setActiveSection] = useState<'agenda' | 'setup'>('agenda');

  async function loadData() {
    setLoadState('loading');

    try {
      const [
        scheduleResponse,
        schoolYearResponse,
        semesterResponse,
        classResponse,
        teacherResponse,
        timeSlotResponse,
      ] = await Promise.all([
        api.getSchedules(),
        api.getSchoolYears(),
        api.getSemesters(),
        api.getClasses(),
        api.getTeachers(),
        api.getAcademicTimeSlots(),
      ]);

      setSchedules(scheduleResponse.data);
      setSchoolYears(schoolYearResponse.data);
      setSemesters(semesterResponse.data);
      setClasses(classResponse.data);
      setTeachers(teacherResponse.data);
      setTimeSlots(timeSlotResponse.data);
      setLoadState('success');

      if (!form.schoolYearId) {
        const selection = getInitialScheduleSelection({
          classes: classResponse.data,
          schedules: scheduleResponse.data,
          schoolYears: schoolYearResponse.data,
          semesters: semesterResponse.data,
          teachers: teacherResponse.data,
        });

        if (!selection) {
          return;
        }

        setForm((currentForm) => ({
          ...currentForm,
          ...selection.form,
        }));

        setSelectedGrade(selection.grade);
        setScheduleClassId(selection.scheduleClassId);
        setViewDate(selection.viewDate);
        setGenerateStartsAt(selection.viewDate);
        setGenerateEndsAt(selection.viewDate);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Data jadwal gagal dimuat. Periksa akses dan koneksi backend.',
      );
      setLoadState('error');
    }
  }

  useEffect(() => {
    void loadData();
    setCanGenerateAgenda(
      getCurrentSessionUser()?.permissions.includes('agenda.generate') ?? false,
    );
  }, []);



  const filteredSemesters = useMemo(
    () => semesters.filter((semester) => semester.schoolYearId === form.schoolYearId),
    [form.schoolYearId, semesters],
  );

  const filteredClasses = useMemo(
    () => getFilteredClasses(classes, form.schoolYearId),
    [classes, form.schoolYearId],
  );

  const availableGrades = useMemo(
    () => getAvailableGrades(filteredClasses),
    [filteredClasses],
  );



  const gradeClasses = useMemo(
    () => filteredClasses.filter((schoolClass) => schoolClass.grade === selectedGrade),
    [filteredClasses, selectedGrade],
  );

  const teacherSubjectOptions = useMemo(
    () => getTeacherSubjectOptions(teachers, schoolYears, form.schoolYearId),
    [form.schoolYearId, schoolYears, teachers],
  );

  const scheduleTimeSlots = useMemo(
    () => timeSlots.filter((slot) => slot.schoolYearId === form.schoolYearId),
    [form.schoolYearId, timeSlots],
  );

  useEffect(() => {
    if (!availableGrades.length) {
      setSelectedGrade('VII');
      return;
    }

    if (!availableGrades.includes(selectedGrade)) {
      setSelectedGrade(availableGrades[0]);
    }
  }, [availableGrades, selectedGrade]);

  const selectedScheduleClass = useMemo(
    () =>
      classes.find(
        (schoolClass) =>
          schoolClass.id === scheduleClassId && schoolClass.schoolYearId === form.schoolYearId,
      ),
    [classes, form.schoolYearId, scheduleClassId],
  );

  const classesByGrade = useMemo(
    () => groupClassesByGrade(classes, form.schoolYearId),
    [classes, form.schoolYearId],
  );

  const agendaClassIds = useMemo(
    () => getAgendaClassIds(classes, form.schoolYearId),
    [classes, form.schoolYearId],
  );

  const schedulesByClass = useMemo(
    () =>
      getEffectiveSchedulesByClass({
        schedules,
        semesters,
        semesterId: form.semesterId,
        schoolYearId: form.schoolYearId,
        classId: scheduleClassId,
        dayFilter: scheduleDayFilter,
        viewDate,
      }),
    [form.schoolYearId, form.semesterId, scheduleClassId, scheduleDayFilter, schedules, semesters, viewDate],
  );

  const weeklySchedulesByClass = useMemo(
    () => getEffectiveSchedulesByClass({
      schedules,
      semesters,
      semesterId: form.semesterId,
      schoolYearId: form.schoolYearId,
      classId: scheduleClassId,
      dayFilter: "all",
      viewDate,
    }),
    [form.schoolYearId, form.semesterId, scheduleClassId, schedules, semesters, viewDate],
  );

  const editingSchedule = useMemo(
    () => schedules.find((schedule) => schedule.id === editingId),
    [editingId, schedules],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState('loading');
    setMessage(null);

    try {
      const response = editingId
        ? await api.updateSchedule(editingId, { ...form, effectiveFrom: effectiveFrom || undefined, reason: revisionReason || undefined })
        : await api.createBulkSchedules({
            schoolYearId: form.schoolYearId,
            semesterId: form.semesterId,
            subjectId: form.subjectId,
            teacherId: form.teacherId,
            assignments: Object.entries(slotClassIds)
              .filter(([, classIds]) => classIds.length > 0)
              .map(([timeSlotId, classIds]) => ({ timeSlotId, classIds })),
          } satisfies BulkSchedulePayload);

      setMessage(response.message ?? 'Jadwal berhasil disimpan.');
      setEditingId(null);
      setForm((currentForm) => ({
        ...currentForm,
        classId: '',
        startsAt: '07:00',
        endsAt: '08:30',
      }));
      setSlotClassIds({});
      await loadData();
      setSubmitState('success');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Jadwal gagal disimpan: ${error.message}`
          : 'Jadwal gagal disimpan. Periksa isian dan backend.',
      );
      setSubmitState('error');
    }
  }

  async function handleDelete(schedule: Schedule) {
    const confirmed = window.confirm(
      `Hapus jadwal ${schedule.subject.name} kelas ${schedule.class.name} pada ${getDayLabel(schedule.dayOfWeek)} ${schedule.startsAt}-${schedule.endsAt}?`,
    );

    if (!confirmed) return;

    setMessage(null);

    try {
      const response = await api.deleteSchedule(schedule.id);
      setMessage(response.message ?? 'Jadwal dinonaktifkan.');
      if (editingId === schedule.id) {
        setEditingId(null);
        setSlotClassIds({});
        }
      await loadData();
    } catch {
      setMessage('Jadwal gagal dinonaktifkan.');
    }
  }

  async function handleGenerateAgendas({
    classId,
    classIds,
  }: {
    classId?: string;
    classIds?: string[];
  }) {
    if ((!classId && !classIds?.length) || !form.schoolYearId) return;

    setSubmitState('loading');
    setMessage(null);
    setGeneratedAgendas([]);

    try {
      const response = await api.generateAgendas({
        startsAt: generateStartsAt,
        endsAt: generateEndsAt,
        classId,
        classIds,
        schoolYearId: form.schoolYearId,
      });
      setGeneratedAgendas(response.data);
      setMessage(response.message ?? 'Agenda berhasil digenerate.');
      toast.success(
        response.message ?? 'Agenda berhasil digenerate.',
        'Agenda Harian',
      );
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Generate agenda gagal. Periksa tanggal dan backend.';
      setMessage(errorMessage);
      toast.error(errorMessage, 'Generate Agenda Gagal');
    } finally {
      setSubmitState('idle');
    }
  }

  async function checkAgendaCoverage(classId?: string) {
    if (!form.schoolYearId) return;

    try {
      const response = await api.getAgendaCoverage({
        schoolYearId: form.schoolYearId,
        startsAt: generateStartsAt,
        endsAt: generateEndsAt,
        classId,
      });
      setAgendaCoverage(response.data);
      if (response.data.missing > 0) {
        toast.warning(`${response.data.missing} agenda belum dibuat.`, 'Cek Agenda');
      } else {
        toast.success('Semua agenda pada rentang ini sudah tersedia.', 'Cek Agenda');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Cek agenda gagal.', 'Cek Agenda');
    }
  }

  async function assignSubstitute(agenda: DailyAgenda, teacherId: string) {
    try {
      const response = await api.assignSubstituteTeacher(agenda.id, teacherId || null);
      setGeneratedAgendas((current) =>
        current.map((item) => (item.id === agenda.id ? response.data : item)),
      );
      toast.success(response.message ?? 'Guru pengganti diperbarui.', 'Guru Pengganti');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Guru pengganti gagal disimpan.', 'Guru Pengganti');
    }
  }

  async function handleCancelRevision(revisionId: string) {
    if (!editingId) return;

    const confirmed = window.confirm('Batalkan revisi jadwal ini?');
    if (!confirmed) return;

    try {
      const response = await api.cancelScheduleRevision(editingId, revisionId);
      setMessage(response.message ?? 'Revisi jadwal dibatalkan.');
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Revisi jadwal gagal dibatalkan.');
    }
  }

  function startEdit(schedule: Schedule) {
    const draft = getScheduleEditDraft(schedule);

    setEditingId(schedule.id);
    setForm(draft.form);
    setEffectiveFrom('');
    setRevisionReason('');
    setSelectedGrade(draft.grade);
    setSlotClassIds(draft.slotClassIds);
    setMessage(null);
  }



  function toggleSlotClass(slot: AcademicTimeSlot, classId: string) {
    setSlotClassIds((current) => {
      const selection = getSlotClassSelection({
        classId,
        current,
        editingId,
        slot,
      });

      setForm((currentForm) => ({
        ...currentForm,
        ...selection.form,
      }));
      return selection.slotClassIds;
    });
  }

  function handleSchoolYearChange(value: string) {
    const selection = getSchoolYearScheduleSelection({
      classes,
      schedules,
      schoolYearId: value,
      semesters,
    });

    setForm((currentForm) => ({
      ...currentForm,
      schoolYearId: value,
      semesterId: selection.semesterId,
      classId: '',
    }));
    setSelectedGrade(selection.grade);
    setScheduleClassId(selection.scheduleClassId);
    setViewDate(selection.viewDate);
    setGenerateStartsAt(selection.viewDate);
    setGenerateEndsAt(selection.viewDate);
    setSlotClassIds({});
  }

  function handleSemesterChange(value: string) {
    const selection = getSemesterScheduleSelection({
      classes,
      fallbackGrade: selectedGrade,
      schedules,
      schoolYearId: form.schoolYearId,
      semesterId: value,
      semesters,
    });

    setForm({ ...form, semesterId: value });
    setSelectedGrade(selection.grade);
    setScheduleClassId(selection.scheduleClassId);
    setViewDate(selection.viewDate);
    setGenerateStartsAt(selection.viewDate);
    setGenerateEndsAt(selection.viewDate);
  }

  function handleTeacherSubjectChange(value: string) {
    const [teacherId, subjectId] = value.split(':');
    setForm({ ...form, teacherId, subjectId });
    setSlotClassIds({});
  }

  function handleGradeChange(grade: string) {
    setSelectedGrade(grade);
    setSlotClassIds({});
    setForm((current) => ({ ...current, classId: '' }));
  }

  return (
    <section className="mt-6 flex w-full min-w-0 max-w-full flex-col gap-5 sm:mt-10">
      <div className="-mx-1 rounded-2xl border border-blue-100 bg-white p-2 dark:border-[var(--border)] dark:bg-[var(--surface-solid)] sm:mx-0">
        <div className="grid grid-cols-2 gap-2">
          <button
            aria-current={activeSection === 'agenda' ? 'page' : undefined}
            className={activeSection === 'agenda' ? 'rounded-xl bg-brand-600 px-4 py-3 text-sm font-black text-white shadow-sm' : 'rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:bg-[var(--surface-soft)] dark:text-[var(--text-soft)]'}
            onClick={() => setActiveSection('agenda')}
            type="button"
          >Agenda Kelas</button>
          <button
            aria-current={activeSection === 'setup' ? 'page' : undefined}
            className={activeSection === 'setup' ? 'rounded-xl bg-brand-600 px-4 py-3 text-sm font-black text-white shadow-sm' : 'rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:bg-[var(--surface-soft)] dark:text-[var(--text-soft)]'}
            onClick={() => setActiveSection('setup')}
            type="button"
          >Setup Jadwal</button>
        </div>
      </div>
      {activeSection === 'agenda' ? (
        <>
      <ScheduleClassPanel
        agendaClassIds={agendaClassIds}
        agendaCoverage={agendaCoverage}
        assignSubstitute={assignSubstitute}
        canGenerateAgenda={canGenerateAgenda}
        checkAgendaCoverage={checkAgendaCoverage}
        classesByGrade={classesByGrade}
        formSchoolYearId={form.schoolYearId}
        generateEndsAt={generateEndsAt}
        generateStartsAt={generateStartsAt}
        generatedAgendas={generatedAgendas}
        handleDelete={handleDelete}
        handleGenerateAgendas={handleGenerateAgendas}
        scheduleClassId={scheduleClassId}
        scheduleDayFilter={scheduleDayFilter}
        schedulesByClass={schedulesByClass}
        weeklySchedulesByClass={weeklySchedulesByClass}
        selectedScheduleClass={selectedScheduleClass}
        setGenerateEndsAt={setGenerateEndsAt}
        setGenerateStartsAt={setGenerateStartsAt}
        setScheduleClassId={setScheduleClassId}
        setScheduleDayFilter={setScheduleDayFilter}
        setViewDate={setViewDate}
        startEdit={startEdit}
        submitState={submitState}
        teachers={teachers}
        viewDate={viewDate}
      />
      <ScheduleGlobalMatrix
        schedules={schedules}
        classes={filteredClasses}
        teachers={teachers}
        timeSlots={timeSlots}
        activities={[]}
        schoolYear={schoolYears.find((item) => item.id === form.schoolYearId)}
        semester={semesters.find((item) => item.id === form.semesterId)}
        viewDate={viewDate}
      />
        </>
      ) : (
        <>
      <ScheduleEditorForm
        availableGrades={availableGrades}
        scheduleTimeSlots={scheduleTimeSlots}
        editingId={editingId}
        editingSchedule={editingSchedule}
        effectiveFrom={effectiveFrom}
        filteredSemesters={filteredSemesters}
        form={form}
        gradeClasses={gradeClasses}
        handleCancelRevision={handleCancelRevision}
        message={message}
        onCancelEdit={() => {
          setEditingId(null);
          setForm(emptyScheduleForm);
        }}
        onGradeChange={handleGradeChange}
        onSchoolYearChange={handleSchoolYearChange}
        onSemesterChange={handleSemesterChange}
        onSubmit={handleSubmit}
        onTeacherSubjectChange={handleTeacherSubjectChange}
        revisionReason={revisionReason}
        schoolYears={schoolYears}
        selectedGrade={selectedGrade}
        setEffectiveFrom={setEffectiveFrom}
        setRevisionReason={setRevisionReason}
        slotClassIds={slotClassIds}
        submitState={submitState}
        teacherSubjectOptions={teacherSubjectOptions}
        toggleSlotClass={toggleSlotClass}
      />
        </>
      )}

    </section>
  );
}
