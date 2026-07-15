import { type OperationalDashboardSummary } from '../../lib/api';

export type PrincipalPriorityKey = 'all' | 'empty' | 'notSubmitted' | 'issues' | 'missing' | 'substitutes';

export const emptySummary: OperationalDashboardSummary = {
  date: new Date().toISOString().slice(0, 10),
  classes: {
    totalToday: 0,
    inProgress: 0,
    completed: 0,
    empty: 0,
    notSubmitted: 0,
  },
  teachers: {
    totalTeaching: 0,
    submitted: 0,
    notSubmitted: 0,
  },
  students: {
    present: 0,
    sick: 0,
    excused: 0,
    absent: 0,
  },
  notifications: {
    reminderSent: 0,
    summarySent: 0,
    failed: 0,
  },
  kbm: {
    checklist: {
      teacherPresent: 0,
      studentAttendanceDone: 0,
      materialFilled: 0,
      classPhotoDone: 0,
      missing: 0,
      withIssueNotes: 0,
    },
    substitutes: {
      total: 0,
      items: [],
    },
    followUpItems: [],
  },
};

export function formatTimeRange(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt || !endsAt) {
    return 'Jam belum tercatat';
  }

  return `${startsAt.slice(0, 5)}-${endsAt.slice(0, 5)}`;
}

export function getAgendaStatusLabel(status: string) {
  const labels: Record<string, string> = {
    SCHEDULED: 'Terjadwal',
    IN_PROGRESS: 'Berjalan',
    COMPLETED: 'Selesai',
    EMPTY: 'Kosong',
    CANCELLED: 'Batal',
  };

  return labels[status] ?? status;
}

export function getAgendaStatusClass(status: string) {
  if (status === 'EMPTY') {
    return 'bg-red-50 text-red-700';
  }

  if (status === 'COMPLETED') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (status === 'IN_PROGRESS') {
    return 'bg-blue-50 text-blue-700';
  }

  return 'bg-amber-50 text-amber-700';
}

export function matchesPriority(
  item: NonNullable<OperationalDashboardSummary['kbm']>['followUpItems'][number],
  priority: PrincipalPriorityKey,
) {
  const submittedStates = ['SUBMITTED', 'APPROVED', 'CORRECTED', 'LOCKED'];

  if (priority === 'all') return true;
  if (priority === 'empty') return item.status === 'EMPTY';
  if (priority === 'notSubmitted') return !submittedStates.includes(item.attendanceState ?? '');
  if (priority === 'issues') return Boolean(item.issueNotes);
  if (priority === 'substitutes') return Boolean(item.substituteTeacherName);

  return submittedStates.includes(item.attendanceState ?? '') && !item.issueNotes;
}

export function getStudentTotal(summary: OperationalDashboardSummary) {
  return summary.students.present + summary.students.sick + summary.students.excused + summary.students.absent;
}
