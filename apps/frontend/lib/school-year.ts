import { getSchoolDateKey } from './school-time';
import type { SchoolYear, Semester } from './api';

export function getPreferredSchoolYear(schoolYears: SchoolYear[], now = new Date()) {
  const today = getSchoolDateKey(now);
  const currentSchoolYear = schoolYears.find((schoolYear) => {
    const startsAt = getSchoolDateKey(schoolYear.startsAt);
    const endsAt = getSchoolDateKey(schoolYear.endsAt);

    return startsAt <= today && today <= endsAt;
  });

  if (currentSchoolYear) {
    return currentSchoolYear;
  }

  return (
    schoolYears
      .filter((schoolYear) => getSchoolDateKey(schoolYear.startsAt) <= today)
      .sort((firstSchoolYear, secondSchoolYear) =>
        getSchoolDateKey(secondSchoolYear.startsAt).localeCompare(getSchoolDateKey(firstSchoolYear.startsAt)),
      )[0] ?? schoolYears[0]
  );
}

export function getUpcomingSchoolYear(schoolYears: SchoolYear[], now = new Date()) {
  const today = getSchoolDateKey(now);
  const upcomingSchoolYear = schoolYears
    .filter((schoolYear) => getSchoolDateKey(schoolYear.startsAt) > today)
    .sort((firstSchoolYear, secondSchoolYear) =>
      getSchoolDateKey(firstSchoolYear.startsAt).localeCompare(getSchoolDateKey(secondSchoolYear.startsAt)),
    )[0];

  return upcomingSchoolYear ?? getPreferredSchoolYear(schoolYears, now);
}

export function getPreferredSemester(
  semesters: Semester[],
  schoolYearId: string,
  now = new Date(),
) {
  const schoolYearSemesters = semesters
    .filter((semester) => semester.schoolYearId === schoolYearId)
    .sort((firstSemester, secondSemester) =>
      getSchoolDateKey(firstSemester.startsAt).localeCompare(getSchoolDateKey(secondSemester.startsAt)),
    );

  const today = getSchoolDateKey(now);
  const currentSemester = schoolYearSemesters.find((semester) => {
    const startsAt = getSchoolDateKey(semester.startsAt);
    const endsAt = getSchoolDateKey(semester.endsAt);

    return startsAt <= today && today <= endsAt;
  });

  if (currentSemester) {
    return currentSemester;
  }

  return schoolYearSemesters.find(
    (semester) => getSchoolDateKey(semester.startsAt) > today,
  ) ?? schoolYearSemesters.at(-1);
}
