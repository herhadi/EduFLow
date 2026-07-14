import {
  type SchoolYear,
  type Teacher,
  type TeacherAssignmentStatus,
  type TeacherSchoolYearAssignment,
} from '../../lib/api';

export const assignableRoles = [
  { value: 'kepala_sekolah', label: 'Kepala Sekolah' },
  { value: 'operator_sekolah', label: 'Operator Sekolah' },
  { value: 'guru', label: 'Guru' },
  { value: 'wali_kelas', label: 'Wali Kelas' },
  { value: 'bk', label: 'Guru BK' },
  { value: 'tu', label: 'TU' },
];

export const assignmentStatusMeta: Record<TeacherAssignmentStatus, { label: string; cardClass: string; textClass: string }> = {
  ACTIVE: {
    label: 'Aktif mengajar',
    cardClass: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100',
    textClass: 'text-emerald-800',
  },
  ON_LEAVE: {
    label: 'Cuti',
    cardClass: 'border-amber-200 bg-amber-50 hover:bg-amber-100',
    textClass: 'text-amber-900',
  },
  RETIRED: {
    label: 'Pensiun',
    cardClass: 'border-rose-200 bg-rose-50 hover:bg-rose-100',
    textClass: 'text-rose-800',
  },
  TRANSFERRED: {
    label: 'Pindah sekolah',
    cardClass: 'border-sky-200 bg-sky-50 hover:bg-sky-100',
    textClass: 'text-sky-800',
  },
  INACTIVE: {
    label: 'Tidak ditugaskan',
    cardClass: 'border-slate-200 bg-slate-100 hover:bg-slate-200',
    textClass: 'text-slate-700',
  },
};

export function toUsername(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
    .slice(0, 32);
}

export function normalizeTeacherRoles(roles: string[]) {
  const uniqueRoles = [...new Set(roles)];

  if (uniqueRoles.includes('wali_kelas') && !uniqueRoles.includes('guru')) {
    return [...uniqueRoles, 'guru'];
  }

  return uniqueRoles;
}

export function getEffectiveAssignment(
  assignments: TeacherSchoolYearAssignment[] | undefined,
  schoolYear?: SchoolYear,
) {
  if (!schoolYear) return undefined;

  return (assignments ?? [])
    .filter((assignment) =>
      assignment.schoolYear?.startsAt &&
      new Date(assignment.schoolYear.startsAt) <= new Date(schoolYear.startsAt),
    )
    .sort((first, second) =>
      new Date(second.schoolYear?.startsAt ?? 0).getTime() - new Date(first.schoolYear?.startsAt ?? 0).getTime(),
    )[0];
}

export function getLegacyAssignmentStatus(teacher?: Teacher | null): TeacherAssignmentStatus {
  return teacher?.isActive === false ? 'INACTIVE' : 'ACTIVE';
}

export function getEffectiveAssignmentStatus(
  teacher: Teacher,
  schoolYear?: SchoolYear,
): TeacherAssignmentStatus {
  return getEffectiveAssignment(teacher.yearAssignments, schoolYear)?.status ?? getLegacyAssignmentStatus(teacher);
}

export function getEffectiveAssignmentSubjects(
  teacher: Teacher,
  schoolYear?: SchoolYear,
) {
  const assignment = getEffectiveAssignment(teacher.yearAssignments, schoolYear);
  return assignment?.subjects?.length ? assignment.subjects : teacher.subjects ?? [];
}
