const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface SchoolClass {
  id: string;
  schoolYearId: string;
  homeroomTeacherId?: string | null;
  name: string;
  code?: string | null;
  grade?: string | null;
  schoolYear?: SchoolYear;
}

export interface Subject {
  id: string;
  name: string;
  code?: string | null;
  isActive?: boolean;
}

export interface Teacher {
  id: string;
  name: string;
  nip?: string | null;
  nuptk?: string | null;
  email?: string | null;
  phone?: string | null;
  telegramId?: string | null;
  isActive?: boolean;
}

export interface SchoolYear {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

export interface Semester {
  id: string;
  schoolYearId: string;
  type: 'ODD' | 'EVEN';
  startsAt: string;
  endsAt: string;
  schoolYear?: SchoolYear;
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
}

export interface DailyAgenda {
  id: string;
  date: string;
  status: string;
  class: SchoolClass;
  subject: Subject;
  teacher: Teacher;
}

export type NotificationChannel = 'WHATSAPP' | 'TELEGRAM' | 'EMAIL';
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
  };
  queues: QueueSummary[];
  failedJobs: FailedJob[];
}

export type ImportType = 'teachers' | 'students' | 'classes' | 'subjects' | 'schedules';

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
    telegramId?: string | null;
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

export interface AttendanceDemoResult {
  steps: string[];
  reminderJob: {
    id?: string;
    name: string;
    queue: string;
  };
  attendance: {
    id: string;
    state: string;
    itemCount: number;
  };
  summaryJob: {
    id?: string;
    name: string;
    queue: string;
  };
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
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
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function upload<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API upload failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  login: (payload: { username: string; password: string }) =>
    request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: (refreshToken: string) =>
    request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
  getUsers: () => request<ApiResponse<AppUser[]>>('/auth/users'),
  createUser: (payload: {
    email: string;
    username: string;
    name: string;
    password: string;
    roles: string[];
  }) =>
    request<ApiResponse<AppUser>>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getSchoolYears: () =>
    request<ApiResponse<SchoolYear[]>>('/academic/school-years'),
  getSemesters: (schoolYearId?: string) =>
    request<ApiResponse<Semester[]>>(
      `/academic/semesters${schoolYearId ? `?schoolYearId=${schoolYearId}` : ''}`,
    ),
  getClasses: (schoolYearId?: string) =>
    request<ApiResponse<SchoolClass[]>>(
      `/academic/classes${schoolYearId ? `?schoolYearId=${schoolYearId}` : ''}`,
    ),
  getSubjects: () => request<ApiResponse<Subject[]>>('/academic/subjects'),
  getTeachers: () => request<ApiResponse<Teacher[]>>('/academic/teachers'),
  deleteTeacher: (id: string) =>
    request<ApiResponse<Teacher>>(`/academic/teachers/${id}`, {
      method: 'DELETE',
    }),
  getStudents: () => request<ApiResponse<Student[]>>('/academic/students'),
  getSchedules: () => request<ApiResponse<Schedule[]>>('/academic/schedules'),
  createSchedule: (payload: SchedulePayload) =>
    request<ApiResponse<Schedule>>('/academic/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateSchedule: (id: string, payload: SchedulePayload) =>
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
  getSentNotifications: () =>
    request<ApiResponse<NotificationLog[]>>('/notifications/sent'),
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
    `${API_URL}/reporting/exports/${type}?format=${format}&date=${date}`,
  getParentPortalSummary: (contact: string) =>
    request<ApiResponse<ParentPortalSummary>>(
      `/parent-portal/summary?contact=${encodeURIComponent(contact)}`,
    ),
  runTeacherFlowDemo: () =>
    request<ApiResponse<AttendanceDemoResult>>('/attendance/demo/teacher-flow', {
      method: 'POST',
    }),
};
