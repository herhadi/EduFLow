import {
  type Schedule,
  type SchedulePayload,
  type SchoolClass,
  type Semester,
} from '../../lib/api';

export const dayOptions = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 7, label: 'Minggu' },
];

export const emptyScheduleForm: SchedulePayload = {
  schoolYearId: '',
  semesterId: '',
  classId: '',
  subjectId: '',
  teacherId: '',
  dayOfWeek: 1,
  startsAt: '07:00',
  endsAt: '08:30',
};

export function getDayLabel(dayOfWeek: number) {
  return dayOptions.find((day) => day.value === dayOfWeek)?.label ?? `Hari ${dayOfWeek}`;
}

export function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function getDateForSemester(semester?: Semester) {
  if (!semester) return getToday();

  const today = new Date(getToday()).getTime();
  const startsAt = new Date(semester.startsAt).getTime();
  const endsAt = new Date(semester.endsAt).getTime();

  if (startsAt <= today && today <= endsAt) {
    return getToday();
  }

  return formatDateInput(semester.startsAt);
}

export function formatDateInput(value?: string | Date | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export function formatDateDisplay(value: string | Date) {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function getFirstScheduledClassId(
  classes: SchoolClass[],
  schedules: Schedule[],
  schoolYearId: string,
  viewDate: string,
) {
  const viewTime = new Date(viewDate).getTime();
  const classIds = new Set(classes
    .filter((schoolClass) => schoolClass.schoolYearId === schoolYearId)
    .map((schoolClass) => schoolClass.id));

  return schedules
    .map((schedule) => {
      const revision = schedule.revisions
        ?.filter((item) => new Date(item.effectiveFrom).getTime() <= viewTime)
        .at(-1);

      return revision
        ? { classId: revision.classId, schoolYearId: schedule.schoolYearId }
        : { classId: schedule.classId, schoolYearId: schedule.schoolYearId };
    })
    .find(
      (schedule) =>
        schedule.schoolYearId === schoolYearId &&
        classIds.has(schedule.classId),
    )?.classId;
}
