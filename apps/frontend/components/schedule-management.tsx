'use client';

import { sortSchoolClasses } from '@eduflow/shared';
import { FormEvent, useEffect, useMemo, useState } from 'react';
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
  const [loadState, setLoadState] = useState<LoadState>('idle');
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
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState('');
  const [scheduleClassId, setScheduleClassId] = useState('');

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

        setSelectedTimeSlotId(
          timeSlotResponse.data.find(
            (slot) => slot.schoolYearId === firstSchoolYear.id && slot.isAssignable,
          )?.id ?? '',
        );

        setScheduleClassId(firstClass?.id ?? '');
      }
    } catch {
      setLoadState('error');
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

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
            classIds: [form.classId],
            subjectId: form.subjectId,
            teacherId: form.teacherId,
            timeSlotId: selectedTimeSlotId,
          } satisfies BulkSchedulePayload);

      setMessage(response.message ?? 'Jadwal berhasil disimpan.');
      setEditingId(null);
      setForm(emptyForm);
      setSelectedTimeSlotId('');
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
    setMessage(null);

    try {
      const response = await api.deleteSchedule(schedule.id);
      setMessage(response.message ?? 'Jadwal dinonaktifkan.');
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
    setSelectedTimeSlotId(schedule.timeSlotId ?? '');
    setMessage(null);
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
            onChange={(value) =>
              setForm((currentForm) => ({
                ...currentForm,
                schoolYearId: value,
                semesterId:
                  semesters.find((semester) => semester.schoolYearId === value)?.id ?? '',
                classId:
                  classes.find((schoolClass) => schoolClass.schoolYearId === value)?.id ??
                  '',
              }))
            }
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
            label="Kelas"
            onChange={(value) => {
              setForm({ ...form, classId: value });
            }}
            options={filteredClasses.map((schoolClass) => ({
              label: schoolClass.name,
              value: schoolClass.id,
            }))}
            value={form.classId}
          />
          <SelectField
            label="Hari"
            onChange={(value) => {
              const dayOfWeek = Number(value);
              const firstSlot = timeSlots.find(
                (slot) =>
                  slot.schoolYearId === form.schoolYearId &&
                  slot.dayOfWeek === dayOfWeek &&
                  slot.isAssignable,
              );
              setForm({ ...form, dayOfWeek });
              setSelectedTimeSlotId(firstSlot?.id ?? '');
            }}
            options={dayOptions.map((day) => ({
              label: day.label,
              value: String(day.value),
            }))}
            value={String(form.dayOfWeek)}
          />
          <SelectField
            label="Jam Pelajaran"
            onChange={setSelectedTimeSlotId}
            options={dayTimeSlots
              .filter((slot) => slot.isAssignable)
              .map((slot) => ({
                label: `${slot.name} · ${slot.startsAt}-${slot.endsAt}`,
                value: slot.id,
              }))}
            value={selectedTimeSlotId}
          />

          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-xs font-black tracking-[0.1em] text-brand-700 uppercase">
              Susunan Hari Ini
            </p>
            <div className="mt-3 space-y-2">
              {dayTimeSlots.map((slot) => (
                <div
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold ${
                    slot.id === selectedTimeSlotId
                      ? 'bg-brand-600 text-white'
                      : slot.isAssignable
                        ? 'bg-white text-slate-700'
                        : 'bg-amber-50 text-amber-800'
                  }`}
                  key={slot.id}
                >
                  <span>{slot.name}</span>
                  <span>{slot.startsAt}-{slot.endsAt}</span>
                </div>
              ))}
            </div>
          </div>

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
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              submitState === 'loading' ||
              !form.teacherId ||
              !form.subjectId ||
              !form.classId ||
              !selectedTimeSlotId ||
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
                      <button
                        className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-brand-700"
                        onClick={() => startEdit(schedule)}
                        type="button"
                      >
                        Edit
                      </button>
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

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">List Jadwal</h2>
              <p className="mt-1 text-sm text-muted">
                Template jadwal tetap. Presensi tetap memakai DailyAgenda.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <InputField
                label="Tanggal agenda"
                onChange={setGenerateDate}
                type="date"
                value={generateDate}
              />
            </div>
          </div>

          {loadState === 'error' ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              Jadwal belum bisa dimuat. Pastikan backend berjalan.
            </div>
          ) : null}

          <div className="mt-5 divide-y divide-slate-100">
            {schedules.map((schedule) => (
              <div className="grid gap-4 py-5" key={schedule.id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{schedule.class.name}</strong>
                    <span className="text-muted">•</span>
                    <span>{schedule.subject.name}</span>
                    <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
                      {getDayLabel(schedule.dayOfWeek)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {schedule.teacher.name} · {schedule.startsAt}-{schedule.endsAt} ·{' '}
                    {schedule.schoolYear.name}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => startEdit(schedule)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
                    onClick={() => void handleGenerate(schedule)}
                    type="button"
                  >
                    Generate Agenda
                  </button>
                  <button
                    className="rounded-xl border border-red-100 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    onClick={() => void handleDelete(schedule)}
                    type="button"
                  >
                    Nonaktifkan
                  </button>
                </div>
              </div>
            ))}

            {loadState === 'success' && schedules.length === 0 ? (
              <p className="py-4 text-sm text-muted">Belum ada jadwal.</p>
            ) : null}
          </div>
        </div>

        {generatedAgenda ? (
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
