'use client';

import { type Dispatch, type ReactNode, type SetStateAction, useState } from 'react';
import {
  type AssessmentType,
  type SchoolClass,
  type SchoolYear,
  type Semester,
  type Subject,
} from '../../lib/api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { fieldClass, FormField } from '../ui/form';
import {
  assessmentTypeLabels,
  type AssessmentFormState,
} from './teacher-assessment-utils';

type AssessmentFormCardProps = {
  classes: SchoolClass[];
  form: AssessmentFormState;
  onCreate: () => void;
  saving: boolean;
  schoolYears: SchoolYear[];
  semesters: Semester[];
  setForm: Dispatch<SetStateAction<AssessmentFormState>>;
  subjects: Subject[];
};

export function AssessmentFormCard({
  classes,
  form,
  onCreate,
  saving,
  schoolYears,
  semesters,
  setForm,
  subjects,
}: AssessmentFormCardProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const canCreate = Boolean(
    form.schoolYearId &&
    form.semesterId &&
    form.classId &&
    form.subjectId &&
    form.title.trim(),
  );
  const selectedClass = classes.find((schoolClass) => schoolClass.id === form.classId);
  const selectedSubject = subjects.find((subject) => subject.id === form.subjectId);
  const missingFields = [
    form.schoolYearId ? null : 'tahun ajaran',
    form.semesterId ? null : 'semester',
    form.classId ? null : 'kelas',
    form.subjectId ? null : 'mapel',
    form.title.trim() ? null : 'judul',
  ].filter(Boolean);

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">Nilai Harian</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">Buat Komponen Nilai</h2>
          <p className="mt-1 text-sm text-muted">
            Default mengikuti tahun ajaran dan semester berjalan. Buka form saat akan membuat komponen baru.
          </p>
        </div>
        <Button
          aria-expanded={isFormOpen}
          className="w-full shadow-sm sm:w-auto"
          onClick={() => setIsFormOpen((current) => !current)}
          variant={isFormOpen ? 'outline' : 'primary'}
        >
          {isFormOpen ? 'Tutup Form' : 'Atur Komponen'}
        </Button>
      </div>

      {!isFormOpen ? (
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm dark:border-blue-400/20 dark:bg-blue-950/30">
          <p className="font-black text-slate-900 dark:text-slate-100">
            {form.title.trim()
              ? form.title.trim()
              : 'Belum ada judul komponen nilai'}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300">
            {canCreate
              ? `${selectedClass?.name ?? 'Kelas'} · ${selectedSubject?.name ?? 'Mapel'} · ${assessmentTypeLabels[form.type]} · skor maksimal ${form.maxScore}`
              : `Masih perlu melengkapi ${missingFields.join(', ')} sebelum draft bisa dibuat.`}
          </p>
          <p className="mt-2 text-xs font-semibold text-muted">
            Tombol Buat Draft hanya muncul di bagian bawah form agar tidak terpencet sebelum input siap.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <FormSelect
              label="Tahun Ajaran"
              onChange={(value) => setForm((current) => ({ ...current, schoolYearId: value }))}
              value={form.schoolYearId}
            >
              {schoolYears.map((schoolYear) => (
                <option key={schoolYear.id} value={schoolYear.id}>{schoolYear.name}</option>
              ))}
            </FormSelect>
            <FormSelect
              label="Semester"
              onChange={(value) => setForm((current) => ({ ...current, semesterId: value }))}
              value={form.semesterId}
            >
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>{semester.type === 'ODD' ? 'Ganjil' : 'Genap'}</option>
              ))}
            </FormSelect>
            <FormSelect
              label="Kelas"
              onChange={(value) => setForm((current) => ({ ...current, classId: value }))}
              value={form.classId}
            >
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
              ))}
            </FormSelect>
            <FormSelect
              label="Mapel"
              onChange={(value) => setForm((current) => ({ ...current, subjectId: value }))}
              value={form.subjectId}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </FormSelect>
            <FormField className="md:col-span-2" label="Judul">
              <input
                className={fieldClass}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Contoh: Kuis Bab 1"
                value={form.title}
              />
            </FormField>
            <FormSelect
              label="Jenis"
              onChange={(value) => setForm((current) => ({ ...current, type: value as AssessmentType }))}
              value={form.type}
            >
              {Object.entries(assessmentTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </FormSelect>
            <FormField label="Tanggal">
              <input
                className={fieldClass}
                onChange={(event) => setForm((current) => ({ ...current, assessmentDate: event.target.value }))}
                type="date"
                value={form.assessmentDate}
              />
            </FormField>
            <FormField label="Skor Maks.">
              <input
                className={fieldClass}
                min={1}
                onChange={(event) => setForm((current) => ({ ...current, maxScore: Number(event.target.value) }))}
                type="number"
                value={form.maxScore}
              />
            </FormField>
            <FormField label="Bobot">
              <input
                className={fieldClass}
                min={0}
                onChange={(event) => setForm((current) => ({ ...current, weight: Number(event.target.value) }))}
                type="number"
                value={form.weight}
              />
            </FormField>
            <FormField className="md:col-span-2" label="Catatan">
              <input
                className={fieldClass}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Opsional"
                value={form.notes}
              />
            </FormField>
          </div>

          <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-end">
            {!canCreate ? (
              <p className="text-xs font-bold text-muted sm:mr-auto">
                Lengkapi tahun ajaran, semester, kelas, mapel, dan judul sebelum membuat draft.
              </p>
            ) : null}
            <Button disabled={saving || !canCreate} onClick={onCreate}>
              {saving ? 'Membuat...' : 'Buat Draft'}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

function FormSelect({
  children,
  label,
  onChange,
  value,
}: {
  children: ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <FormField label={label}>
      <select
        className={fieldClass}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </FormField>
  );
}
