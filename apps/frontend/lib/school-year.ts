import type { SchoolYear, Semester } from './api';

export function getPreferredSchoolYear(schoolYears: SchoolYear[], now = new Date()) {
  const nowTime = now.getTime();
  const currentSchoolYear = schoolYears.find((schoolYear) => {
    const startsAt = new Date(schoolYear.startsAt).getTime();
    const endsAt = new Date(schoolYear.endsAt).getTime();

    return startsAt <= nowTime && nowTime <= endsAt;
  });

  if (currentSchoolYear) {
    return currentSchoolYear;
  }

  return (
    schoolYears
      .filter((schoolYear) => new Date(schoolYear.startsAt).getTime() <= nowTime)
      .sort(
        (firstSchoolYear, secondSchoolYear) =>
          new Date(secondSchoolYear.startsAt).getTime() -
          new Date(firstSchoolYear.startsAt).getTime(),
      )[0] ?? schoolYears[0]
  );
}

export function getPreferredSemester(
  semesters: Semester[],
  schoolYearId: string,
  now = new Date(),
) {
  const schoolYearSemesters = semesters
    .filter((semester) => semester.schoolYearId === schoolYearId)
    .sort(
      (firstSemester, secondSemester) =>
        new Date(firstSemester.startsAt).getTime() - new Date(secondSemester.startsAt).getTime(),
    );

  const nowTime = now.getTime();
  const currentSemester = schoolYearSemesters.find((semester) => {
    const startsAt = new Date(semester.startsAt).getTime();
    const endsAt = new Date(semester.endsAt).getTime();

    return startsAt <= nowTime && nowTime <= endsAt;
  });

  if (currentSemester) {
    return currentSemester;
  }

  return schoolYearSemesters.find(
    (semester) => new Date(semester.startsAt).getTime() > nowTime,
  ) ?? schoolYearSemesters.at(-1);
}
