import { type AcademicTimeSlotType } from '../../lib/api';

export type AcademicTimeSlotFormState = {
  schoolYearId: string;
  dayOfWeek: number;
  periodNumber: string;
  name: string;
  type: AcademicTimeSlotType;
  startsAt: string;
  endsAt: string;
  isAssignable: boolean;
};

export const grades = ['VII', 'VIII', 'IX'];

export const weekdayOptions = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 7, label: 'Minggu' },
];

export const timeSlotTypeOptions: Array<{ value: AcademicTimeSlotType; label: string }> = [
  { value: 'LESSON', label: 'Pelajaran' },
  { value: 'BREAK', label: 'Istirahat' },
  { value: 'CEREMONY', label: 'Upacara' },
  { value: 'EXERCISE', label: 'Senam' },
  { value: 'CO_CURRICULAR', label: 'Kokurikuler' },
  { value: 'RELIGIOUS', label: 'Keagamaan' },
  { value: 'OTHER', label: 'Lainnya' },
];

export const schoolYearNamePattern = '[0-9]{4}/[0-9]{4}';
export const schoolYearNameRegex = new RegExp(`^${schoolYearNamePattern}$`);

export function createDefaultTimeSlotForm(schoolYearId = ''): AcademicTimeSlotFormState {
  return {
    schoolYearId,
    dayOfWeek: 1,
    periodNumber: '',
    name: '',
    type: 'LESSON',
    startsAt: '07:00',
    endsAt: '07:40',
    isAssignable: true,
  };
}
