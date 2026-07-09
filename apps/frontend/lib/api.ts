const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getApiUrl() {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL belum dikonfigurasi.');
  }

  return API_URL;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface AuthSession {
  id: string;
  tokenHash: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  revokedAt?: string | null;
  revokedReason?: string | null;
  createdAt: string;
}

export interface MyProfile {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  roles: string[];
  photoUrl?: string | null;
  telegramId?: string | null;
  telegramLinkedAt?: string | null;
}

export interface TelegramLinkToken {
  token: string;
  botUrl?: string | null;
  expiresAt: string;
}

export interface SchoolClass {
  id: string;
  schoolYearId: string;
  homeroomTeacherId?: string | null;
  name: string;
  code?: string | null;
  grade?: string | null;
  schoolYear?: SchoolYear;
  homeroomTeacher?: Teacher | null;
}

export interface Subject {
  id: string;
  name: string;
  code?: string | null;
  isActive?: boolean;
}

export interface Teacher {
  id: string;
  userId?: string | null;
  name: string;
  nip?: string | null;
  nuptk?: string | null;
  email?: string | null;
  phone?: string | null;
  telegramId?: string | null;
  photoUrl?: string | null;
  isActive?: boolean;
  user?: {
    id: string;
    email: string;
    username?: string | null;
    name: string;
    roles: Array<{ role: { name: string } }>;
  } | null;
  subjects?: Array<{ subject: Subject }>;
  yearAssignments?: TeacherSchoolYearAssignment[];
}

export type TeacherAssignmentStatus = 'ACTIVE' | 'RETIRED' | 'TRANSFERRED' | 'ON_LEAVE' | 'INACTIVE';

export interface TeacherSchoolYearAssignment {
  id: string;
  teacherId: string;
  schoolYearId: string;
  status: TeacherAssignmentStatus;
  notes?: string | null;
  schoolYear: SchoolYear;
  subjects: Array<{ subject: Subject }>;
}

export interface SchoolYear {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

export interface CloneSchoolYearMasterResult {
  classes: number;
  timeSlots: number;
  classActivities: number;
}

export interface Semester {
  id: string;
  schoolYearId: string;
  type: 'ODD' | 'EVEN';
  startsAt: string;
  endsAt: string;
  schoolYear?: SchoolYear;
}

export type AcademicCalendarEventType = 'HOLIDAY' | 'EXAM' | 'SCHOOL_ACTIVITY' | 'NON_TEACHING_DAY' | 'OTHER';

export interface AcademicCalendarEvent {
  id: string;
  schoolYearId: string;
  semesterId?: string | null;
  title: string;
  description?: string | null;
  type: AcademicCalendarEventType;
  startsAt: string;
  endsAt: string;
  blocksAgenda: boolean;
  semester?: Semester | null;
}

export interface StudentEnrollment {
  id: string;
  isActive: boolean;
  class: SchoolClass;
  schoolYear: SchoolYear;
}

export interface StudentGuardian {
  id: string;
  relation: string;
  isPrimary: boolean;
  guardian: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    telegramId?: string | null;
  };
}

export interface Student {
  id: string;
  name: string;
  nis?: string | null;
  nisn?: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  birthDate?: string | null;
  phone?: string | null;
  isActive?: boolean;
  enrollments: StudentEnrollment[];
  guardians: StudentGuardian[];
}

export interface Schedule {
  id: string;
  schoolYearId: string;
  semesterId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  timeSlotId?: string | null;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  room?: string | null;
  isActive?: boolean;
  schoolYear: SchoolYear;
  semester: Semester;
  class: SchoolClass;
  subject: Subject;
  teacher: Teacher;
  revisions?: Array<{
    id: string;
    semesterId: string;
    effectiveFrom: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    timeSlotId?: string | null;
    dayOfWeek: number;
    startsAt: string;
    endsAt: string;
    room?: string | null;
    class: SchoolClass;
    subject: Subject;
    teacher: Teacher;
    reason?: string | null;
  }>;
}

export type ScheduleUpdatePayload = SchedulePayload & { effectiveFrom?: string; reason?: string };

export interface DailyAgenda {
  id: string;
  date: string;
  status: string;
  class: SchoolClass;
  subject: Subject;
  teacher: Teacher;
  schedule?: Pick<Schedule, 'startsAt' | 'endsAt'> | null;
  attendance?: Attendance | null;
}

export type AttendanceStatus = 'PRESENT' | 'SICK' | 'EXCUSED' | 'ABSENT';
export interface AttendanceItem { id: string; status: AttendanceStatus; notes?: string | null; student: Pick<Student, 'id' | 'name'>; }
export interface Attendance { id: string; state: string; items: AttendanceItem[]; classPhotoName?: string | null; }
export interface AttendanceSummary {
  total: number;
  present: number;
  sick: number;
  excused: number;
  absent: number;
}
export interface HomeroomStudent extends Student {
  todayStatus?: AttendanceStatus | null;
  monthSummary: AttendanceSummary;
}
export interface HomeroomOverview {
  class: SchoolClass | null;
  students: HomeroomStudent[];
  summary: AttendanceSummary;
  monthSummary: AttendanceSummary;
  riskStudents: HomeroomStudent[];
}

