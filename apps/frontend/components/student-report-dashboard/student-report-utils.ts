import {
  type AttendanceStatus,
  type StudentReportItem,
} from '../../lib/api';

export type StudentDetailPanel = 'attendance' | 'grades';

export const studentReportPageSize = 10;

export const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: 'Hadir',
  SICK: 'Sakit',
  EXCUSED: 'Izin',
  ABSENT: 'Alpha',
};

export const riskLabels: Record<StudentReportItem['riskLevel'], string> = {
  HIGH: 'Tinggi',
  MEDIUM: 'Sedang',
  LOW: 'Rendah',
};

export const riskClass: Record<StudentReportItem['riskLevel'], string> = {
  HIGH: 'border-red-100 bg-red-50 text-red-700',
  MEDIUM: 'border-amber-100 bg-amber-50 text-amber-700',
  LOW: 'border-emerald-100 bg-emerald-50 text-emerald-700',
};

export function getMonthRange() {
  const now = new Date();
  const startsAt = new Date(now.getFullYear(), now.getMonth(), 1);
  const endsAt = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: startsAt.toISOString().slice(0, 10),
    to: endsAt.toISOString().slice(0, 10),
  };
}

export function summarizeStudents(students: StudentReportItem[]) {
  return students.reduce(
    (summary, student) => ({
      students: summary.students + 1,
      present: summary.present + student.summary.present,
      sick: summary.sick + student.summary.sick,
      excused: summary.excused + student.summary.excused,
      absent: summary.absent + student.summary.absent,
      highRisk: summary.highRisk + (student.riskLevel === 'HIGH' ? 1 : 0),
    }),
    { absent: 0, excused: 0, highRisk: 0, present: 0, sick: 0, students: 0 },
  );
}
