export function getEffectiveScheduleRevision<Revision extends { effectiveFrom: Date }>(
  revisions: Revision[] | undefined,
  effectiveFrom: Date,
) {
  return revisions
    ?.filter((item) => item.effectiveFrom <= effectiveFrom)
    .at(-1);
}

export function getScheduleSnapshotAtDate<Schedule extends { revisions?: Array<{ effectiveFrom: Date }> }>(
  schedule: Schedule,
  effectiveFrom: Date,
) {
  const revision = getEffectiveScheduleRevision(schedule.revisions, effectiveFrom);

  return revision ? { ...schedule, ...revision } : schedule;
}

export function getReminderDateTime({
  date,
  startsAt,
  timezoneOffsetMinutes,
  reminderOffsetMinutes,
}: {
  date: Date;
  startsAt: string;
  timezoneOffsetMinutes: number;
  reminderOffsetMinutes: number;
}) {
  const [hoursText, minutesText] = startsAt.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const localStartUtcMs = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hours,
    minutes,
  ) - (timezoneOffsetMinutes * 60_000);

  return new Date(localStartUtcMs - (reminderOffsetMinutes * 60_000));
}

export function getDayOfWeek(date: Date) {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

export function getDateRange(startsAt: Date, endsAt: Date) {
  const dates: Date[] = [];
  const current = new Date(startsAt);

  while (current <= endsAt) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

export function getEffectiveTeacherAssignment<Assignment extends {
  schoolYear: { startsAt: Date };
}>(assignments: Assignment[], schoolYearStartsAt: Date) {
  return assignments
    .filter((assignment) => assignment.schoolYear.startsAt <= schoolYearStartsAt)
    .sort((first, second) => second.schoolYear.startsAt.getTime() - first.schoolYear.startsAt.getTime())[0];
}
