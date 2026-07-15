import { type ParentAttendanceRecord } from '../../lib/api';

export const parentAttendanceStatusLabels: Record<ParentAttendanceRecord['status'], string> = {
  PRESENT: 'Hadir',
  SICK: 'Sakit',
  EXCUSED: 'Izin',
  ABSENT: 'Alpha',
};

export const parentAttendanceStatusTone: Record<ParentAttendanceRecord['status'], string> = {
  PRESENT: 'bg-emerald-50 text-emerald-700',
  SICK: 'bg-amber-50 text-amber-700',
  EXCUSED: 'bg-blue-50 text-blue-700',
  ABSENT: 'bg-rose-50 text-rose-700',
};

export function getPrimaryTodayRecord(records: ParentAttendanceRecord[]) {
  return (
    records.find((record) => record.status === 'ABSENT') ??
    records.find((record) => record.status === 'SICK') ??
    records.find((record) => record.status === 'EXCUSED') ??
    records[0] ??
    null
  );
}
