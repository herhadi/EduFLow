import { getApiUrl, request, upload } from './api-client';
import { authApi } from './api-modules/auth-api';
import { notificationApi } from './api-modules/notification-api';
import { operationsApi } from './api-modules/operations-api';
import { reportingApi } from './api-modules/reporting-api';
import type {
  ApiResponse,
  SchoolClass,
  Subject,
  Teacher,
  TeacherAssignmentStatus,
  TeacherSchoolYearAssignment,
  SchoolYear,
  CloneSchoolYearMasterResult,
  Semester,
  AcademicCalendarEventType,
  AcademicCalendarEvent,
  StudentEnrollment,
  StudentGuardian,
  Student,
  Schedule,
  ScheduleUpdatePayload,
  DailyAgenda,
  AttendanceStatus,
  AttendanceItem,
  Attendance,
  AttendanceSummary,
  HomeroomStudent,
  HomeroomOverview,
  AcademicTimeSlotType,
  AcademicTimeSlot,
  ClassTimeSlotActivity,
  ImportType,
  ImportSummary,
  ReportType,
  ReportFormat,
  ParentAttendanceSummary,
  ParentAttendanceRecord,
  ParentGradeRecord,
  ParentGradeSummary,
  ParentPortalStudent,
  ParentPortalSummary,
  StudentLeaveRequestType,
  StudentLeaveRequestStatus,
  StudentLeaveRequest,
  SchedulePayload,
  BulkSchedulePayload,
  TeachingPlanType,
  TeachingPlanStatus,
  TeachingPlanRevisionPriority,
  TeachingPlan,
  AssessmentType,
  AssessmentStatus,
  AssessmentScore,
  Assessment,
  AppUser
} from './api-types';

export type * from './api-types';

