import { download, getApiUrl, request, restoreBackup, upload } from './api-client';
import type {
  ApiResponse,
  AuthSession,
  MyProfile,
  TelegramLinkToken,
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
  NotificationChannel,
  NotificationStatus,
  NotificationLog,
  NotificationTemplate,
  NotificationRetryResult,
  OperationalDashboardSummary,
  ActivityTrailItem,
  HealthStatus,
  QueueSummary,
  FailedJob,
  OperationsDashboard,
  BackupFile,
  OperationsBackups,
  TelegramOperationsStatus,
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
  TeacherPerformanceSession,
  TeacherPerformanceItem,
  TeacherPerformanceDashboard,
  StudentReportItem,
  StudentReportDashboard,
  SchedulePayload,
  BulkSchedulePayload,
  LoginResult,
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
  login: (payload: { username: string; password: string }) =>
    request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  changeInitialPassword: (payload: {
    newPassword: string;
    repeatPassword: string;
  }) =>
    request<ApiResponse<LoginResult['user']>>('/auth/change-initial-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  changePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    repeatPassword: string;
  }) =>
    request<ApiResponse<null>>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  requestPasswordReset: (payload: { username: string }) =>
    request<{ message: string }>('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: (refreshToken: string) =>
    request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
  getSessions: () => request<ApiResponse<AuthSession[]>>('/auth/sessions'),
  revokeSessions: (refreshToken?: string) =>
    request<ApiResponse<null>>('/auth/sessions/revoke', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
  getMyProfile: () => request<ApiResponse<MyProfile>>('/auth/me/profile'),
  updateMyProfile: (payload: { name?: string }) =>
    request<ApiResponse<MyProfile>>('/auth/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  uploadMyProfilePhoto: (file: File) =>
    upload<ApiResponse<MyProfile>>('/auth/me/profile/photo', file),
  createTelegramLinkToken: () =>
    request<ApiResponse<TelegramLinkToken>>('/auth/me/telegram/link-token', {
      method: 'POST',
    }),
  getUsers: () => request<ApiResponse<AppUser[]>>('/auth/users'),
  createUser: (payload: {
    email?: string;
    username: string;
    name: string;
    password?: string;
    roles: string[];
  }) =>
    request<ApiResponse<AppUser>>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deactivateUser: (id: string) =>
    request<ApiResponse<AppUser>>(`/auth/users/${id}/deactivate`, {
      method: 'PATCH',
    }),
  resetUserPassword: (id: string) =>
    request<ApiResponse<AppUser>>(`/auth/users/${id}/reset-password`, {
      method: 'POST',
    }),
  deleteUser: (id: string) =>
    request<ApiResponse<AppUser>>(`/auth/users/${id}`, {
      method: 'DELETE',
    }),
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
  getSentNotifications: () =>
    request<ApiResponse<NotificationLog[]>>('/notifications/sent'),
  getMyNotifications: () =>
    request<ApiResponse<NotificationLog[]>>('/notifications/mine'),
  markMyNotificationAsRead: (id: string) =>
    request<ApiResponse<NotificationLog>>(`/notifications/mine/${id}/read`, { method: 'PATCH' }),
  getFailedNotifications: () =>
    request<ApiResponse<NotificationLog[]>>('/notifications/failed'),
  getPendingNotifications: () =>
    request<ApiResponse<NotificationLog[]>>('/notifications/pending'),
  getRetryNotifications: () =>
    request<ApiResponse<NotificationLog[]>>('/notifications/failed'),
  retryNotification: (id: string) =>
    request<ApiResponse<NotificationRetryResult>>(`/notifications/retry/${id}`, {
      method: 'POST',
    }),
  getNotificationTemplates: () =>
    request<ApiResponse<NotificationTemplate[]>>('/notifications/templates'),
  getOperationalDashboard: () =>
    request<ApiResponse<OperationalDashboardSummary>>(
      '/reporting/operational/today',
    ),
  getTeacherPerformance: (from?: string, to?: string) => {
    const params = new URLSearchParams();

    if (from) {
      params.set('from', from);
    }

    if (to) {
      params.set('to', to);
    }

    return request<ApiResponse<TeacherPerformanceDashboard>>(
      `/reporting/teacher-performance${params.size ? `?${params}` : ''}`,
    );
  },
  getStudentReport: (payload: {
    from?: string;
    to?: string;
    classId?: string;
    status?: AttendanceStatus | '';
  }) => {
    const params = new URLSearchParams();

    if (payload.from) {
      params.set('from', payload.from);
    }

    if (payload.to) {
      params.set('to', payload.to);
    }

    if (payload.classId) {
      params.set('classId', payload.classId);
    }

    if (payload.status) {
      params.set('status', payload.status);
    }

    return request<ApiResponse<StudentReportDashboard>>(
      `/reporting/students${params.size ? `?${params}` : ''}`,
    );
  },
  getActivityTrail: () => request<ApiResponse<ActivityTrailItem[]>>('/audit/activity'),
  getOperationsDashboard: () =>
    request<ApiResponse<OperationsDashboard>>('/operations/dashboard'),
  getOperationsTelegram: () =>
    request<ApiResponse<TelegramOperationsStatus>>('/operations/telegram'),
  setOperationsTelegramWebhook: () =>
    request<ApiResponse<TelegramOperationsStatus>>('/operations/telegram/webhook', {
      method: 'POST',
    }),
  deleteOperationsTelegramWebhook: () =>
    request<ApiResponse<TelegramOperationsStatus>>('/operations/telegram/webhook/delete', {
      method: 'POST',
    }),
  getOperationsBackups: () => request<ApiResponse<OperationsBackups>>('/operations/backups'),
  createDailyBackup: () => download('/operations/backups/daily'),
  restoreDailyBackup: (file: File) => restoreBackup<ApiResponse<{ filename: string }>>(file),
  createAcademicYearBackup: (schoolYearId: string) => request<ApiResponse<{ filename: string }>>('/operations/backups/academic-year', { method: 'POST', body: JSON.stringify({ schoolYearId }) }),
  retryJob: (queueName: string, jobId: string) =>
    request<ApiResponse<{ queueName: string; jobId: string }>>(
      '/operations/jobs/retry',
      {
        method: 'POST',
        body: JSON.stringify({ queueName, jobId }),
      },
    ),
  discardJob: (queueName: string, jobId: string) =>
    request<ApiResponse<{ queueName: string; jobId: string }>>(
      '/operations/jobs/discard',
      {
        method: 'POST',
        body: JSON.stringify({ queueName, jobId }),
      },
    ),
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
