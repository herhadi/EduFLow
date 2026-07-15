import { AgendaStatus } from '@prisma/client';
import { getDayOfWeek, getScheduleSnapshotAtDate } from './schedule-utils';

export function getAgendaDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getAgendaKey(scheduleId: string, date: Date) {
  return `${scheduleId}:${getAgendaDateKey(date)}`;
}

export function getClassIdFilter(input: { classId?: string; classIds?: string[] }) {
  if (input.classIds?.length) return new Set(input.classIds);
  if (input.classId) return new Set([input.classId]);
  return null;
}

export function findSemesterForDate<Semester extends { startsAt: Date; endsAt: Date }>(
  semesters: Semester[],
  date: Date,
) {
  return semesters.find((semester) => semester.startsAt <= date && semester.endsAt >= date);
}

export function getEffectiveSchedulesForDate<Schedule extends {
  classId: string;
  dayOfWeek: number;
  revisions?: Array<{ effectiveFrom: Date }>;
}>(
  schedules: Schedule[],
  date: Date,
  classIds: Set<string> | null = null,
) {
  const dayOfWeek = getDayOfWeek(date);

  return schedules
    .map((schedule) => getScheduleSnapshotAtDate(schedule, date))
    .filter((schedule) =>
      schedule.dayOfWeek === dayOfWeek &&
      (!classIds || classIds.has(schedule.classId)),
    );
}

export function buildDailyAgendaCreateData(schedule: {
  id: string;
  schoolYearId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
}, semesterId: string, agendaDate: Date) {
  return {
    scheduleId: schedule.id,
    schoolYearId: schedule.schoolYearId,
    semesterId,
    classId: schedule.classId,
    subjectId: schedule.subjectId,
    teacherId: schedule.teacherId,
    date: agendaDate,
    status: AgendaStatus.SCHEDULED,
  };
}
