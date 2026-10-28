import { BadRequestException } from '@nestjs/common';
import { AgendaStatus } from '@prisma/client';
import { getDayOfWeek, getScheduleSnapshotAtDate } from './schedule-utils';

export function getAgendaDateKey(date: Date) { return date.toISOString().slice(0, 10); }
export function getAgendaKey(scheduleId: string, date: Date) { return `${scheduleId}:${getAgendaDateKey(date)}`; }
export function getClassIdFilter(input: { classId?: string; classIds?: string[] }) {
  if (input.classIds?.length) return new Set(input.classIds);
  if (input.classId) return new Set([input.classId]);
  return null;
}
export function findSemesterForDate<Semester extends { startsAt: Date; endsAt: Date }>(semesters: Semester[], date: Date) {
  return semesters.find((semester) => semester.startsAt <= date && semester.endsAt >= date);
}
export function getEffectiveSchedulesForDate<Schedule extends {
  classId: string; dayOfWeek: number; revisions?: Array<{ effectiveFrom: Date }>;
}>(schedules: Schedule[], date: Date, classIds: Set<string> | null = null) {
  const dayOfWeek = getDayOfWeek(date);
  return schedules.map((schedule) => getScheduleSnapshotAtDate(schedule, date))
    .filter((schedule) => schedule.dayOfWeek === dayOfWeek && (!classIds || classIds.has(schedule.classId)));
}

type ShiftEvent = { startsAt: Date; title?: string; type?: string; scheduleShiftFromDay: number | null; scheduleShiftToDay: number | null };
function isNationalCeremony(item: ShiftEvent) { return item.type === 'NATIONAL_CEREMONY' || /upacara/i.test(item.title ?? ''); }
type MorningAssemblySettings = { enabled: boolean; startsAt: string; endsAt: string };
function clockMinutes(value: string) { const [h, m] = value.split(':').map(Number); return h * 60 + m; }
function shiftClock(value: string, delta: number) {
  const total = (clockMinutes(value) + delta + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
type ShiftTimeSlot = {
  id: string; schoolYearId: string; dayOfWeek: number; periodNumber: number | null;
  startsAt: string; endsAt: string; isActive: boolean; isAssignable: boolean; deletedAt: Date | null;
};

export function applyScheduleShiftForDate<Schedule extends {
  schoolYearId: string; dayOfWeek: number; timeSlotId?: string | null; startsAt: string; endsAt: string;
}>(
  schedule: Schedule, date: Date, events: ShiftEvent[], timeSlots: ShiftTimeSlot[],
  morningAssembly?: MorningAssemblySettings,
): Schedule & { effectivePeriodNumber?: number; skipAgenda?: boolean } {
  const dayOfWeek = getDayOfWeek(date);
  const weekStart = (value: Date) => {
    const start = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    start.setUTCDate(start.getUTCDate() - (getDayOfWeek(start) - 1));
    return start.getTime();
  };
  const upacaraEvent = events.find((item) => weekStart(item.startsAt) === weekStart(date) && isNationalCeremony(item));
  const upacaraTargetDay = upacaraEvent ? getDayOfWeek(upacaraEvent.startsAt) : null;
  // Upacara normally falls on Monday. If Kaldik marks it on another day,
  // move Monday's lesson sequence one period earlier and the marked day one period later.
  const fixedShift = Boolean(upacaraTargetDay !== null && upacaraTargetDay !== 1 &&
    (dayOfWeek === 1 || dayOfWeek === upacaraTargetDay));
  const legacyEvent = events.find((item) => item.scheduleShiftFromDay != null && item.scheduleShiftToDay != null &&
    weekStart(item.startsAt) === weekStart(date) && (dayOfWeek === item.scheduleShiftFromDay || dayOfWeek === item.scheduleShiftToDay));
  let effective: Schedule & { effectivePeriodNumber?: number; skipAgenda?: boolean } = schedule;
  if (fixedShift || legacyEvent) {
    const delta = fixedShift ? (dayOfWeek === 1 ? -1 : 1) :
      (dayOfWeek === legacyEvent!.scheduleShiftFromDay ? -1 : 1);
    const currentSlot = timeSlots.find((slot) => slot.id === schedule.timeSlotId) ??
      timeSlots.find((slot) => slot.schoolYearId === schedule.schoolYearId && slot.dayOfWeek === dayOfWeek &&
        slot.startsAt === schedule.startsAt && slot.endsAt === schedule.endsAt && slot.deletedAt === null);
    if (!currentSlot || currentSlot.periodNumber == null) throw new BadRequestException(`Pergeseran jadwal ${getAgendaDateKey(date)} gagal: slot waktu pelajaran belum memiliki nomor jam.`);
    const targetPeriod = currentSlot.periodNumber + delta;
    if (targetPeriod < 1) return { ...schedule, skipAgenda: true };
    const candidates = timeSlots.filter((slot) => slot.schoolYearId === schedule.schoolYearId &&
      slot.dayOfWeek === dayOfWeek && slot.periodNumber === targetPeriod && slot.isActive && slot.deletedAt === null);
    const targetSlot = candidates.find((slot) => slot.isAssignable) ?? candidates[0];
    if (!targetSlot) throw new BadRequestException(`Pergeseran jadwal ${getAgendaDateKey(date)} tidak dapat dilakukan: slot jam ke-${targetPeriod} belum dikonfigurasi pada hari sekolah tersebut.`);
    effective = { ...schedule, timeSlotId: targetSlot.id, startsAt: targetSlot.startsAt, endsAt: targetSlot.endsAt, effectivePeriodNumber: targetPeriod };
  }
  const upacaraToday = events.some((item) => getAgendaDateKey(item.startsAt) === getAgendaDateKey(date) && isNationalCeremony(item));
  if (morningAssembly?.enabled && !upacaraToday) {
    const duration = clockMinutes(morningAssembly.endsAt) - clockMinutes(morningAssembly.startsAt);
    if (duration > 0) effective = { ...effective, startsAt: shiftClock(effective.startsAt, duration), endsAt: shiftClock(effective.endsAt, duration) };
  }
  return effective;
}

export function buildDailyAgendaCreateData(schedule: {
  id: string; schoolYearId: string; classId: string; subjectId: string; teacherId: string;
  startsAt?: string; endsAt?: string; effectivePeriodNumber?: number;
}, semesterId: string, agendaDate: Date) {
  return {
    scheduleId: schedule.id, schoolYearId: schedule.schoolYearId, semesterId,
    classId: schedule.classId, subjectId: schedule.subjectId, teacherId: schedule.teacherId,
    date: agendaDate, effectivePeriodNumber: schedule.effectivePeriodNumber ?? null,
    effectiveStartsAt: schedule.startsAt ?? null, effectiveEndsAt: schedule.endsAt ?? null,
    status: AgendaStatus.SCHEDULED,
  };
}
