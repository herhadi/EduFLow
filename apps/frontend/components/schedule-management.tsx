'use client';

import { sortSchoolClasses } from '@eduflow/shared';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getCurrentSessionUser } from '../lib/session';
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

const dayOptions = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 7, label: 'Minggu' },
];

const emptyForm: SchedulePayload = {
  schoolYearId: '',
  semesterId: '',
  classId: '',
  subjectId: '',
  teacherId: '',
  dayOfWeek: 1,
  startsAt: '07:00',
  endsAt: '08:30',
};

export function ScheduleManagement() {
  const [, setLoadState] = useState<LoadState>('idle');
  const [submitState, setSubmitState] = useState<LoadState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generateDate, setGenerateDate] = useState(getToday());
  const [generatedAgenda, setGeneratedAgenda] = useState<DailyAgenda | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [timeSlots, setTimeSlots] = useState<AcademicTimeSlot[]>([]);
  const [form, setForm] = useState<SchedulePayload>(emptyForm);
  const [selectedGrade, setSelectedGrade] = useState('VII');
  const [slotClassIds, setSlotClassIds] = useState<Record<string, string[]>>({});
  const [expandedTimeSlotIds, setExpandedTimeSlotIds] = useState<string[]>([]);
  const [classTimeSlotActivities, setClassTimeSlotActivities] = useState<ClassTimeSlotActivity[]>([]);
  const [scheduleClassId, setScheduleClassId] = useState('');
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

      if (!form.schoolYearId && schoolYearResponse.data[0]) {
        const firstSchoolYear = schoolYearResponse.data[0];
        const firstSemester = semesterResponse.data.find(
          (semester) => semester.schoolYearId === firstSchoolYear.id,
        );
        const firstClass = classResponse.data.find(
          (schoolClass) => schoolClass.schoolYearId === firstSchoolYear.id,
        );
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
      teachers.flatMap((teacher) =>
        (teacher.subjects ?? []).map(({ subject }) => ({
          label: `${teacher.name} · ${subject.name}`,
          value: `${teacher.id}:${subject.id}`,
        })),
      ),
    [teachers],
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

  const selectedScheduleClass = useMemo(
    () => classes.find((schoolClass) => schoolClass.id === scheduleClassId),
    [classes, scheduleClassId],
  );

  const classesByGrade = useMemo(
    () => {
      const sortedClasses = sortSchoolClasses(classes);

      return sortedClasses.reduce<Record<string, SchoolClass[]>>((groups, schoolClass) => {
        const grade = schoolClass.grade ?? 'Lainnya';
        groups[grade] = [...(groups[grade] ?? []), schoolClass];
        return groups;
      }, {});
    },
    [classes],
  );

  const schedulesByClass = useMemo(
    () =>
      schedules
        .filter((schedule) => schedule.classId === scheduleClassId)
        .sort(
          (firstSchedule, secondSchedule) =>
            firstSchedule.dayOfWeek - secondSchedule.dayOfWeek ||
            firstSchedule.startsAt.localeCompare(secondSchedule.startsAt),
        ),
    [scheduleClassId, schedules],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState('loading');
    setMessage(null);

    try {
      const response = editingId
        ? await api.updateSchedule(editingId, form)
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

  async function handleGenerate(schedule: Schedule) {
    setMessage(null);
    setGeneratedAgenda(null);

    try {
      const response = await api.generateAgenda(schedule.id, generateDate);
      setGeneratedAgenda(response.data);
      setMessage(response.message ?? 'Agenda berhasil digenerate.');
    } catch {
      setMessage('Generate agenda gagal. Periksa tanggal dan backend.');
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
    <section className="mt-10 grid gap-6 xl:grid-cols-[420px_1fr]">
      <form
        className="rounded-2xl border border-slate-200 bg-white p-6"
        onSubmit={handleSubmit}
      >
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
            {editingId ? 'Edit Jadwal' : 'Create Jadwal'}
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            {editingId ? 'Ubah Jadwal' : 'Tambah Jadwal'}
          </h2>
        </div>

        <div className="mt-6 grid gap-4">
          <SelectField
            label="Tahun Ajaran"
            onChange={(value) => {
              const firstClass = classes.find(
                (schoolClass) => schoolClass.schoolYearId === value,
              );
              setForm((currentForm) => ({
                ...currentForm,
                schoolYearId: value,
                semesterId:
                  semesters.find((semester) => semester.schoolYearId === value)?.id ?? '',
                classId: '',
              }));
              setSelectedGrade(firstClass?.grade ?? 'VII');
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
            onChange={(value) => setForm({ ...form, semesterId: value })}
            options={filteredSemesters.map((semester) => ({
              label: semester.type === 'ODD' ? 'Ganjil' : 'Genap',
              value: semester.id,
            }))}
            value={form.semesterId}
          />

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
          <p className="-mt-2 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-brand-700">
            Mata pelajaran mengikuti pilihan guru pengampu. Guru dengan dua mapel tampil sebagai dua opsi terpisah.
          </p>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-sm font-black text-slate-800">Pilih Kelas</p>
            <p className="mt-1 text-xs font-semibold text-muted">Pilih tingkat. Rombel A, B, C, dan seterusnya dipilih pada setiap jam.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {availableGrades.map((grade) => (
                <button
                  className={selectedGrade === grade ? 'rounded-xl bg-brand-600 px-3 py-3 text-sm font-black text-white' : 'rounded-xl border border-blue-100 bg-white px-3 py-3 text-sm font-black text-brand-700'}
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
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-xs font-black tracking-[0.1em] text-brand-700 uppercase">
              Susunan Hari Ini
            </p>
            <div className="mt-3 space-y-2">
              {dayTimeSlots.map((slot) => slot.type === 'BREAK' || slot.type === 'RELIGIOUS' ? (
                <div className="rounded-xl bg-amber-50 p-3" key={slot.id}>
                  <div className="flex items-center justify-between gap-3 text-xs font-bold text-amber-900">
                    <span>{slot.startsAt}-{slot.endsAt}</span>
                    <span>{slot.type === 'RELIGIOUS' ? 'Jeda kedua' : 'Istirahat'}</span>
                  </div>
                  {slot.type === 'RELIGIOUS' ? <div className="mt-2 grid grid-cols-2 gap-2">
                    {(['BREAK', 'RELIGIOUS'] as const).map((type) => {
                      const currentType = classTimeSlotActivities.find(
                        (activity) => activity.timeSlotId === slot.id,
                      )?.type ?? 'BREAK';
                      return (
                        <button
                          className={`rounded-lg px-2 py-2 text-[11px] font-bold ${currentType === type ? 'bg-brand-600 text-white' : 'bg-white text-slate-700'}`}
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
                <div className="rounded-xl bg-white p-3" key={slot.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 text-left text-xs font-bold text-slate-700"
                    disabled={!slot.isAssignable}
                    onClick={() => toggleTimeSlotPanel(slot.id)}
                    type="button"
                  >
                    <span>{slot.name}</span>
                    <span className="flex items-center gap-2">
                      {slot.startsAt}-{slot.endsAt}
                      <span className="text-brand-700">{expandedTimeSlotIds.includes(slot.id) ? '−' : '+'}</span>
                    </span>
                  </button>
                  {slot.isAssignable && expandedTimeSlotIds.includes(slot.id) ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {gradeClasses.map((schoolClass) => {
                        const active = (slotClassIds[slot.id] ?? []).includes(schoolClass.id);
                        const rombel = schoolClass.name
                          .replace(new RegExp(`^${schoolClass.grade ?? ''}`), '')
                          .replace(/^[\s-]+/, '') || schoolClass.name;
                        return (
                          <button
                            className={active ? 'min-w-11 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white' : 'min-w-11 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs font-black text-slate-700'}
                            key={schoolClass.id}
                            onClick={() => toggleSlotClass(slot, schoolClass.id)}
                            type="button"
                          >
                            {active ? '✓ ' : ''}{rombel}
                          </button>
                        );
                      })}
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

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
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

      <div className="space-y-4">
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
              <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
                Jadwal Kelas
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">
                {selectedScheduleClass?.name ?? 'Pilih Kelas'}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Tabel ini membantu cek mapel, guru, dan jam mengajar per kelas.
              </p>
              </div>
              {canGenerateAgenda ? <InputField
                label="Tanggal agenda"
                onChange={setGenerateDate}
                type="date"
                value={generateDate}
              /> : null}
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

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-[720px] w-full border-collapse bg-white text-left text-sm">
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
                      {canGenerateAgenda ? <button
                        className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                        onClick={() => void handleGenerate(schedule)}
                        type="button"
                      >
                        Generate Agenda
                      </button> : null}
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
                      Belum ada jadwal untuk kelas ini.
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
        </div>

        {canGenerateAgenda && generatedAgenda ? (
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5 text-sm text-brand-700">
            Agenda: <strong>{generatedAgenda.class.name}</strong> ·{' '}
            {generatedAgenda.subject.name} · {generatedAgenda.status}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select
        className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-brand-600"
        onChange={(event) => onChange(event.target.value)}
        required
        value={value}
      >
        <option value="">Pilih {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InputField({
  label,
  onChange,
  type,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type: 'date' | 'time';
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <input
        className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-brand-600"
        onChange={(event) => onChange(event.target.value)}
        required
        type={type}
        value={value}
      />
    </label>
  );
}

function getDayLabel(dayOfWeek: number) {
  return dayOptions.find((day) => day.value === dayOfWeek)?.label ?? `Hari ${dayOfWeek}`;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}
