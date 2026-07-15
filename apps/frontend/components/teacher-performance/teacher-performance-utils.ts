import { type TeacherPerformanceItem } from '../../lib/api';

export type QuickRange = 'week' | 'month' | 'custom';
export type RiskFilter = 'all' | 'attention' | 'note' | 'safe';

export const teacherPerformancePageSize = 10;

export function getDefaultTeacherPerformanceRange() {
  const to = new Date();
  const from = new Date(Date.UTC(to.getFullYear(), to.getMonth(), 1));

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function getQuickRangeDates(range: Exclude<QuickRange, 'custom'>) {
  const to = new Date();
  const from = new Date(to);

  if (range === 'week') {
    from.setDate(to.getDate() - 6);
  } else {
    from.setUTCDate(1);
  }

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
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
