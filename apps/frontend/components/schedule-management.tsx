'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { getCurrentSessionUser } from '../lib/session';
import { getPreferredSchoolYear, getPreferredSemester } from '../lib/school-year';
import { ScheduleClassPanel } from './schedule-management/schedule-class-panel';
import { ScheduleEditorForm } from './schedule-management/schedule-editor-form';
import {
  emptyScheduleForm,
  getAgendaClassIds,
  getAvailableGrades,
  getDateForSemester,
  getDayLabel,
  getEffectiveSchedulesByClass,
  getFilteredClasses,
  getFirstScheduledClassId,
  getTeacherSubjectOptions,
  groupClassesByGrade,
  getToday,
} from './schedule-management/schedule-management-utils';
import { useToast } from './ui/toast';
import {
  api,
  type AcademicTimeSlot,
  type ClassTimeSlotActivity,
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

export function ScheduleManagement() {
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
  const [expandedTimeSlotIds, setExpandedTimeSlotIds] = useState<string[]>([]);
  const [classTimeSlotActivities, setClassTimeSlotActivities] = useState<ClassTimeSlotActivity[]>([]);
  const [scheduleClassId, setScheduleClassId] = useState('');
  const [scheduleDayFilter, setScheduleDayFilter] = useState('all');
  const [canGenerateAgenda, setCanGenerateAgenda] = useState(false);

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
        const firstSchoolYear = getPreferredSchoolYear(schoolYearResponse.data);

        if (!firstSchoolYear) {
          return;
        }

        const firstSemester = getPreferredSemester(semesterResponse.data, firstSchoolYear.id);
        const initialDate = getDateForSemester(firstSemester);
        const initialClassId = getFirstScheduledClassId(
          classResponse.data,
          scheduleResponse.data,
          firstSchoolYear.id,
          initialDate,
        );
        const firstClass =
          classResponse.data.find((schoolClass) => schoolClass.id === initialClassId) ??
          classResponse.data.find((schoolClass) => schoolClass.schoolYearId === firstSchoolYear.id);
        const firstTeacher = teacherResponse.data[0];
        const firstSubject = firstTeacher?.subjects?.[0]?.subject;

        setForm((currentForm) => ({
          ...currentForm,
          schoolYearId: firstSchoolYear.id,
          semesterId: firstSemester?.id ?? '',
          classId: firstClass?.id ?? '',
          subjectId: firstSubject?.id ?? '',
          teacherId: firstTeacher?.id ?? '',
        }));

        setSelectedGrade(firstClass?.grade ?? 'VII');
        setScheduleClassId(firstClass?.id ?? '');
        setViewDate(initialDate);
        setGenerateStartsAt(initialDate);
        setGenerateEndsAt(initialDate);
      }
    } catch {
      setLoadState('error');
    }
  }

  useEffect(() => {
    void loadData();
    setCanGenerateAgenda(
      getCurrentSessionUser()?.permissions.includes('agenda.generate') ?? false,
    );
  }, []);

  useEffect(() => {
    if (!form.classId) {
      setClassTimeSlotActivities([]);
      return;
    }

    void api.getClassTimeSlotActivities(form.classId).then((response) => {
      setClassTimeSlotActivities(response.data);
    });
  }, [form.classId]);

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

  const dayTimeSlots = useMemo(
    () =>
      timeSlots.filter(
        (slot) =>
          slot.schoolYearId === form.schoolYearId &&
          slot.dayOfWeek === form.dayOfWeek,
      ),
    [form.dayOfWeek, form.schoolYearId, timeSlots],
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
      setExpandedTimeSlotIds([]);
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
        setExpandedTimeSlotIds([]);
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
    setEditingId(schedule.id);
    setForm({
      schoolYearId: schedule.schoolYearId,
      semesterId: schedule.semesterId,
      classId: schedule.classId,
      subjectId: schedule.subjectId,
      teacherId: schedule.teacherId,
      dayOfWeek: schedule.dayOfWeek,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
    });
    setEffectiveFrom('');
    setRevisionReason('');
    setSelectedGrade(schedule.class.grade ?? 'VII');
    setSlotClassIds(schedule.timeSlotId ? { [schedule.timeSlotId]: [schedule.classId] } : {});
    setMessage(null);
  }

  async function setBreakActivity(
    slot: AcademicTimeSlot,
    type: ClassTimeSlotActivity['type'],
  ) {
    if (!form.classId) return;

    try {
      const response = await api.updateClassTimeSlotActivity(form.classId, slot.id, type);
      setClassTimeSlotActivities((activities) => [
        ...activities.filter((activity) => activity.timeSlotId !== slot.id),
        response.data,
      ]);
      setMessage(response.message ?? 'Kegiatan jeda berhasil disimpan.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kegiatan jeda gagal disimpan.');
    }
  }

  function toggleSlotClass(slot: AcademicTimeSlot, classId: string) {
    setSlotClassIds((current) => {
      const currentIds = current[slot.id] ?? [];
      const nextIds = editingId
        ? [classId]
        : currentIds.includes(classId)
          ? currentIds.filter((id) => id !== classId)
          : [...currentIds, classId];
      setForm((currentForm) => ({
        ...currentForm,
        classId: nextIds[0] ?? '',
        dayOfWeek: slot.dayOfWeek,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      }));
      return editingId ? { [slot.id]: nextIds } : { ...current, [slot.id]: nextIds };
    });
  }

  function toggleTimeSlotPanel(timeSlotId: string) {
    setExpandedTimeSlotIds((currentIds) => {
      if (currentIds.includes(timeSlotId)) {
        setSlotClassIds((current) => {
          const next = { ...current };
          delete next[timeSlotId];
          return next;
        });
        return currentIds.filter((id) => id !== timeSlotId);
      }

      return [...currentIds, timeSlotId];
    });
  }

  function handleSchoolYearChange(value: string) {
    const semester = getPreferredSemester(semesters, value);
    const nextViewDate = getDateForSemester(semester);
    const firstClassId = getFirstScheduledClassId(
      classes,
      schedules,
      value,
      nextViewDate,
    );
    const firstClass =
      classes.find((schoolClass) => schoolClass.id === firstClassId) ??
      classes.find((schoolClass) => schoolClass.schoolYearId === value);

    setForm((currentForm) => ({
      ...currentForm,
      schoolYearId: value,
      semesterId: semester?.id ?? '',
      classId: '',
    }));
    setSelectedGrade(firstClass?.grade ?? 'VII');
    setScheduleClassId(firstClass?.id ?? '');
    setViewDate(nextViewDate);
    setGenerateStartsAt(nextViewDate);
    setGenerateEndsAt(nextViewDate);
    setSlotClassIds({});
    setExpandedTimeSlotIds([]);
  }

  function handleSemesterChange(value: string) {
    const semester = semesters.find((item) => item.id === value);
    const nextViewDate = getDateForSemester(semester);
    const firstClassId = getFirstScheduledClassId(
      classes,
      schedules,
      form.schoolYearId,
      nextViewDate,
    );
    const firstClass =
      classes.find((schoolClass) => schoolClass.id === firstClassId) ??
      classes.find((schoolClass) => schoolClass.schoolYearId === form.schoolYearId);

    setForm({ ...form, semesterId: value });
    setSelectedGrade(firstClass?.grade ?? selectedGrade);
    setScheduleClassId(firstClass?.id ?? '');
    setViewDate(nextViewDate);
    setGenerateStartsAt(nextViewDate);
    setGenerateEndsAt(nextViewDate);
  }

  function handleTeacherSubjectChange(value: string) {
    const [teacherId, subjectId] = value.split(':');
    setForm({ ...form, teacherId, subjectId });
  }

  function handleGradeChange(grade: string) {
    setSelectedGrade(grade);
    setSlotClassIds({});
    setExpandedTimeSlotIds([]);
    setForm((current) => ({ ...current, classId: '' }));
  }

  function handleDayChange(value: string) {
    const dayOfWeek = Number(value);
    setForm({ ...form, dayOfWeek });
    setSlotClassIds({});
    setExpandedTimeSlotIds([]);
  }

  return (
    <section className="mt-6 grid w-full min-w-0 max-w-full gap-5 sm:mt-10 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <ScheduleEditorForm
        availableGrades={availableGrades}
        classTimeSlotActivities={classTimeSlotActivities}
        dayTimeSlots={dayTimeSlots}
        editingId={editingId}
        editingSchedule={editingSchedule}
        effectiveFrom={effectiveFrom}
        expandedTimeSlotIds={expandedTimeSlotIds}
        filteredSemesters={filteredSemesters}
        form={form}
        gradeClasses={gradeClasses}
        handleCancelRevision={handleCancelRevision}
        message={message}
        onCancelEdit={() => {
          setEditingId(null);
          setForm(emptyScheduleForm);
        }}
        onDayChange={handleDayChange}
        onGradeChange={handleGradeChange}
        onSchoolYearChange={handleSchoolYearChange}
        onSemesterChange={handleSemesterChange}
        onSubmit={handleSubmit}
        onTeacherSubjectChange={handleTeacherSubjectChange}
        revisionReason={revisionReason}
        schoolYears={schoolYears}
        selectedGrade={selectedGrade}
        setBreakActivity={setBreakActivity}
        setEffectiveFrom={setEffectiveFrom}
        setRevisionReason={setRevisionReason}
        slotClassIds={slotClassIds}
        submitState={submitState}
        teacherSubjectOptions={teacherSubjectOptions}
        toggleSlotClass={toggleSlotClass}
        toggleTimeSlotPanel={toggleTimeSlotPanel}
      />

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
    </section>
  );
}
