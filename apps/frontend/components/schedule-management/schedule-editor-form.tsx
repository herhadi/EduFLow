import {
  type FormEvent,
} from 'react';
import {
  type AcademicTimeSlot,
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
  scheduleTimeSlots: AcademicTimeSlot[];
  editingId: string | null;
  editingSchedule?: Schedule;
  effectiveFrom: string;
  filteredSemesters: Semester[];
  form: SchedulePayload;
  gradeClasses: SchoolClass[];
  handleCancelRevision: (revisionId: string) => void;
  message: string | null;
  onCancelEdit: () => void;
  onGradeChange: (grade: string) => void;
  onSchoolYearChange: (value: string) => void;
  onSemesterChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTeacherSubjectChange: (value: string) => void;
  revisionReason: string;
  schoolYears: SchoolYear[];
  selectedGrade: string;
  setEffectiveFrom: (value: string) => void;
  setRevisionReason: (value: string) => void;
  slotClassIds: Record<string, string[]>;
  submitState: LoadState;
  teacherSubjectOptions: TeacherSubjectOption[];
  toggleSlotClass: (slot: AcademicTimeSlot, classId: string) => void;
};

export function ScheduleEditorForm({
  availableGrades,
  scheduleTimeSlots,
  editingId,
  editingSchedule,
  effectiveFrom,
  filteredSemesters,
  form,
  gradeClasses,
  handleCancelRevision,
  message,
  onCancelEdit,
  onGradeChange,
  onSchoolYearChange,
  onSemesterChange,
  onSubmit,
  onTeacherSubjectChange,
  revisionReason,
  schoolYears,
  selectedGrade,
  setEffectiveFrom,
  setRevisionReason,
  slotClassIds,
  submitState,
  teacherSubjectOptions,
  toggleSlotClass,
}: ScheduleEditorFormProps) {
  const selectedTeacherSubject = teacherSubjectOptions.find((option) => option.value === `${form.teacherId}:${form.subjectId}`)?.label ?? 'Belum dipilih';
  const selectedSchoolYear = schoolYears.find((year) => year.id === form.schoolYearId)?.name ?? 'Belum dipilih';
  const selectedSemester = filteredSemesters.find((semester) => semester.id === form.semesterId);
  const selectedSemesterLabel = selectedSemester ? (selectedSemester.type === 'ODD' ? 'Ganjil' : 'Genap') : 'Belum dipilih';

  return (
    <form
      className="w-full min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-4 dark:border-[var(--border)] dark:bg-[var(--surface-solid)] sm:p-6"
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
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
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
        </div>
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
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
            <p className="text-xs font-black tracking-[0.1em] text-amber-800 uppercase">
              Histori Revisi
            </p>
            <div className="mt-3 space-y-2">
              {editingSchedule.revisions.map((revision) => (
                <div className="rounded-xl bg-white p-3 text-xs font-semibold text-slate-700 dark:bg-[var(--surface-solid)] dark:text-[var(--text-soft)]" key={revision.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900 dark:text-[var(--text)]">
                        {formatDateDisplay(revision.effectiveFrom)} · {revision.class.name}
                      </p>
                      <p className="mt-1">
                        {getDayLabel(revision.dayOfWeek)} {revision.startsAt}-{revision.endsAt} · {revision.subject.name} · {revision.teacher.name}
                      </p>
                      {revision.reason ? <p className="mt-1 text-amber-800">{revision.reason}</p> : null}
                    </div>
                    <Button
                      className="border-red-100 bg-red-50 text-[11px] text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100"
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

        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 lg:items-start">
        <div className="min-w-0">
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
        <p className="mt-2 rounded-2xl bg-blue-50 px-3 py-2.5 text-xs font-semibold leading-5 text-brand-700 dark:bg-blue-400/10 dark:text-blue-100 sm:px-4 sm:py-3">
          Mata pelajaran mengikuti pilihan guru pengampu. Guru dengan dua mapel tampil sebagai dua opsi terpisah.
        </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-400/20 dark:bg-blue-400/10 sm:p-4">
          <p className="text-sm font-black text-slate-800 dark:text-[var(--text)]">Pilih Kelas</p>
          <p className="mt-1 text-xs font-semibold text-muted">Pilih tingkat untuk menentukan rombel pada matriks.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {availableGrades.map((grade) => (
              <button
                className={selectedGrade === grade ? 'min-w-0 rounded-xl bg-brand-600 px-2 py-2.5 text-sm font-black text-white sm:px-3 sm:py-3' : 'min-w-0 rounded-xl border border-blue-100 bg-white px-2 py-2.5 text-sm font-black text-brand-700 dark:border-blue-400/20 dark:bg-[var(--surface-solid)] dark:text-blue-100 sm:px-3 sm:py-3'}
                key={grade}
                onClick={() => onGradeChange(grade)}
                type="button"
              >{grade}</button>
            ))}
          </div>
        </div>
        </div>
        <div className="sticky top-20 z-20 -mx-1 rounded-xl border border-blue-200 bg-blue-50/95 px-3 py-2 shadow-sm backdrop-blur dark:border-blue-400/35 dark:bg-slate-950/95 sm:mx-0">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <span className="shrink-0 text-[10px] font-black tracking-wide text-blue-700 uppercase dark:text-blue-200">Pilihan</span>
                <span className="min-w-0 truncate text-sm font-extrabold text-slate-900 dark:text-white">{selectedTeacherSubject}</span>
              </div>
              <p className="mt-0.5 truncate text-xs font-semibold text-blue-900 dark:text-blue-100">{selectedSchoolYear} · Semester {selectedSemesterLabel} · Kelas {selectedGrade || '-'}</p>
            </div>
            <span className="shrink-0 rounded-lg border border-blue-200 bg-white px-2 py-1 text-[10px] font-bold text-blue-800 dark:border-blue-300/30 dark:bg-blue-400/15 dark:text-blue-100">{Object.values(slotClassIds).reduce((total, ids) => total + ids.length, 0)} pilihan</span>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-400/20 dark:bg-blue-400/10 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black tracking-[0.1em] text-brand-700 uppercase">Matriks Jadwal Mingguan</p>
              <p className="mt-1 text-xs font-semibold text-muted">Pilih rombel langsung pada slot yang akan diisi. Slot nonpelajaran hanya sebagai informasi.</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-700 dark:bg-[var(--surface-solid)] dark:text-blue-100">{Object.values(slotClassIds).reduce((total, ids) => total + ids.length, 0)} pilihan</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {dayOptions.map((day) => {
              const daySlots = scheduleTimeSlots.filter((slot) => slot.dayOfWeek === day.value);
              if (!daySlots.length) return null;
              return (
                <section className="overflow-hidden rounded-xl border border-blue-100 bg-white dark:border-blue-400/20 dark:bg-[var(--surface-solid)]" key={day.value}>
                  <h3 className="border-b border-blue-100 bg-blue-50/70 px-3 py-2 text-sm font-black text-brand-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100">{day.label}</h3>
                  <div className="divide-y divide-slate-100 dark:divide-[var(--border)]">
                    {daySlots.map((slot) => {
                      const selectedIds = slotClassIds[slot.id] ?? [];
                      return (
                        <div className="grid min-w-0 gap-2 p-3 sm:grid-cols-[minmax(7rem,0.75fr)_minmax(0,1.5fr)] sm:items-start" key={slot.id}>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-slate-800 dark:text-[var(--text)]">{slot.name}</p>
                            <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-muted">{slot.startsAt}–{slot.endsAt}</p>
                            {!slot.isAssignable ? <span className="mt-1 inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-400/10 dark:text-amber-100">Mengikuti Data Master</span> : null}
                          </div>
                          {slot.isAssignable ? (
                            <div className="flex min-w-0 flex-wrap gap-1.5">
                              {gradeClasses.map((schoolClass) => {
                                const active = selectedIds.includes(schoolClass.id);
                                const rombel = schoolClass.name.replace(new RegExp(`^${schoolClass.grade ?? ''}`), '').replace(/^[\s-]+/, '') || schoolClass.name;
                                return (
                                  <button
                                    aria-pressed={active}
                                    className={active ? 'min-w-10 rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-black text-white' : 'min-w-10 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-700 hover:border-brand-400 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text-soft)]'}
                                    key={schoolClass.id}
                                    onClick={() => toggleSlotClass(slot, schoolClass.id)}
                                    type="button"
                                  >{active ? '✓ ' : ''}{rombel}</button>
                                );
                              })}
                              {!gradeClasses.length ? <p className="text-xs text-muted">Belum ada rombel tingkat {selectedGrade}.</p> : null}
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-muted">Tidak memerlukan penugasan guru atau rombel.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-brand-700 dark:text-blue-100">Pilih guru pengampu di atas, kemudian tandai rombel pada setiap slot. Pemilihan dapat dilakukan lintas hari tanpa mengganti dropdown hari.</p>
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
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-[var(--surface-soft)] dark:text-[var(--text)]">
          {message}
        </p>
      ) : null}
    </form>
  );
}
