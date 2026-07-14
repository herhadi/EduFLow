import { type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { type SchoolClass, type SchoolYear } from '../../lib/api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { fieldClass, FormField } from '../ui/form';
import {
  type AcademicClassFormState,
  type CloneSchoolYearMasterFormState,
  grades,
  schoolYearNamePattern,
} from './academic-master-constants';

type GroupedClasses = Array<{
  grade: string;
  classes: SchoolClass[];
}>;

type ClassManagementPanelProps = {
  classForm: AcademicClassFormState;
  cloneForm: CloneSchoolYearMasterFormState;
  groupedClasses: GroupedClasses;
  isCloningMaster: boolean;
  isCreatingSchoolYear: boolean;
  isSaving: boolean;
  onCreateClass: (event: FormEvent<HTMLFormElement>) => void;
  onCreateSchoolYear: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteClass: (schoolClass: SchoolClass) => void;
  onCloneSchoolYearMaster: (event: FormEvent<HTMLFormElement>) => void;
  schoolYearName: string;
  schoolYears: SchoolYear[];
  setClassForm: Dispatch<SetStateAction<AcademicClassFormState>>;
  setCloneForm: Dispatch<SetStateAction<CloneSchoolYearMasterFormState>>;
  setSchoolYearName: Dispatch<SetStateAction<string>>;
};

export function ClassManagementPanel({
  classForm,
  cloneForm,
  groupedClasses,
  isCloningMaster,
  isCreatingSchoolYear,
  isSaving,
  onCreateClass,
  onCreateSchoolYear,
  onDeleteClass,
  onCloneSchoolYearMaster,
  schoolYearName,
  schoolYears,
  setClassForm,
  setCloneForm,
  setSchoolYearName,
}: ClassManagementPanelProps) {
  return (
    <Card className="min-w-0 sm:p-6">
      <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">Rombongan Belajar</p>
      <h2 className="mt-1 text-2xl font-black text-ink">Manajemen Kelas</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        Jumlah kelas bebas menyesuaikan jumlah siswa. Tambah atau hapus rombel tanpa mengubah kode aplikasi.
      </p>

      <form className="mt-5 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={onCreateSchoolYear}>
        <FormField htmlFor="new-school-year" label="Tahun Ajaran Baru">
          <input
            className={`${fieldClass} border-blue-100 bg-blue-50/60 font-bold`}
            id="new-school-year"
            onChange={(event) => setSchoolYearName(event.target.value)}
            pattern={schoolYearNamePattern}
            placeholder="Contoh 2026/2027"
            value={schoolYearName}
          />
        </FormField>
        <Button className="self-end" disabled={isCreatingSchoolYear} type="submit" variant="outline">
          Tambah Tahun
        </Button>
      </form>

      <form className="mt-3 grid gap-3" onSubmit={onCreateClass}>
        <FormField htmlFor="class-school-year" label="Tahun Ajaran">
          <select
            className={`${fieldClass} border-blue-100 bg-blue-50/60 font-bold`}
            id="class-school-year"
            onChange={(event) => setClassForm((current) => ({ ...current, schoolYearId: event.target.value }))}
            value={classForm.schoolYearId}
          >
            {schoolYears.map((year) => (
              <option key={year.id} value={year.id}>{year.name}</option>
            ))}
          </select>
        </FormField>

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <FormField htmlFor="class-grade" label="Tingkat">
            <select
              className={`${fieldClass} border-blue-100 bg-blue-50/60 font-bold`}
              id="class-grade"
              onChange={(event) => setClassForm((current) => ({ ...current, grade: event.target.value }))}
              value={classForm.grade}
            >
              {grades.map((grade) => <option key={grade}>{grade}</option>)}
            </select>
          </FormField>
          <FormField htmlFor="class-rombel" label="Rombel">
            <input
              className={`${fieldClass} border-blue-100 bg-blue-50/60 uppercase`}
              id="class-rombel"
              maxLength={3}
              onChange={(event) => setClassForm((current) => ({ ...current, suffix: event.target.value }))}
              placeholder="A"
              value={classForm.suffix}
            />
          </FormField>
          <Button className="col-span-2 self-end sm:col-span-1" disabled={isSaving} type="submit">
            Tambah
          </Button>
        </div>
      </form>

      <div className="mt-5 space-y-4">
        {groupedClasses.map((group) => (
          <div key={group.grade}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-800">Kelas {group.grade}</h3>
              <Badge tone="brand">{group.classes.length}</Badge>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {group.classes.map((schoolClass) => (
                <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-blue-50 bg-slate-50 px-3 py-2.5" key={schoolClass.id}>
                  <span className="truncate text-sm font-black text-slate-800">{schoolClass.name}</span>
                  <button
                    className="rounded-full bg-rose-50 px-2 py-1 text-xs font-black text-rose-700 hover:bg-rose-100"
                    onClick={() => void onDeleteClass(schoolClass)}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}
              {!group.classes.length ? <p className="col-span-full text-xs font-semibold text-muted">Belum ada kelas.</p> : null}
            </div>
          </div>
        ))}
      </div>

      <form className="mt-5 grid min-w-0 gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-3" onSubmit={onCloneSchoolYearMaster}>
        <div>
          <p className="text-sm font-black text-slate-900">Salin Master Tahun Ajaran</p>
          <p className="mt-1 text-xs font-semibold text-muted">
            Gunakan untuk menyiapkan kelas dan susunan jam tahun ajaran baru dari tahun sebelumnya.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <FormField htmlFor="clone-source-school-year" label="Sumber">
            <select
              className={`${fieldClass} border-blue-100 font-bold`}
              id="clone-source-school-year"
              onChange={(event) => setCloneForm((current) => ({ ...current, sourceSchoolYearId: event.target.value }))}
              value={cloneForm.sourceSchoolYearId}
            >
              {schoolYears.map((year) => (
                <option key={year.id} value={year.id}>{year.name}</option>
              ))}
            </select>
          </FormField>
          <FormField htmlFor="clone-target-school-year" label="Target">
            <select
              className={`${fieldClass} border-blue-100 font-bold`}
              id="clone-target-school-year"
              onChange={(event) => setCloneForm((current) => ({ ...current, targetSchoolYearId: event.target.value }))}
              value={cloneForm.targetSchoolYearId}
            >
              {schoolYears.map((year) => (
                <option key={year.id} value={year.id}>{year.name}</option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="grid gap-2 text-xs font-bold text-slate-700 sm:grid-cols-3">
          {[
            ['includeClasses', 'Kelas'],
            ['includeTimeSlots', 'Jam pelajaran'],
            ['includeClassActivities', 'Aktivitas slot'],
          ].map(([field, label]) => (
            <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2" key={field}>
              <input
                checked={cloneForm[field as keyof typeof cloneForm] as boolean}
                className="h-4 w-4 accent-brand-600"
                onChange={(event) =>
                  setCloneForm((current) => ({
                    ...current,
                    [field]: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              {label}
            </label>
          ))}
        </div>
        <Button disabled={isCloningMaster} type="submit" variant="success">
          Salin Master
        </Button>
      </form>
    </Card>
  );
}