export type AcademicTimeSlotType =
  | 'LESSON'
  | 'BREAK'
  | 'CEREMONY'
  | 'EXERCISE'
  | 'CO_CURRICULAR'
  | 'RELIGIOUS'
  | 'OTHER';

export interface AcademicTimeSlot {
  id: string;
  schoolYearId: string;
  dayOfWeek: number;
  periodNumber?: number | null;
  name: string;
  type: AcademicTimeSlotType;
  startsAt: string;
  endsAt: string;
  isAssignable: boolean;
  isActive: boolean;
}

export interface ClassTimeSlotActivity {
  id: string;
  classId: string;
  timeSlotId: string;
  type: 'BREAK' | 'RELIGIOUS';
}

export type NotificationChannel = 'WHATSAPP' | 'TELEGRAM' | 'EMAIL' | 'IN_APP';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface NotificationLog {
  id: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: string;
  recipientName?: string | null;
  subject?: string | null;
  message: string;
  templateKey?: string | null;
  attempts: number;
  lastError?: string | null;
  sentAt?: string | null;
  failedAt?: string | null;
  readAt?: string | null;
  actionUrl?: string | null;
  createdAt: string;
}

export interface NotificationTemplate {
  id: string;
  key: string;
  name: string;
  channel: NotificationChannel;
  subject?: string | null;
  body: string;
  isActive: boolean;
}

export interface NotificationRetryResult {
  notification: NotificationLog;
  job: {
    id?: string;
    name: string;
    queue: string;
  };
}

export interface OperationalDashboardSummary {
  date: string;
  classes: {
    totalToday: number;
    inProgress: number;
    completed: number;
    empty: number;
    notSubmitted: number;
  };
  teachers: {
    totalTeaching: number;
    submitted: number;
    notSubmitted: number;
  };
  students: {
    present: number;
    sick: number;
    excused: number;
    absent: number;
  };
  notifications: {
    reminderSent: number;
    summarySent: number;
    failed: number;
  };
}

export interface ActivityTrailItem {
  id: string;
  time: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  source: 'audit' | 'notification';
  actor?: string | null;
  metadata?: unknown;
}

export type HealthStatus = 'Healthy' | 'Unhealthy';

export interface QueueSummary {
  name: string;
  label: string;
  status: HealthStatus;
  waiting: number;
  active: number;
  failed: number;
  delayed: number;
  completed: number;
}

export interface FailedJob {
  id: string;
  queueName: string;
  queueLabel: string;
  name: string;
  attemptsMade: number;
  failedReason?: string;
  timestamp: string;
  processedOn?: string | null;
  finishedOn?: string | null;
  payload: unknown;
}

export interface OperationsDashboard {
  health: {
    redis: HealthStatus;
    queue: HealthStatus;
    worker: HealthStatus;
    database: HealthStatus;
    notification: HealthStatus;
    storage: HealthStatus;
  };
  storageSummary: { bucket: string; objectCount: number; totalSizeBytes: number; isPartial: boolean } | null;
  storageError: string | null;
  queues: QueueSummary[];
  failedJobs: FailedJob[];
}
export interface BackupFile { filename: string; size: number; createdAt: string; }
export interface OperationsBackups { daily: BackupFile[]; academicYears: SchoolYear[]; }

export type ImportType = 'teachers' | 'students';

export interface ImportSummary {
  type: ImportType;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

export type ReportType =
  | 'attendance-summary'
  | 'teacher-teaching'
  | 'empty-classes'
  | 'student-attendance';
export type ReportFormat = 'excel' | 'pdf';

export interface ParentAttendanceSummary {
  present: number;
  sick: number;
  excused: number;
  absent: number;
  total: number;
}

export interface ParentAttendanceRecord {
  id: string;
  date: string;
  className: string;
  subjectName: string;
  teacherName: string;
  agendaStatus: string;
  attendanceState: string;
  status: 'PRESENT' | 'SICK' | 'EXCUSED' | 'ABSENT';
  notes?: string | null;
}

export interface ParentPortalStudent {
  id: string;
  name: string;
  nis?: string | null;
  nisn?: string | null;
  relation: string;
  isPrimary: boolean;
  activeClass?: {
    id: string;
    name: string;
    grade?: string | null;
    schoolYear: string;
  } | null;
  todaySummary: ParentAttendanceSummary;
  dailySummary: ParentAttendanceRecord[];
  history: ParentAttendanceRecord[];
}

export interface ParentPortalSummary {
  guardian: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  date: string;
  summary: ParentAttendanceSummary;
  students: ParentPortalStudent[];
}

export interface TeacherPerformanceSession {
  agendaId: string;
  date: string;
  className: string;
  subjectName: string;
  agendaStatus: string;
  attendanceState?: string | null;
  submittedAt?: string | null;
  isLate: boolean;
}

export interface TeacherPerformanceItem {
  teacherId: string;
  teacherName: string;
  totalSessions: number;
  submittedSessions: number;
  lateSubmissions: number;
  emptyClasses: number;
  notSubmitted: number;
  onTimeSubmissions: number;
  submitRate: number;
  latestSessions: TeacherPerformanceSession[];
}

export interface TeacherPerformanceDashboard {
  from: string;
  to: string;
  totalTeachers: number;
  totalSessions: number;
  totalLateSubmissions: number;
  totalEmptyClasses: number;
  teachers: TeacherPerformanceItem[];
}

export interface SchedulePayload {
  schoolYearId: string;
  semesterId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
}

export interface BulkSchedulePayload {
  schoolYearId: string;
  semesterId: string;
  subjectId: string;
  teacherId: string;
  assignments: Array<{ timeSlotId: string; classIds: string[] }>;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    username?: string | null;
    name: string;
    photoUrl?: string | null;
    telegramId?: string | null;
    telegramLinkedAt?: string | null;
    roles: string[];
    permissions: string[];
    mustChangePassword?: boolean;
  };
}

