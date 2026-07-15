import { type AttendanceStatus } from '../../lib/api';

export const attendanceStatuses: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'PRESENT', label: 'Hadir' },
  { value: 'SICK', label: 'Sakit' },
  { value: 'EXCUSED', label: 'Izin' },
  { value: 'ABSENT', label: 'Alpha' },
];

export const teacherAttendancePageSize = 10;

export type AttendanceMode = 'list' | 'quick';

export type ChecklistKey = 'teacherPresent' | 'studentAttendanceDone' | 'classPhotoDone';

export function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function getChecklistLabel(key: ChecklistKey) {
  const labels = {
    teacherPresent: 'Guru hadir',
    studentAttendanceDone: 'Presensi siswa selesai',
    classPhotoDone: 'Foto kelas tersedia',
  };
  return labels[key];
}
