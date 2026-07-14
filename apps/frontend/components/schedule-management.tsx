'use client';

import { sortSchoolClasses } from '@eduflow/shared';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { getCurrentSessionUser } from '../lib/session';
import { getPreferredSchoolYear, getPreferredSemester } from '../lib/school-year';
import { DateControl, InputField, SelectField } from './schedule-management/schedule-form-controls';
import {
  dayOptions,
  emptyScheduleForm,
  formatDateDisplay,
  getDateForSemester,
  getDayLabel,
  getFirstScheduledClassId,
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
    () =>
      sortSchoolClasses(
        classes.filter((schoolClass) => schoolClass.schoolYearId === form.schoolYearId),
      ),
    [classes, form.schoolYearId],
  );

  const availableGrades = useMemo(
    () => [...new Set(filteredClasses.map((schoolClass) => schoolClass.grade).filter(Boolean))] as string[],
    [filteredClasses],
  );

  const gradeClasses = useMemo(
    () => filteredClasses.filter((schoolClass) => schoolClass.grade === selectedGrade),
    [filteredClasses, selectedGrade],
  );

  const teacherSubjectOptions = useMemo(
    () =>
      teachers.flatMap((teacher) => {
        const targetSchoolYear = schoolYears.find((item) => item.id === form.schoolYearId);
        const assignment = teacher.yearAssignments
          ?.filter((item) =>
            targetSchoolYear && item.schoolYear?.startsAt && new Date(item.schoolYear.startsAt) <= new Date(targetSchoolYear.startsAt),
          )
          .sort((first, second) =>
            new Date(second.schoolYear?.startsAt ?? 0).getTime() - new Date(first.schoolYear?.startsAt ?? 0).getTime(),
          )[0];
        const subjects = assignment
          ? assignment.status === 'ACTIVE' ? assignment.subjects : []
          : teacher.subjects ?? [];

        return subjects.map(({ subject }) => ({
          label: `${teacher.name} · ${subject.name}`,
          value: `${teacher.id}:${subject.id}`,
        }));
      }),
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
    () => {
      const sortedClasses = sortSchoolClasses(
        classes.filter((schoolClass) => schoolClass.schoolYearId === form.schoolYearId),
      );

      return sortedClasses.reduce<Record<string, SchoolClass[]>>((groups, schoolClass) => {
        const grade = schoolClass.grade ?? 'Lainnya';
        groups[grade] = [...(groups[grade] ?? []), schoolClass];
        return groups;
      }, {});
    },
    [classes, form.schoolYearId],
  );

  const agendaClassIds = useMemo(
    () => classes
      .filter(
        (schoolClass) =>
          schoolClass.schoolYearId === form.schoolYearId &&
          ['VII', 'VIII', 'IX'].includes(schoolClass.grade ?? ''),
      )
      .map((schoolClass) => schoolClass.id),
    [classes, form.schoolYearId],
  );

  const schedulesByClass = useMemo(
    () => {
      const semester = semesters.find((item) => item.id === form.semesterId);
      const viewTime = new Date(viewDate || semester?.startsAt || getToday()).getTime();
      return schedules.map((schedule) => {
        const revision = schedule.revisions
          ?.filter((item) => new Date(item.effectiveFrom).getTime() <= viewTime)
          .at(-1);
        return revision
          ? { ...schedule, ...revision, class: revision.class, subject: revision.subject, teacher: revision.teacher, hasRevision: true }
          : schedule;
      }).filter((schedule) =>
        schedule.classId === scheduleClassId &&
        schedule.schoolYearId === form.schoolYearId &&
        (scheduleDayFilter === 'all' || schedule.dayOfWeek === Number(scheduleDayFilter)),
      )
        .sort(
          (firstSchedule, secondSchedule) =>
            firstSchedule.dayOfWeek - secondSchedule.dayOfWeek ||
            firstSchedule.startsAt.localeCompare(secondSchedule.startsAt),
        );
    }, [form.schoolYearId, form.semesterId, scheduleClassId, scheduleDayFilter, schedules, semesters, viewDate],
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

  return (
    <section className="mt-6 grid w-full min-w-0 max-w-full gap-5 sm:mt-10 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <form
        className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
        onSubmit={handleSubmit}
      >
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
            {editingId ? 'Edit Jadwal' : 'Create Jadwal'}
          </p>
          <h2 className="mt-1 text-xl font-bold sm:text-2xl">
            {editingId ? 'Ubah Jadwal' : 'Tambah Jadwal'}
          </h2>
        </div>

        <div className="mt-5 grid min-w-0 gap-3 sm:mt-6 sm:gap-4">
          <SelectField
            label="Tahun Ajaran"
            onChange={(value) => {
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
            }}
            options={schoolYears.map((schoolYear) => ({
              label: schoolYear.name,
              value: schoolYear.id,
            }))}
            value={form.schoolYearId}
          />
          <SelectField
            label="Semester"
            onChange={(value) => {
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
            }}
            options={filteredSemesters.map((semester) => ({
              label: semester.type === 'ODD' ? 'Ganjil' : 'Genap',
              value: semester.id,
            }))}
            value={form.semesterId}
          />
          {editingId ? <><InputField label="Berlaku mulai (opsional)" onChange={setEffectiveFrom} required={false} type="date" value={effectiveFrom} /><InputField label="Alasan revisi" onChange={setRevisionReason} required={false} value={revisionReason} /></> : null}

          {editingId && editingSchedule?.revisions?.length ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
              <p className="text-xs font-black tracking-[0.1em] text-amber-800 uppercase">
                Histori Revisi
              </p>
              <div className="mt-3 space-y-2">
                {editingSchedule.revisions.map((revision) => (
                  <div className="rounded-xl bg-white p-3 text-xs font-semibold text-slate-700" key={revision.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-900">
                          {formatDateDisplay(revision.effectiveFrom)} · {revision.class.name}
                        </p>
                        <p className="mt-1">
                          {getDayLabel(revision.dayOfWeek)} {revision.startsAt}-{revision.endsAt} · {revision.subject.name} · {revision.teacher.name}
                        </p>
                        {revision.reason ? <p className="mt-1 text-amber-800">{revision.reason}</p> : null}
                      </div>
                      <button
                        className="rounded-lg border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-black text-red-700"
                        onClick={() => void handleCancelRevision(revision.id)}
                        type="button"
                      >
                        Batalkan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <SelectField
            label="Guru Pengampu"
            onChange={(value) => {
              const [teacherId, subjectId] = value.split(':');
              setForm({ ...form, teacherId, subjectId });
            }}
            options={teacherSubjectOptions}
            value={
              form.teacherId && form.subjectId
                ? `${form.teacherId}:${form.subjectId}`
                : ''
            }
          />
          <p className="-mt-1 rounded-2xl bg-blue-50 px-3 py-2.5 text-xs font-semibold leading-5 text-brand-700 sm:-mt-2 sm:px-4 sm:py-3">
            Mata pelajaran mengikuti pilihan guru pengampu. Guru dengan dua mapel tampil sebagai dua opsi terpisah.
          </p>

          <div className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 sm:p-4">
            <p className="text-sm font-black text-slate-800">Pilih Kelas</p>
            <p className="mt-1 text-xs font-semibold text-muted">Pilih tingkat. Rombel A, B, C, dan seterusnya dipilih pada setiap jam.</p>
            <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(4.25rem,1fr))] gap-2">
              {availableGrades.map((grade) => (
                <button
                  className={selectedGrade === grade ? 'min-w-0 rounded-xl bg-brand-600 px-2 py-2.5 text-sm font-black text-white sm:px-3 sm:py-3' : 'min-w-0 rounded-xl border border-blue-100 bg-white px-2 py-2.5 text-sm font-black text-brand-700 sm:px-3 sm:py-3'}
                  key={grade}
                  onClick={() => {
                    setSelectedGrade(grade);
                    setSlotClassIds({});
                    setExpandedTimeSlotIds([]);
                    setForm((current) => ({ ...current, classId: '' }));
                  }}
                  type="button"
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>
          <SelectField
            label="Hari"
            onChange={(value) => {
              const dayOfWeek = Number(value);
              setForm({ ...form, dayOfWeek });
              setSlotClassIds({});
              setExpandedTimeSlotIds([]);
            }}
            options={dayOptions.map((day) => ({
              label: day.label,
              value: String(day.value),
            }))}
            value={String(form.dayOfWeek)}
          />
          <div className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 sm:p-4">
            <p className="text-xs font-black tracking-[0.1em] text-brand-700 uppercase">
              Susunan Hari Ini
            </p>
            <div className="mt-3 space-y-2">
              {dayTimeSlots.map((slot) => slot.type === 'BREAK' || slot.type === 'RELIGIOUS' ? (
                <div className="rounded-xl bg-amber-50 p-3" key={slot.id}>
                  <div className="flex min-w-0 items-center justify-between gap-3 text-xs font-bold text-amber-900">
                    <span className="shrink-0">{slot.startsAt}-{slot.endsAt}</span>
                    <span className="min-w-0 text-right">{slot.type === 'RELIGIOUS' ? 'Jeda kedua' : 'Istirahat'}</span>
                  </div>
                  {slot.type === 'RELIGIOUS' ? <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {(['BREAK', 'RELIGIOUS'] as const).map((type) => {
                      const currentType = classTimeSlotActivities.find(
                        (activity) => activity.timeSlotId === slot.id,
                      )?.type ?? 'BREAK';
                      return (
                        <button
                          className={`min-w-0 rounded-lg px-2 py-2 text-[11px] font-bold leading-4 ${currentType === type ? 'bg-brand-600 text-white' : 'bg-white text-slate-700'}`}
                          key={type}
                          onClick={() => void setBreakActivity(slot, type)}
                          type="button"
                        >
                          {type === 'BREAK' ? 'Istirahat' : 'Istirahat/Sholat Berjamaah'}
                        </button>
                      );
                    })}
                  </div> : (
                    <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-slate-700">
                      Istirahat
                    </p>
                  )}
                </div>
              ) : (
                <div className="min-w-0 rounded-xl bg-white p-3" key={slot.id}>
                  <button
                    className="grid w-full min-w-0 grid-cols-1 items-center gap-1 text-left text-xs font-bold text-slate-700 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-2"
                    disabled={!slot.isAssignable}
                    onClick={() => toggleTimeSlotPanel(slot.id)}
                    type="button"
                  >
                    <span className="min-w-0 truncate">{slot.name}</span>
                    <span className="flex min-w-0 items-center gap-2 text-xs text-slate-500 sm:shrink-0 sm:whitespace-nowrap">
                      {slot.startsAt}-{slot.endsAt}
                      <span className="text-brand-700">{expandedTimeSlotIds.includes(slot.id) ? '−' : '+'}</span>
                    </span>
                  </button>
                  {slot.isAssignable && expandedTimeSlotIds.includes(slot.id) ? (
                    <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(3rem,1fr))] gap-2 sm:flex sm:flex-wrap">
                      {gradeClasses.map((schoolClass) => {
                        const active = (slotClassIds[slot.id] ?? []).includes(schoolClass.id);
                        const rombel = schoolClass.name
                          .replace(new RegExp(`^${schoolClass.grade ?? ''}`), '')
                          .replace(/^[\s-]+/, '') || schoolClass.name;
                        return (
                          <button
                            className={active ? 'min-w-0 rounded-lg bg-emerald-600 px-2 py-2 text-xs font-black text-white sm:min-w-11 sm:px-3' : 'min-w-0 rounded-lg border border-blue-100 bg-blue-50/50 px-2 py-2 text-xs font-black text-slate-700 sm:min-w-11 sm:px-3'}
                            key={schoolClass.id}
                            onClick={() => toggleSlotClass(slot, schoolClass.id)}
                            type="button"
                          >
                            <span className="block truncate">{active ? '✓ ' : ''}{rombel}</span>
                          </button>
                        );
                      })}
                      {!gradeClasses.length ? (
                        <p className="w-full rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                          Belum ada rombel untuk tingkat {selectedGrade} pada tahun ajaran ini.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold text-brand-700">
              Klik jam yang digunakan, lalu pilih rombel kelasnya.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
          <button
            className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            disabled={
              submitState === 'loading' ||
              !form.teacherId ||
              !form.subjectId ||
              Object.values(slotClassIds).every((classIds) => classIds.length === 0) ||
              !form.semesterId
            }
            type="submit"
          >
            {submitState === 'loading'
              ? 'Menyimpan...'
              : editingId
                ? 'Simpan Perubahan'
                : 'Simpan Jadwal'}
          </button>
          {editingId ? (
            <button
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 sm:w-auto"
              onClick={() => {
                setEditingId(null);
                setForm(emptyScheduleForm);
              }}
              type="button"
            >
              Batal
            </button>
          ) : null}
        </div>

        {message ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            {message}
          </p>
        ) : null}
      </form>

      <div className="min-w-0 space-y-4">
        <div className="min-w-0 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
          <div>
            <div className="min-w-0">
              <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
                Jadwal Kelas
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">
                {selectedScheduleClass?.name ?? 'Pilih Kelas'}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Tabel ini menampilkan jadwal kelas sesuai tanggal kondisi yang dipilih.
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="max-w-sm">
                <DateControl
                  description="Melihat jadwal yang berlaku pada tanggal ini."
                  label="Lihat kondisi jadwal"
                  onChange={setViewDate}
                  value={viewDate}
                />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {Object.entries(classesByGrade).map(([grade, gradeClasses]) => (
                <div className="grid gap-2 sm:grid-cols-[4rem_1fr]" key={grade}>
                  <p className="pt-2 text-xs font-black text-muted">Kelas {grade}</p>
                  <div className="flex flex-wrap gap-2">
                    {gradeClasses.map((schoolClass) => {
                      const active = schoolClass.id === scheduleClassId;
                      return (
                        <button
                          className={[
                            'rounded-xl border px-3 py-2 text-xs font-black transition',
                            active
                              ? 'border-brand-600 bg-brand-600 text-white shadow-md shadow-blue-100'
                              : 'border-blue-100 bg-blue-50/60 text-brand-700 hover:bg-blue-100',
                          ].join(' ')}
                          key={schoolClass.id}
                          onClick={() => setScheduleClassId(schoolClass.id)}
                          type="button"
                        >
                          {schoolClass.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedScheduleClass?.homeroomTeacher ? (
            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-brand-700">
              Wali kelas: {selectedScheduleClass.homeroomTeacher.name}
            </div>
          ) : null}

          <div className="mt-5 flex justify-end">
            <label className="grid w-full gap-1 text-sm font-semibold text-slate-700 sm:w-56">
              Filter hari
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-brand-600"
                onChange={(event) => setScheduleDayFilter(event.target.value)}
                value={scheduleDayFilter}
              >
                <option value="all">Semua hari</option>
                {dayOptions.map((day) => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 max-w-full overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full min-w-[560px] border-collapse bg-white text-left text-sm sm:min-w-[720px]">
              <thead className="bg-slate-50 text-xs font-black tracking-[0.08em] text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Hari</th>
                  <th className="px-4 py-3">Jam</th>
                  <th className="px-4 py-3">Mata Pelajaran</th>
                  <th className="px-4 py-3">Guru</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedulesByClass.map((schedule) => (
                  <tr key={schedule.id}>
                    <td className="px-4 py-3 font-black text-slate-800">
                      {getDayLabel(schedule.dayOfWeek)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {schedule.startsAt}-{schedule.endsAt}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {schedule.subject.name}
                      {'hasRevision' in schedule && schedule.hasRevision ? <span className="ml-2 text-xs text-amber-700">Revisi</span> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{schedule.teacher.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-brand-700"
                          onClick={() => startEdit(schedule)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                          onClick={() => void handleDelete(schedule)}
                          type="button"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {scheduleClassId && !schedulesByClass.length ? (
                  <tr>
                    <td className="px-4 py-5 text-sm font-semibold text-muted" colSpan={5}>
                      Belum ada jadwal untuk kelas dan hari yang dipilih.
                    </td>
                  </tr>
                ) : null}

                {!scheduleClassId ? (
                  <tr>
                    <td className="px-4 py-5 text-sm font-semibold text-muted" colSpan={5}>
                      Pilih kelas untuk melihat tabel jadwal.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {canGenerateAgenda ? (
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="mb-4">
                <p className="text-xs font-black tracking-[0.12em] text-emerald-700 uppercase">
                  Generate Agenda
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                  Buat agenda harian berdasarkan jadwal efektif pada setiap tanggal.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <DateControl
                  description="Tanggal pertama agenda yang akan dibuat."
                  label="Generate mulai"
                  onChange={setGenerateStartsAt}
                  value={generateStartsAt}
                />
                <DateControl
                  description="Tanggal terakhir agenda yang akan dibuat."
                  label="Generate sampai"
                  onChange={setGenerateEndsAt}
                  value={generateEndsAt}
                />
              </div>
              <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <button
                  className="min-h-12 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 transition hover:bg-amber-100"
                  onClick={() => void checkAgendaCoverage(scheduleClassId || undefined)}
                  type="button"
                >
                  Cek Agenda Kelas
                </button>
                <button
                  className="min-h-12 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!scheduleClassId || !form.schoolYearId || submitState === 'loading'}
                  onClick={() => void handleGenerateAgendas({ classId: scheduleClassId })}
                  type="button"
                >
                  Generate Agenda Kelas
                </button>
                <button
                  className="min-h-12 rounded-xl border border-emerald-600 bg-white px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!agendaClassIds.length || !form.schoolYearId || submitState === 'loading'}
                  onClick={() => void handleGenerateAgendas({ classIds: agendaClassIds })}
                  type="button"
                >
                  Generate Semua Kelas VII-IX
                </button>
              </div>
              {agendaCoverage ? (
                <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 p-3 text-sm font-bold text-slate-700">
                  Agenda tersedia: {agendaCoverage.existing}/{agendaCoverage.expected}. Belum dibuat: {agendaCoverage.missing}. Hari diblokir Kaldik: {agendaCoverage.blockedDates}.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {canGenerateAgenda && generatedAgendas.length ? (
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5 text-sm text-brand-700">
            <p>Agenda: <strong>{generatedAgendas.length}</strong> sesi untuk {formatDateDisplay(generateStartsAt)} sampai {formatDateDisplay(generateEndsAt)} sudah diproses.</p>
            <div className="mt-3 grid gap-2">
              {generatedAgendas.slice(0, 8).map((agenda) => (
                <div className="rounded-xl bg-white p-3" key={agenda.id}>
                  <p className="font-black text-slate-800">{agenda.class.name} · {agenda.subject.name}</p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {formatDateDisplay(agenda.date)} · Guru utama: {agenda.teacher.name}
                    {agenda.substituteTeacher ? ` · Pengganti: ${agenda.substituteTeacher.name}` : ''}
                  </p>
                  <select
                    className="mt-2 w-full rounded-xl border border-blue-100 px-3 py-2 text-xs font-bold text-slate-700"
                    onChange={(event) => void assignSubstitute(agenda, event.target.value)}
                    value={agenda.substituteTeacher?.id ?? ''}
                  >
                    <option value="">Tanpa guru pengganti</option>
                    {teachers.filter((teacher) => teacher.id !== agenda.teacher.id).map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
