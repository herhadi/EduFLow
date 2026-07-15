import { sortSchoolClasses } from '@eduflow/shared';
import {
  type AcademicTimeSlot,
  type SchoolClass,
  type SchoolYear,
} from '../../lib/api';
import { getPreferredSchoolYear, getUpcomingSchoolYear } from '../../lib/school-year';
import {
  type AcademicTimeSlotFormState,
  grades,
  weekdayOptions,
} from './academic-master-constants';

export function getInitialCloneSelection(schoolYears: SchoolYear[]) {
  const sourceSchoolYear = getPreferredSchoolYear(schoolYears);
  const upcomingSchoolYear = getUpcomingSchoolYear(schoolYears);
  const targetSchoolYear =
    upcomingSchoolYear?.id !== sourceSchoolYear?.id
      ? upcomingSchoolYear
      : schoolYears.find((schoolYear) => schoolYear.id !== sourceSchoolYear?.id);

  return {
    sourceSchoolYearId: sourceSchoolYear?.id ?? '',
    targetSchoolYearId: targetSchoolYear?.id ?? '',
  };
}

export function getGroupedClasses(classes: SchoolClass[], schoolYearId: string) {
  return grades.map((grade) => ({
    grade,
    classes: sortSchoolClasses(
      classes.filter(
        (schoolClass) =>
          schoolClass.grade === grade &&
          (!schoolYearId || schoolClass.schoolYearId === schoolYearId),
      ),
    ),
  }));
}

export function getTimeSlotsByDay(timeSlots: AcademicTimeSlot[], schoolYearId: string) {
  return weekdayOptions.map((day) => ({
    ...day,
    slots: timeSlots
      .filter((slot) => slot.schoolYearId === schoolYearId && slot.dayOfWeek === day.value)
      .sort((first, second) => first.startsAt.localeCompare(second.startsAt)),
  }));
}

export function getTimeSlotPayload(form: AcademicTimeSlotFormState) {
  return {
    schoolYearId: form.schoolYearId,
    dayOfWeek: Number(form.dayOfWeek),
    periodNumber: form.periodNumber ? Number(form.periodNumber) : undefined,
    name: form.name.trim(),
    type: form.type,
    startsAt: form.startsAt,
    endsAt: form.endsAt,
    isAssignable: form.isAssignable,
  };
}

export function getTimeSlotEditForm(slot: AcademicTimeSlot): AcademicTimeSlotFormState {
  return {
    schoolYearId: slot.schoolYearId,
    dayOfWeek: slot.dayOfWeek,
    periodNumber: slot.periodNumber ? String(slot.periodNumber) : '',
    name: slot.name,
    type: slot.type,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    isAssignable: slot.isAssignable,
  };
}

export function sortAcademicTimeSlots(timeSlots: AcademicTimeSlot[]) {
  return [...timeSlots].sort((first, second) =>
    first.schoolYearId.localeCompare(second.schoolYearId) ||
    first.dayOfWeek - second.dayOfWeek ||
    first.startsAt.localeCompare(second.startsAt),
  );
}
