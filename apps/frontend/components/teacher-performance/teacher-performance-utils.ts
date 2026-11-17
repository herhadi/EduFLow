import { type TeacherPerformanceItem } from '../../lib/api';
import { getSchoolMonthRange, getSchoolWeekRange } from '../../lib/school-time';

export type QuickRange = 'week' | 'month' | 'custom';
export type RiskFilter = 'all' | 'attention' | 'note' | 'safe';

export const teacherPerformancePageSize = 10;

export function getDefaultTeacherPerformanceRange() {
  return getSchoolMonthRange();
}

export function getQuickRangeDates(range: Exclude<QuickRange, 'custom'>) {
  return range === 'week' ? getSchoolWeekRange() : getSchoolMonthRange();
}

export function getTeacherRiskLevel(teacher: TeacherPerformanceItem): Exclude<RiskFilter, 'all'> {
  if (teacher.emptyClasses > 0 || teacher.lateSubmissions >= 5) return 'attention';
  if (teacher.lateSubmissions > 0 || teacher.notSubmitted > 0) return 'note';
  return 'safe';
}

export function filterTeacherPerformanceItems({
  riskFilter,
  search,
  teachers,
}: {
  riskFilter: RiskFilter;
  search: string;
  teachers: TeacherPerformanceItem[];
}) {
  const keyword = search.trim().toLowerCase();

  return teachers.filter((teacher) => {
    const matchesSearch = !keyword || teacher.teacherName.toLowerCase().includes(keyword);
    const risk = getTeacherRiskLevel(teacher);
    const matchesRisk = riskFilter === 'all' || risk === riskFilter;
    return matchesSearch && matchesRisk;
  });
}
