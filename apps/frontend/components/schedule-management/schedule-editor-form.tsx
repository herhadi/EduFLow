import {
  type FormEvent,
} from 'react';
import {
  type AcademicTimeSlot,
  type ClassTimeSlotActivity,
  type Schedule,
  type SchedulePayload,
  type SchoolClass,
  type SchoolYear,
  type Semester,
} from '../../lib/api';
import { Button } from '../ui/button';
import { InputField, SelectField } from './schedule-form-controls';
import { dayOptions, formatDateDisplay, getDayLabel } from './schedule-management-utils';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

type TeacherSubjectOption = {
  label: string;
  value: string;
};

type ScheduleEditorFormProps = {
  availableGrades: string[];
  classTimeSlotActivities: ClassTimeSlotActivity[];
  dayTimeSlots: AcademicTimeSlot[];
  editingId: string | null;
  editingSchedule?: Schedule;
  effectiveFrom: string;
  filteredSemesters: Semester[];
  form: SchedulePayload;
  gradeClasses: SchoolClass[];
  handleCancelRevision: (revisionId: string) => void;
  message: string | null;
  onCancelEdit: () => void;
  onDayChange: (value: string) => void;
  onGradeChange: (grade: string) => void;
  onSchoolYearChange: (value: string) => void;
  onSemesterChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTeacherSubjectChange: (value: string) => void;
  revisionReason: string;
  schoolYears: SchoolYear[];
  selectedGrade: string;
  setBreakActivity: (
    slot: AcademicTimeSlot,
    type: ClassTimeSlotActivity['type'],
  ) => void;
  setEffectiveFrom: (value: string) => void;
  setRevisionReason: (value: string) => void;
  slotClassIds: Record<string, string[]>;
  submitState: LoadState;
  teacherSubjectOptions: TeacherSubjectOption[];
  toggleSlotClass: (slot: AcademicTimeSlot, classId: string) => void;
  toggleTimeSlotPanel: (timeSlotId: string) => void;
  expandedTimeSlotIds: string[];
};

export function ScheduleEditorForm({
  availableGrades,
  classTimeSlotActivities,
  dayTimeSlots,
  editingId,
  editingSchedule,
  effectiveFrom,
  filteredSemesters,
  form,
  gradeClasses,
  handleCancelRevision,
  message,
  onCancelEdit,
  onDayChange,
  onGradeChange,
  onSchoolYearChange,
  onSemesterChange,
  onSubmit,
  onTeacherSubjectChange,
  revisionReason,
  schoolYears,
  selectedGrade,
  setBreakActivity,
  setEffectiveFrom,
  setRevisionReason,
  slotClassIds,
  submitState,
  teacherSubjectOptions,
  toggleSlotClass,
  toggleTimeSlotPanel,
  expandedTimeSlotIds,
}: ScheduleEditorFormProps) {
  return (
    <form
      className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
      onSubmit={onSubmit}
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
          onChange={onSchoolYearChange}
          options={schoolYears.map((schoolYear) => ({
            label: schoolYear.name,
            value: schoolYear.id,
          }))}
          value={form.schoolYearId}
        />
        <SelectField
          label="Semester"
          onChange={onSemesterChange}
          options={filteredSemesters.map((semester) => ({
            label: semester.type === 'ODD' ? 'Ganjil' : 'Genap',
            value: semester.id,
          }))}
          value={form.semesterId}
        />
        {editingId ? (
          <>
            <InputField
              label="Berlaku mulai (opsional)"
              onChange={setEffectiveFrom}
              required={false}
              type="date"
              value={effectiveFrom}
            />
            <InputField
              label="Alasan revisi"
              onChange={setRevisionReason}
              required={false}
              value={revisionReason}
            />
          </>
        ) : null}

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
                    <Button
                      className="border-red-100 bg-red-50 text-[11px] text-red-700 hover:bg-red-100 hover:text-red-800"
                      onClick={() => void handleCancelRevision(revision.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Batalkan
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <SelectField
          label="Guru Pengampu"
          onChange={onTeacherSubjectChange}
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
                onClick={() => onGradeChange(grade)}
                type="button"
              >
                {grade}
              </button>
            ))}
          </div>
        </div>
        <SelectField
          label="Hari"
          onChange={onDayChange}
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
        <Button
          className="w-full sm:w-auto"
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
        </Button>
        {editingId ? (
          <Button
            className="w-full sm:w-auto"
            onClick={onCancelEdit}
            type="button"
            variant="outline"
          >
            Batal
          </Button>
        ) : null}
      </div>

      {message ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          {message}
        </p>
      ) : null}
    </form>
  );
}
