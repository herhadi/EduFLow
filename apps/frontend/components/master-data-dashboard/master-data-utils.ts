import {
  type SchoolClass,
  type SchoolYear,
  type Student,
  type Subject,
  type Teacher,
} from '../../lib/api';
import { sortSchoolClasses } from '@eduflow/shared';

export type MasterTab = 'teachers' | 'students' | 'classes' | 'subjects' | 'schoolYears';

export const masterDataTabs: Array<{ id: MasterTab; label: string; description: string }> = [
  {
    id: 'teachers',
    label: 'Guru',
    description: 'Data pengajar untuk jadwal dan presensi.',
  },
  {
    id: 'students',
    label: 'Siswa',
    description: 'Data peserta didik beserta kelas aktif.',
  },
  {
    id: 'classes',
    label: 'Kelas',
    description: 'Rombongan belajar per tahun ajaran.',
  },
  {
    id: 'subjects',
    label: 'Mata Pelajaran',
    description: 'Daftar mapel yang dipakai di jadwal.',
  },
  {
    id: 'schoolYears',
    label: 'Tahun Ajaran',
    description: 'Periode akademik utama sekolah.',
  },
];

export function getTeacherRows(teachers: Teacher[]) {
  return teachers.map((teacher) => [
    teacher.name,
    teacher.nip ?? '-',
    teacher.phone ?? '-',
    teacher.isActive === false ? 'Nonaktif' : 'Aktif',
  ]);
}

export function getStudentRows(students: Student[]) {
  return students.map((student) => {
    const activeEnrollment = student.enrollments[0];
    const primaryGuardian =
      student.guardians.find((guardian) => guardian.isPrimary) ??
      student.guardians[0];

    return [
      student.name,
      student.nis ?? '-',
      student.nisn ?? '-',
      activeEnrollment
        ? `${activeEnrollment.class.name} · ${activeEnrollment.schoolYear.name}`
        : '-',
      primaryGuardian
        ? `${primaryGuardian.guardian.name} (${primaryGuardian.relation})`
        : '-',
    ];
  });
}

export function getClassRows(classes: SchoolClass[]) {
  return sortSchoolClasses(classes).map((schoolClass) => [
    schoolClass.name,
    schoolClass.code ?? '-',
    schoolClass.grade ?? '-',
    schoolClass.schoolYear?.name ?? '-',
  ]);
}

export function getSubjectRows(subjects: Subject[]) {
  return subjects.map((subject) => [
    subject.name,
    subject.code ?? '-',
    subject.isActive === false ? 'Nonaktif' : 'Aktif',
  ]);
}

export function getSchoolYearRows(schoolYears: SchoolYear[]) {
  return schoolYears.map((schoolYear) => [
    schoolYear.name,
    formatDate(schoolYear.startsAt),
    formatDate(schoolYear.endsAt),
  ]);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