export const api = {
  ...authApi,
  getSchoolYears: () =>
    request<ApiResponse<SchoolYear[]>>('/academic/school-years'),
  createSchoolYear: (payload: { name: string }) =>
    request<ApiResponse<SchoolYear>>('/academic/school-years', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cloneSchoolYearMaster: (payload: {
    sourceSchoolYearId: string;
    targetSchoolYearId: string;
    includeClasses?: boolean;
    includeTimeSlots?: boolean;
    includeClassActivities?: boolean;
  }) =>
    request<ApiResponse<CloneSchoolYearMasterResult>>('/academic/school-years/clone-master', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getSemesters: (schoolYearId?: string) =>
    request<ApiResponse<Semester[]>>(
      `/academic/semesters${schoolYearId ? `?schoolYearId=${schoolYearId}` : ''}`,
    ),
  getClasses: (schoolYearId?: string) =>
    request<ApiResponse<SchoolClass[]>>(
      `/academic/classes${schoolYearId ? `?schoolYearId=${schoolYearId}` : ''}`,
    ),
  createClass: (payload: {
    schoolYearId: string;
    name: string;
    code?: string;
    grade?: string;
  }) =>
    request<ApiResponse<SchoolClass>>('/academic/classes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteClass: (id: string) =>
    request<ApiResponse<SchoolClass>>(`/academic/classes/${id}`, {
      method: 'DELETE',
    }),
  getSubjects: () => request<ApiResponse<Subject[]>>('/academic/subjects'),
  createSubject: (payload: { name: string; code?: string }) =>
    request<ApiResponse<Subject>>('/academic/subjects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteSubject: (id: string) =>
    request<ApiResponse<Subject>>(`/academic/subjects/${id}`, {
      method: 'DELETE',
    }),
  getTeachers: () => request<ApiResponse<Teacher[]>>('/academic/teachers'),
  createTeacher: (payload: {
    name: string;
    nip?: string;
    phone?: string;
    email?: string;
  }) =>
    request<ApiResponse<Teacher>>('/academic/teachers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateTeacher: (id: string, payload: Partial<Pick<Teacher, 'name' | 'nip' | 'nuptk' | 'phone' | 'email' | 'telegramId' | 'photoUrl'>>) =>
    request<ApiResponse<Teacher>>(`/academic/teachers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  uploadTeacherPhoto: (id: string, file: File) =>
    upload<ApiResponse<Teacher>>(`/academic/teachers/${id}/photo`, file),
  configureTeacherAccount: (
    id: string,
    payload: {
      username: string;
      email?: string;
      roles: string[];
    },
  ) =>
    request<ApiResponse<AppUser>>(`/academic/teachers/${id}/account`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  resetTeacherPassword: (id: string) =>
    request<ApiResponse<{ id: string }>>(`/academic/teachers/${id}/reset-password`, {
      method: 'POST',
    }),
  setTeacherSubjects: (id: string, subjectIds: string[]) =>
    request<ApiResponse<Teacher>>(`/academic/teachers/${id}/subjects`, {
      method: 'PATCH',
      body: JSON.stringify({ subjectIds }),
    }),
  getTeacherSchoolYearAssignments: (id: string) =>
    request<ApiResponse<TeacherSchoolYearAssignment[]>>(`/academic/teachers/${id}/assignments`),
  setTeacherSchoolYearAssignment: (
    id: string,
    schoolYearId: string,
    payload: { status: TeacherAssignmentStatus; subjectIds: string[]; notes?: string },
  ) =>
    request<ApiResponse<TeacherSchoolYearAssignment>>(`/academic/teachers/${id}/assignments/${schoolYearId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  setClassHomeroomTeacher: (id: string, teacherId?: string | null) =>
    request<ApiResponse<SchoolClass>>(`/academic/classes/${id}/homeroom-teacher`, {
      method: 'PATCH',
      body: JSON.stringify({ teacherId }),
    }),
  deleteTeacher: (id: string) =>
    request<ApiResponse<Teacher>>(`/academic/teachers/${id}`, {
      method: 'DELETE',
    }),
  deleteTeacherPermanently: (id: string) =>
    request<ApiResponse<Teacher>>(`/academic/teachers/${id}/permanent`, {
      method: 'DELETE',
    }),
  getStudents: () => request<ApiResponse<Student[]>>('/academic/students'),
  getSchedules: () => request<ApiResponse<Schedule[]>>('/academic/schedules'),
  getScheduleRevisions: (id: string) =>
    request<ApiResponse<NonNullable<Schedule['revisions']>>>(`/academic/schedules/${id}/revisions`),
  cancelScheduleRevision: (id: string, revisionId: string) =>
    request<ApiResponse<Schedule>>(`/academic/schedules/${id}/revisions/${revisionId}`, {
      method: 'DELETE',
    }),
  getMySchedules: () =>
    request<ApiResponse<Schedule[]>>('/academic/me/schedules'),
  getMyAgendas: (date: string) => request<ApiResponse<DailyAgenda[]>>(`/academic/me/agendas?date=${date}`),
  openClass: (agendaId: string) => request<ApiResponse<Attendance>>('/attendance/open-class', { method: 'POST', body: JSON.stringify({ agendaId }) }),
  getAttendance: (id: string) => request<ApiResponse<Attendance>>(`/attendance/${id}`),
  uploadAttendanceClassPhoto: (id: string, file: File) => upload<ApiResponse<Attendance>>(`/attendance/${id}/class-photo`, file),
  submitAttendance: (payload: {
    attendanceId: string;
    notes?: string;
    teacherPresent?: boolean;
    studentAttendanceDone?: boolean;
    materialFilled?: boolean;
    classPhotoDone?: boolean;
    issueNotes?: string;
    items: Array<{ attendanceItemId: string; status: AttendanceStatus; notes?: string }>;
  }) => request<ApiResponse<Attendance>>('/attendance/submit', { method: 'POST', body: JSON.stringify(payload) }),
  getMySubjects: () => request<ApiResponse<Subject[]>>('/academic/me/subjects'),
  getMyHomeroom: () => request<ApiResponse<HomeroomOverview>>('/academic/me/homeroom'),
  getMyTeachingPlans: () => request<ApiResponse<TeachingPlan[]>>('/academic-planning/mine'),
  createTeachingPlan: (payload: { subjectId: string; schoolYearId: string; semesterId?: string; type: TeachingPlanType; title: string; description?: string; attachmentUrl?: string }) =>
    request<ApiResponse<TeachingPlan>>('/academic-planning', { method: 'POST', body: JSON.stringify(payload) }),
  uploadTeachingPlanAttachment: (id: string, file: File) =>
    upload<ApiResponse<TeachingPlan>>(`/academic-planning/${id}/attachment`, file),
  getTeachingPlanAttachmentUrl: (id: string) =>
    request<ApiResponse<{ url: string }>>(`/academic-planning/${id}/attachment-url`),
  getTeachingPlanReviewQueue: () =>
    request<ApiResponse<TeachingPlan[]>>('/academic-planning/review-queue'),
  reviewTeachingPlan: (id: string, payload: {
    status: 'APPROVED' | 'REVISION_REQUESTED';
    reviewNote?: string;
    reviewSection?: string;
    reviewPriority?: TeachingPlanRevisionPriority;
  }) =>
    request<ApiResponse<TeachingPlan>>(`/academic-planning/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  submitTeachingPlan: (id: string) =>
    request<ApiResponse<TeachingPlan>>(`/academic-planning/${id}/submit`, { method: 'POST' }),
  getMyAssessments: (payload?: { classId?: string; subjectId?: string; semesterId?: string }) => {
    const params = new URLSearchParams();

    if (payload?.classId) {
      params.set('classId', payload.classId);
    }

    if (payload?.subjectId) {
      params.set('subjectId', payload.subjectId);
    }

    if (payload?.semesterId) {
      params.set('semesterId', payload.semesterId);
    }

    return request<ApiResponse<Assessment[]>>(
      `/student-grades/assessments/mine${params.size ? `?${params}` : ''}`,
    );
  },
  getAssessment: (id: string) =>
    request<ApiResponse<Assessment>>(`/student-grades/assessments/${id}`),
  createAssessment: (payload: {
    schoolYearId: string;
    semesterId: string;
    classId: string;
    subjectId: string;
    title: string;
    type: AssessmentType;
    assessmentDate: string;
    maxScore?: number;
    weight?: number;
    notes?: string;
  }) =>
    request<ApiResponse<Assessment>>('/student-grades/assessments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  saveAssessmentScores: (
    id: string,
    payload: { scores: Array<{ scoreId: string; score?: number | null; notes?: string | null }> },
  ) =>
    request<ApiResponse<Assessment>>(`/student-grades/assessments/${id}/scores`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  submitAssessment: (id: string) =>
    request<ApiResponse<Assessment>>(`/student-grades/assessments/${id}/submit`, { method: 'POST' }),
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
  ...notificationApi,
  ...reportingApi,
  ...operationsApi,
  importAcademicData: (type: ImportType, file: File) =>
    upload<ApiResponse<ImportSummary>>(`/academic/import/${type}`, file),
  getReportExportUrl: (type: ReportType, format: ReportFormat, date: string) =>
    `${getApiUrl()}/reporting/exports/${type}?format=${format}&date=${date}`,
  getParentPortalSummary: (contact: string) =>
    request<ApiResponse<ParentPortalSummary>>(
      `/parent-portal/summary?contact=${encodeURIComponent(contact)}`,
    ),
  getMyStudentLeaveRequests: () =>
    request<ApiResponse<StudentLeaveRequest[]>>('/student-leaves/mine'),
  createMyStudentLeaveRequest: (payload: {
    studentId: string;
    dateFrom: string;
    dateTo: string;
    type: StudentLeaveRequestType;
    reason: string;
  }) =>
    request<ApiResponse<StudentLeaveRequest>>('/student-leaves/mine', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getStudentLeaveReviewQueue: () =>
    request<ApiResponse<StudentLeaveRequest[]>>('/student-leaves/review'),
  reviewStudentLeaveRequest: (
    id: string,
    payload: { status: 'APPROVED' | 'REJECTED'; reviewNote?: string },
  ) =>
    request<ApiResponse<StudentLeaveRequest>>(`/student-leaves/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