export type TeachingPlanType = 'ANNUAL_PROGRAM' | 'SEMESTER_PROGRAM' | 'KKTP' | 'LESSON_PLAN' | 'TEACHING_BOOK';
export type TeachingPlanStatus = 'DRAFT' | 'SUBMITTED' | 'REVISION_REQUESTED' | 'APPROVED' | 'ARCHIVED';
export type TeachingPlanRevisionPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export interface TeachingPlan {
  id: string;
  subjectId: string;
  schoolYearId: string;
  semesterId?: string | null;
  type: TeachingPlanType;
  title: string;
  description?: string | null;
  attachmentUrl?: string | null;
  attachmentKey?: string | null;
  attachmentName?: string | null;
  attachmentMimeType?: string | null;
  attachmentSize?: number | null;
  attachmentUploadedAt?: string | null;
  status: TeachingPlanStatus;
  reviewNote?: string | null;
  reviewSection?: string | null;
  reviewPriority?: TeachingPlanRevisionPriority | null;
  subject: Subject;
  schoolYear: SchoolYear;
  semester?: Semester | null;
  teacher?: Teacher;
}

export interface AppUser {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  roles: string[];
  lastLoginAt?: string | null;
  lockedUntil?: string | null;
  createdAt?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken =
    typeof window === 'undefined' ? undefined : localStorage.getItem('accessToken');
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 401) {
    clearSessionAndRedirect();
    throw new Error('Session berakhir. Silakan login ulang.');
  }

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    try {
      const body = (await response.json()) as { message?: string | string[] };
      const responseMessage = Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message;

      if (responseMessage) {
        message = responseMessage;
      }
    } catch {
      // Biarkan fallback status dipakai jika response bukan JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

async function upload<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  const accessToken =
    typeof window === 'undefined' ? undefined : localStorage.getItem('accessToken');

  const response = await fetch(`${getApiUrl()}${path}`, {
    method: 'POST',
    body: formData,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (response.status === 401) {
    clearSessionAndRedirect();
    throw new Error('Session berakhir. Silakan login ulang.');
  }

  if (!response.ok) {
    throw new Error(`API upload failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function download(path: string) {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${getApiUrl()}${path}`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error('Backup gagal dibuat.');
  const blob = await response.blob();
  const filename = response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/)?.[1] ?? 'eduflow-backup.dump';
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

async function restoreBackup(file: File) {
  const formData = new FormData(); formData.append('file', file); formData.append('confirmation', 'RESTORE');
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${getApiUrl()}/operations/backups/daily/restore`, { method: 'POST', body: formData, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error('Restore gagal.');
  return response.json() as Promise<ApiResponse<{ filename: string }>>;
}

function clearSessionAndRedirect() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('sessionExpiresAt');
  localStorage.removeItem('currentUser');

  if (window.location.pathname !== '/login') {
    window.location.href = '/login?reason=session-expired';
  }
}

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
  submitAttendance: (payload: { attendanceId: string; notes?: string; items: Array<{ attendanceItemId: string; status: AttendanceStatus; notes?: string }> }) => request<ApiResponse<Attendance>>('/attendance/submit', { method: 'POST', body: JSON.stringify(payload) }),
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
  getActivityTrail: () => request<ApiResponse<ActivityTrailItem[]>>('/audit/activity'),
  getOperationsDashboard: () =>
    request<ApiResponse<OperationsDashboard>>('/operations/dashboard'),
  getOperationsBackups: () => request<ApiResponse<OperationsBackups>>('/operations/backups'),
  createDailyBackup: () => download('/operations/backups/daily'),
  restoreDailyBackup: (file: File) => restoreBackup(file),
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
};
