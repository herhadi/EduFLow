const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface SchoolClass {
  id: string;
  schoolYearId: string;
  name: string;
  grade?: string | null;
  schoolYear?: SchoolYear;
}

export interface Subject {
  id: string;
  name: string;
  code?: string | null;
}

export interface Teacher {
  id: string;
  name: string;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
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
  runTeacherFlowDemo: () =>
    request<ApiResponse<AttendanceDemoResult>>('/attendance/demo/teacher-flow', {
      method: 'POST',
    }),
};
