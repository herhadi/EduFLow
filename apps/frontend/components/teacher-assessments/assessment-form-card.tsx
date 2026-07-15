import { type Dispatch, type ReactNode, type SetStateAction } from 'react';
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
  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">Nilai Harian</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">Buat Komponen Nilai</h2>
          <p className="mt-1 text-sm text-muted">
            Nilai disimpan per kelas, mapel, semester, dan enrollment siswa.
          </p>
        </div>
        <Button disabled={saving} onClick={onCreate}>
          Buat Draft
        </Button>
      </div>

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
