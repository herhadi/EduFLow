import { request } from '../api-client';
import type { AcademicCalendarEvent, AcademicTimeSlot, AcademicTimeSlotType, ApiResponse, BulkSchedulePayload, ClassTimeSlotActivity, DailyAgenda, Schedule, SchedulePayload, ScheduleUpdatePayload } from '../api-types';

export const scheduleApi = {
  getAcademicTimeSlots: (schoolYearId?: string) =>
    request<ApiResponse<AcademicTimeSlot[]>>(
      `/academic/time-slots${schoolYearId ? `?schoolYearId=${schoolYearId}` : ''}`,
    ),
  createAcademicTimeSlot: (payload: {
    schoolYearId: string;
    dayOfWeek: number;
    periodNumber?: number;
    name: string;
    type: AcademicTimeSlotType;
    startsAt: string;
    endsAt: string;
    isAssignable?: boolean;
  }) =>
    request<ApiResponse<AcademicTimeSlot>>('/academic/time-slots', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAcademicTimeSlot: (id: string, payload: {
    dayOfWeek: number;
    periodNumber?: number | null;
    name: string;
    type: AcademicTimeSlotType;
    startsAt: string;
    endsAt: string;
    isAssignable?: boolean;
    isActive?: boolean;
  }) =>
    request<ApiResponse<AcademicTimeSlot>>(`/academic/time-slots/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteAcademicTimeSlot: (id: string) =>
    request<ApiResponse<AcademicTimeSlot>>(`/academic/time-slots/${id}`, {
      method: 'DELETE',
    }),
  getAcademicCalendarEvents: (schoolYearId?: string) =>
    request<ApiResponse<AcademicCalendarEvent[]>>(
      `/academic/calendar/events${schoolYearId ? `?schoolYearId=${schoolYearId}` : ''}`,
    ),
  createAcademicCalendarEvent: (payload: Omit<AcademicCalendarEvent, 'id' | 'semester'>) =>
    request<ApiResponse<AcademicCalendarEvent>>('/academic/calendar/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteAcademicCalendarEvent: (id: string) =>
    request<ApiResponse<AcademicCalendarEvent>>(`/academic/calendar/events/${id}`, {
      method: 'DELETE',
    }),
  getClassTimeSlotActivities: (classId: string) =>
    request<ApiResponse<ClassTimeSlotActivity[]>>(
      `/academic/classes/${classId}/time-slot-activities`,
    ),
  updateClassTimeSlotActivity: (
    classId: string,
    timeSlotId: string,
    type: ClassTimeSlotActivity['type'],
  ) =>
    request<ApiResponse<ClassTimeSlotActivity>>(
      `/academic/classes/${classId}/time-slot-activities/${timeSlotId}`,
      { method: 'PATCH', body: JSON.stringify({ type }) },
    ),
  createSchedule: (payload: SchedulePayload) =>
    request<ApiResponse<Schedule>>('/academic/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createBulkSchedules: (payload: BulkSchedulePayload) =>
    request<ApiResponse<Schedule[]>>('/academic/schedules/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateSchedule: (id: string, payload: ScheduleUpdatePayload) =>
    request<ApiResponse<Schedule>>(`/academic/schedules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteSchedule: (id: string) =>
    request<ApiResponse<Schedule>>(`/academic/schedules/${id}`, {
      method: 'DELETE',
    }),
  generateAgenda: (id: string, date: string) =>
    request<ApiResponse<DailyAgenda>>(`/academic/schedules/${id}/generate-agenda`, {
      method: 'POST',
      body: JSON.stringify({ date }),
    }),
  generateAgendas: (payload: { startsAt: string; endsAt: string; classId?: string; classIds?: string[]; schoolYearId?: string }) =>
    request<ApiResponse<DailyAgenda[]>>('/academic/agendas/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAgendaCoverage: (payload: { schoolYearId: string; startsAt: string; endsAt: string; classId?: string }) => {
    const params = new URLSearchParams({
      schoolYearId: payload.schoolYearId,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      ...(payload.classId ? { classId: payload.classId } : {}),
    });
    return request<ApiResponse<{ expected: number; existing: number; missing: number; blockedDates: number; items: Array<{ date: string; scheduleId: string; classId: string; subjectId: string; teacherId: string; startsAt: string; endsAt: string }> }>>(`/academic/agendas/coverage?${params.toString()}`);
  },
  assignSubstituteTeacher: (id: string, teacherId?: string | null) =>
    request<ApiResponse<DailyAgenda>>(`/academic/agendas/${id}/substitute-teacher`, {
      method: 'PATCH',
      body: JSON.stringify({ teacherId }),
    }),
};
