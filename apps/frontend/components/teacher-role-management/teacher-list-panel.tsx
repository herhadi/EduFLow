import {
  type CSSProperties,
} from 'react';
import {
  type SchoolClass,
  type SchoolYear,
  type Teacher,
  type TeacherAssignmentStatus,
} from '../../lib/api';
import {
  assignmentStatusMeta,
  getEffectiveAssignmentStatus,
  getEffectiveAssignmentSubjects,
} from './teacher-role-management-utils';
import { fieldClass } from '../ui/form';

type LoadState = 'idle' | 'loading' | 'success' | 'error';
type SaveState = 'idle' | 'loading' | 'success' | 'error';

type NewTeacherForm = {
  name: string;
  nip: string;
  phone: string;
  email: string;
};

type TeacherListPanelProps = {
  assignmentSchoolYearId: string;
  classes: SchoolClass[];
  detailCardHeight?: number;
  loadState: LoadState;
  newTeacher: NewTeacherForm;
  onCreateTeacher: () => void;
  onNewTeacherChange: (field: keyof NewTeacherForm, value: string) => void;
  onSelectTeacher: (teacherId: string) => void;
  onToggleCreateTeacher: () => void;
  saveState: SaveState;
  schoolYears: SchoolYear[];
  selectedTeacherId: string;
  showCreateTeacher: boolean;
  teachers: Teacher[];
};

export function TeacherListPanel({
  assignmentSchoolYearId,
  classes,
  detailCardHeight,
  loadState,
  newTeacher,
  onCreateTeacher,
  onNewTeacherChange,
  onSelectTeacher,
  onToggleCreateTeacher,
  saveState,
  schoolYears,
  selectedTeacherId,
  showCreateTeacher,
  teachers,
}: TeacherListPanelProps) {
  const selectedSchoolYear = schoolYears.find((schoolYear) => schoolYear.id === assignmentSchoolYearId);

  return (
    <div
      className="min-w-0 flex flex-col rounded-[1.5rem] border border-blue-50 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900 lg:h-[var(--detail-card-height)] lg:min-h-0 lg:overflow-hidden"
      style={
        {
          '--detail-card-height': detailCardHeight
            ? `${detailCardHeight}px`
            : 'auto',
        } as CSSProperties
      }
    >
      <div className="flex min-w-0 items-center justify-between gap-3 px-2">
        <p className="text-xs font-black text-muted">Pilih Guru</p>
        <button
          className="rounded-full bg-brand-600 px-3 py-2 text-xs font-black text-white"
          onClick={onToggleCreateTeacher}
          type="button"
        >
          + Tambah Guru
        </button>
      </div>

      {showCreateTeacher ? (
        <div className="mt-3 grid gap-2 rounded-2xl border border-blue-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
          {[
            ['name', 'Nama guru *'],
            ['nip', 'NIP'],
            ['phone', 'Nomor HP'],
            ['email', 'Email'],
          ].map(([field, placeholder]) => (
            <input
              className={`${fieldClass} rounded-xl py-2`}
              key={field}
              onChange={(event) => onNewTeacherChange(field as keyof NewTeacherForm, event.target.value)}
              placeholder={placeholder}
              type={field === 'email' ? 'email' : 'text'}
              value={newTeacher[field as keyof NewTeacherForm]}
            />
          ))}
          <button
            className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300"
            disabled={saveState === 'loading' || !newTeacher.name.trim()}
            onClick={() => void onCreateTeacher()}
            type="button"
          >
            Simpan Guru Baru
          </button>
        </div>
      ) : null}

      <div className="mt-3 grid min-w-0 content-start gap-2 pr-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
        {teachers.map((teacher) => {
          const active = teacher.id === selectedTeacherId;
          const status = assignmentStatusMeta[getEffectiveAssignmentStatus(teacher, selectedSchoolYear) as TeacherAssignmentStatus];
          const roles = teacher.user?.roles.map(({ role }) => role.name).join(', ');
          const subjectNames = getEffectiveAssignmentSubjects(teacher, selectedSchoolYear)
            ?.map(({ subject }) => subject.name)
            .join(', ');
          const homeroomNames = classes
            .filter((schoolClass) => schoolClass.homeroomTeacherId === teacher.id)
            .map((schoolClass) => schoolClass.name)
            .join(', ');

          return (
            <button
              className={[
                'min-w-0 rounded-2xl border p-3 text-left transition',
                active
                  ? `${status.cardClass} ring-2 ring-brand-600 ring-offset-1 dark:ring-offset-slate-900`
                  : status.cardClass,
              ].join(' ')}
              key={teacher.id}
              onClick={() => onSelectTeacher(teacher.id)}
              type="button"
            >
              <p className="truncate font-black text-slate-900 dark:text-slate-100">{teacher.name}</p>
              <p className={['mt-1 text-xs font-black', status.textClass].join(' ')}>
                {status.label}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted">
                {roles || 'Belum ada akun'}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted">
                {subjectNames || 'Mapel belum diatur'}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted">
                Wali: {homeroomNames || '-'}
              </p>
            </button>
          );
        })}

        {!teachers.length ? (
          <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-muted dark:bg-slate-950">
            {loadState === 'loading' ? 'Memuat data guru...' : 'Belum ada data guru aktif.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
