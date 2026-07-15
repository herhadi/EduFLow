import { sortSchoolClasses } from '@eduflow/shared';
import {
  type AcademicTimeSlot,
  type Schedule,
  type SchedulePayload,
  type SchoolClass,
  type SchoolYear,
  type Semester,
  type Teacher,
} from '../../lib/api';
import { getPreferredSchoolYear, getPreferredSemester } from '../../lib/school-year';

export type ScheduleWithEffectiveRevision = Schedule & {
  hasRevision?: boolean;
};

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

export function getFilteredClasses(classes: SchoolClass[], schoolYearId: string) {
  return sortSchoolClasses(
    classes.filter((schoolClass) => schoolClass.schoolYearId === schoolYearId),
  );
}

export function getAvailableGrades(classes: SchoolClass[]) {
  return [...new Set(classes.map((schoolClass) => schoolClass.grade).filter(Boolean))] as string[];
}

export function groupClassesByGrade(classes: SchoolClass[], schoolYearId: string) {
  return getFilteredClasses(classes, schoolYearId).reduce<Record<string, SchoolClass[]>>(
    (groups, schoolClass) => {
      const grade = schoolClass.grade ?? 'Lainnya';
      groups[grade] = [...(groups[grade] ?? []), schoolClass];
      return groups;
    },
    {},
  );
}

export function getAgendaClassIds(classes: SchoolClass[], schoolYearId: string) {
  return classes
    .filter(
      (schoolClass) =>
        schoolClass.schoolYearId === schoolYearId &&
        ['VII', 'VIII', 'IX'].includes(schoolClass.grade ?? ''),
    )
    .map((schoolClass) => schoolClass.id);
}

export function getInitialScheduleSelection({
  classes,
  schedules,
  schoolYears,
  semesters,
  teachers,
}: {
  classes: SchoolClass[];
  schedules: Schedule[];
  schoolYears: SchoolYear[];
  semesters: Semester[];
  teachers: Teacher[];
}) {
  const schoolYear = getPreferredSchoolYear(schoolYears);

  if (!schoolYear) {
    return null;
  }

  const semester = getPreferredSemester(semesters, schoolYear.id);
  const viewDate = getDateForSemester(semester);
  const classId = getFirstScheduledClassId(classes, schedules, schoolYear.id, viewDate);
  const schoolClass =
    classes.find((item) => item.id === classId) ??
    classes.find((item) => item.schoolYearId === schoolYear.id);
  const teacher = teachers[0];
  const subject = teacher?.subjects?.[0]?.subject;

  return {
    form: {
      schoolYearId: schoolYear.id,
      semesterId: semester?.id ?? '',
      classId: schoolClass?.id ?? '',
      subjectId: subject?.id ?? '',
      teacherId: teacher?.id ?? '',
    } satisfies Partial<SchedulePayload>,
    grade: schoolClass?.grade ?? 'VII',
    scheduleClassId: schoolClass?.id ?? '',
    viewDate,
  };
}

export function getSchoolYearScheduleSelection({
  classes,
  schedules,
  schoolYearId,
  semesters,
}: {
  classes: SchoolClass[];
  schedules: Schedule[];
  schoolYearId: string;
  semesters: Semester[];
}) {
  const semester = getPreferredSemester(semesters, schoolYearId);
  const viewDate = getDateForSemester(semester);
  const classId = getFirstScheduledClassId(classes, schedules, schoolYearId, viewDate);
  const schoolClass =
    classes.find((item) => item.id === classId) ??
    classes.find((item) => item.schoolYearId === schoolYearId);

  return {
    semesterId: semester?.id ?? '',
    grade: schoolClass?.grade ?? 'VII',
    scheduleClassId: schoolClass?.id ?? '',
    viewDate,
  };
}

