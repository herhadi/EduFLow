export const SCHOOL_TIME_ZONE = 'Asia/Jakarta';

function asSchoolDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value + 'T00:00:00+07:00');
  }
  return new Date(value);
}

function dateParts(value: Date | string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SCHOOL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(asSchoolDate(value));
}

export function getSchoolDateKey(value: Date | string = new Date()) {
  const parts = Object.fromEntries(dateParts(value).map((part) => [part.type, part.value]));
  return parts.year + '-' + parts.month + '-' + parts.day;
}

export function formatSchoolDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' },
) {
  return new Intl.DateTimeFormat('id-ID', { ...options, timeZone: SCHOOL_TIME_ZONE }).format(asSchoolDate(value));
}

export function formatSchoolDateTime(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
) {
  return new Intl.DateTimeFormat('id-ID', { ...options, timeZone: SCHOOL_TIME_ZONE }).format(asSchoolDate(value));
}

export function formatSchoolTime(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
) {
  return new Intl.DateTimeFormat('id-ID', { ...options, timeZone: SCHOOL_TIME_ZONE }).format(asSchoolDate(value));
}

export function getSchoolDayOfWeek(value: Date | string = new Date()) {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: SCHOOL_TIME_ZONE, weekday: 'short' }).format(asSchoolDate(value));
  return ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as const)[day as 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'];
}

export function getSchoolMonthRange(value: Date = new Date()) {
  const [year, month] = getSchoolDateKey(value).split('-').map(Number);
  const from = year + '-' + String(month).padStart(2, '0') + '-01';
  const toDate = new Date(Date.UTC(year, month, 0, 12));
  return { from, to: getSchoolDateKey(toDate) };
}

export function getSchoolWeekRange(value: Date = new Date()) {
  const [year, month, day] = getSchoolDateKey(value).split('-').map(Number);
  const end = new Date(Date.UTC(year, month - 1, day, 12));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  return { from: getSchoolDateKey(start), to: getSchoolDateKey(end) };
}

export function schoolDateTimeLocalInput(value: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SCHOOL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return map.year + '-' + map.month + '-' + map.day + 'T' + map.hour + ':' + map.minute;
}

export function parseSchoolDateTimeLocal(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error('Tanggal dan waktu tidak valid.');
  }
  return new Date(value + ':00+07:00');
}
