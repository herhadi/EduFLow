'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  api,
  type DailyAgenda,
  type Schedule,
  type SchedulePayload,
  type SchoolClass,
  type SchoolYear,
  type Semester,
  type Subject,
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [form, setForm] = useState<SchedulePayload>(emptyForm);

  async function loadData() {
    setLoadState('loading');

    try {
      const [
        scheduleResponse,
        schoolYearResponse,
        semesterResponse,
        classResponse,
        subjectResponse,
        teacherResponse,
      ] = await Promise.all([
        api.getSchedules(),
        api.getSchoolYears(),
        api.getSemesters(),
        api.getClasses(),
        api.getSubjects(),
        api.getTeachers(),
      ]);

      setSchedules(scheduleResponse.data);
      setSchoolYears(schoolYearResponse.data);
      setSemesters(semesterResponse.data);
      setClasses(classResponse.data);
      setSubjects(subjectResponse.data);
      setTeachers(teacherResponse.data);
      setLoadState('success');

      if (!form.schoolYearId && schoolYearResponse.data[0]) {
        const firstSchoolYear = schoolYearResponse.data[0];
        const firstSemester = semesterResponse.data.find(
          (semester) => semester.schoolYearId === firstSchoolYear.id,
        );
        const firstClass = classResponse.data.find(
          (schoolClass) => schoolClass.schoolYearId === firstSchoolYear.id,
        );
        const firstSubject = subjectResponse.data[0];
        const firstTeacher = firstSubject
          ? teacherResponse.data.find((teacher) =>
              teacher.subjects?.some(({ subject }) => subject.id === firstSubject.id),
            )
          : undefined;

        setForm((currentForm) => ({
          ...currentForm,
          schoolYearId: firstSchoolYear.id,
          semesterId: firstSemester?.id ?? '',
          classId: firstClass?.id ?? '',
          subjectId: firstSubject?.id ?? '',
          teacherId: firstTeacher?.id ?? '',
        }));
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
    () => classes.filter((schoolClass) => schoolClass.schoolYearId === form.schoolYearId),
    [classes, form.schoolYearId],
  );

  const selectedClass = useMemo(
    () => classes.find((schoolClass) => schoolClass.id === form.classId),
    [classes, form.classId],
  );

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === form.subjectId),
    [form.subjectId, subjects],
  );

  const subjectTeachers = useMemo(() => {
    if (!form.subjectId) {
      return teachers;
    }

    return teachers.filter((teacher) =>
      teacher.subjects?.some(({ subject }) => subject.id === form.subjectId),
    );
  }, [form.subjectId, teachers]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState('loading');
    setMessage(null);

    try {
      const response = editingId
        ? await api.updateSchedule(editingId, form)
        : await api.createSchedule(form);

      setMessage(response.message ?? 'Jadwal berhasil disimpan.');
      setEditingId(null);
      setForm(emptyForm);
      await loadData();
      setSubmitState('success');
    } catch {
      setMessage('Jadwal gagal disimpan. Periksa isian dan backend.');
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
            onChange={(value) => setForm({ ...form, classId: value })}
            options={filteredClasses.map((schoolClass) => ({
              label: schoolClass.homeroomTeacher
                ? `${schoolClass.name} · Wali: ${schoolClass.homeroomTeacher.name}`
                : schoolClass.name,
              value: schoolClass.id,
            }))}
            value={form.classId}
          />
          {selectedClass?.homeroomTeacher ? (
            <p className="-mt-2 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-semibold text-brand-700">
              Wali kelas: {selectedClass.homeroomTeacher.name}
            </p>
          ) : null}
          <SelectField
            label="Mata Pelajaran"
            onChange={(value) => {
              const firstTeacherForSubject = teachers.find((teacher) =>
                teacher.subjects?.some(({ subject }) => subject.id === value),
              );

              setForm({
                ...form,
                subjectId: value,
                teacherId: firstTeacherForSubject?.id ?? '',
              });
            }}
            options={subjects.map((subject) => ({
              label: subject.name,
              value: subject.id,
            }))}
            value={form.subjectId}
          />
          <SelectField
            label="Guru"
            onChange={(value) => setForm({ ...form, teacherId: value })}
            options={subjectTeachers.map((teacher) => ({
              label: teacher.name,
              value: teacher.id,
            }))}
            value={form.teacherId}
          />
          {selectedSubject && subjectTeachers.length === 0 ? (
            <p className="-mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              Belum ada guru yang diatur mengampu {selectedSubject.name}. Atur dulu di Admin Guru.
            </p>
          ) : null}
          <SelectField
            label="Hari"
            onChange={(value) => setForm({ ...form, dayOfWeek: Number(value) })}
            options={dayOptions.map((day) => ({
              label: day.label,
              value: String(day.value),
            }))}
            value={String(form.dayOfWeek)}
          />

          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Mulai"
              onChange={(value) => setForm({ ...form, startsAt: value })}
              type="time"
              value={form.startsAt}
            />
            <InputField
              label="Selesai"
              onChange={(value) => setForm({ ...form, endsAt: value })}
              type="time"
              value={form.endsAt}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitState === 'loading'}
            type="submit"
          >
            {submitState === 'loading'
              ? 'Menyimpan...'
              : editingId
                ? 'Simpan Perubahan'
                : 'Buat Jadwal'}
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