export function getSemesterScheduleSelection({
  classes,
  fallbackGrade,
  schedules,
  schoolYearId,
  semesterId,
  semesters,
}: {
  classes: SchoolClass[];
  fallbackGrade: string;
  schedules: Schedule[];
  schoolYearId: string;
  semesterId: string;
  semesters: Semester[];
}) {
  const semester = semesters.find((item) => item.id === semesterId);
  const viewDate = getDateForSemester(semester);
  const classId = getFirstScheduledClassId(classes, schedules, schoolYearId, viewDate);
  const schoolClass =
    classes.find((item) => item.id === classId) ??
    classes.find((item) => item.schoolYearId === schoolYearId);

  return {
    grade: schoolClass?.grade ?? fallbackGrade,
    scheduleClassId: schoolClass?.id ?? '',
    viewDate,
  };
}

export function getScheduleEditDraft(schedule: Schedule) {
  return {
    form: {
      schoolYearId: schedule.schoolYearId,
      semesterId: schedule.semesterId,
      classId: schedule.classId,
      subjectId: schedule.subjectId,
      teacherId: schedule.teacherId,
      dayOfWeek: schedule.dayOfWeek,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
    } satisfies SchedulePayload,
    grade: schedule.class.grade ?? 'VII',
    slotClassIds: schedule.timeSlotId ? { [schedule.timeSlotId]: [schedule.classId] } : {},
  };
}

export function getSlotClassSelection({
  classId,
  current,
  editingId,
  slot,
}: {
  classId: string;
  current: Record<string, string[]>;
  editingId: string | null;
  slot: AcademicTimeSlot;
}) {
  const currentIds = current[slot.id] ?? [];
  const nextIds = editingId
    ? [classId]
    : currentIds.includes(classId)
      ? currentIds.filter((id) => id !== classId)
      : [...currentIds, classId];

  return {
    form: {
      classId: nextIds[0] ?? '',
      dayOfWeek: slot.dayOfWeek,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
    } satisfies Partial<SchedulePayload>,
    slotClassIds: editingId ? { [slot.id]: nextIds } : { ...current, [slot.id]: nextIds },
  };
}

export function getTeacherSubjectOptions(
  teachers: Teacher[],
  schoolYears: SchoolYear[],
  schoolYearId: string,
) {
  const targetSchoolYear = schoolYears.find((item) => item.id === schoolYearId);

  return teachers.flatMap((teacher) => {
    const assignment = teacher.yearAssignments
      ?.filter((item) =>
        targetSchoolYear &&
        item.schoolYear?.startsAt &&
        new Date(item.schoolYear.startsAt) <= new Date(targetSchoolYear.startsAt),
      )
      .sort((first, second) =>
        new Date(second.schoolYear?.startsAt ?? 0).getTime() -
        new Date(first.schoolYear?.startsAt ?? 0).getTime(),
      )[0];
    const subjects = assignment
      ? assignment.status === 'ACTIVE' ? assignment.subjects : []
      : teacher.subjects ?? [];

    return subjects.map(({ subject }) => ({
      label: `${teacher.name} · ${subject.name}`,
      value: `${teacher.id}:${subject.id}`,
    }));
  });
}

export function getEffectiveSchedulesByClass({
  schedules,
  semesters,
  semesterId,
  schoolYearId,
  classId,
  dayFilter,
  viewDate,
}: {
  schedules: Schedule[];
  semesters: Semester[];
  semesterId: string;
  schoolYearId: string;
  classId: string;
  dayFilter: string;
  viewDate: string;
}) {
  const semester = semesters.find((item) => item.id === semesterId);
  const viewTime = new Date(viewDate || semester?.startsAt || getToday()).getTime();

  return schedules
    .map((schedule) => {
      const revision = schedule.revisions
        ?.filter((item) => new Date(item.effectiveFrom).getTime() <= viewTime)
        .at(-1);

      return revision
        ? { ...schedule, ...revision, class: revision.class, subject: revision.subject, teacher: revision.teacher, hasRevision: true }
        : schedule;
    })
    .filter(
      (schedule) =>
        schedule.classId === classId &&
        schedule.schoolYearId === schoolYearId &&
        (dayFilter === 'all' || schedule.dayOfWeek === Number(dayFilter)),
    )
    .sort(
      (firstSchedule, secondSchedule) =>
        firstSchedule.dayOfWeek - secondSchedule.dayOfWeek ||
        firstSchedule.startsAt.localeCompare(secondSchedule.startsAt),
    ) as ScheduleWithEffectiveRevision[];
}
