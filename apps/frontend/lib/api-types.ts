export interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
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
  timeSlot?: Pick<AcademicTimeSlot, 'id' | 'name' | 'periodNumber'> | null;
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
    timeSlot?: Pick<AcademicTimeSlot, 'id' | 'name' | 'periodNumber'> | null;
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
  substituteTeacher?: Teacher | null;
  schedule?: Pick<Schedule, 'startsAt' | 'endsAt'> | null;
  attendance?: Attendance | null;
  canManageAttendance?: boolean;
}

export type AttendanceStatus = 'PRESENT' | 'SICK' | 'EXCUSED' | 'ABSENT';
export interface AttendanceItem { id: string; status: AttendanceStatus; notes?: string | null; student: Pick<Student, 'id' | 'name'>; }
export interface Attendance {
  id: string;
  state: string;
  submittedAt?: string | null;
  notes?: string | null;
  items: AttendanceItem[];
  classPhotoName?: string | null;
  classPhotoSize?: number | null;
  classPhotoTakenAt?: string | null;
  classPhotoLatitude?: number | null;
  classPhotoLongitude?: number | null;
  classPhotoAccuracy?: number | null;
  teacherPresent?: boolean | null;
  studentAttendanceDone?: boolean | null;
  materialFilled?: boolean | null;
  classPhotoDone?: boolean | null;
  issueNotes?: string | null;
}
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
  kbm?: {
    checklist: {
      teacherPresent: number;
      studentAttendanceDone: number;
      materialFilled: number;
      classPhotoDone: number;
      missing: number;
      withIssueNotes: number;
    };
    substitutes: {
      total: number;
      items: Array<{
        agendaId: string;
        className: string;
        subjectName: string;
        teacherName: string;
        substituteTeacherName?: string | null;
        startsAt?: string | null;
        endsAt?: string | null;
      }>;
    };
    followUpItems: Array<{
      agendaId: string;
      className: string;
      subjectName: string;
      teacherName: string;
      substituteTeacherName?: string | null;
      startsAt?: string | null;
      endsAt?: string | null;
      status: string;
      attendanceState?: string | null;
      issueNotes?: string | null;
    }>;
    todayItems: Array<{
      agendaId: string;
      className: string;
      subjectName: string;
      teacherName: string;
      substituteTeacherName?: string | null;
      startsAt?: string | null;
      endsAt?: string | null;
      status: string;
      attendanceState?: string | null;
      deadlineAt?: string | null;
      isLateSubmitted?: boolean;
      isPastDue?: boolean;
      submittedAt?: string | null;
      teacherPresent?: boolean | null;
      studentAttendanceDone?: boolean | null;
      materialFilled?: boolean | null;
      classPhotoDone?: boolean | null;
      materialNotes?: string | null;
      issueNotes?: string | null;
      classPhotoName?: string | null;
      classPhotoSize?: number | null;
      classPhotoTakenAt?: string | null;
      classPhotoLatitude?: number | null;
      classPhotoLongitude?: number | null;
      classPhotoAccuracy?: number | null;
      classPhotoUrl?: string | null;
    }>;
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
  diagnostics?: {
    databaseLatencyMs: number | null;
    redisLatencyMs: number | null;
  };
  runtime: {
    uptimeSeconds: number;
    cpu: {
      count: number;
      loadAverage1m: number;
      loadPercent: number;
    };
    memory: {
      processRssBytes: number;
      heapUsedBytes: number;
      heapTotalBytes: number;
      systemTotalBytes: number;
      systemFreeBytes: number;
      systemUsedPercent: number;
    };
  };
  requests: {
    windowSeconds: number;
    requestsPerMinute: number;
    errorsPerMinute: number;
    clientErrorsPerMinute: number;
    serverErrorsPerMinute: number;
    averageDurationMs: number;
    recentRequests: number;
    recentErrors: Array<{
      durationMs: number;
      error?: string;
      method: string;
      path: string;
      recordedAt: string;
      statusCode: number;
    }>;
  };
  queueTotals: {
    waiting: number;
    active: number;
    failed: number;
    delayed: number;
    completed: number;
    notification: QueueSummary | null;
    attendance: QueueSummary | null;
    reminder: QueueSummary | null;
    report: QueueSummary | null;
  };
  storageSummary: { bucket: string; objectCount: number; totalSizeBytes: number; isPartial: boolean } | null;
  storageError: string | null;
  queues: QueueSummary[];
  failedJobs: FailedJob[];
}
export interface BackupFile { filename: string; size: number; createdAt: string; }
export interface OperationsBackups { daily: BackupFile[]; academicYears: SchoolYear[]; }
export interface TelegramOperationsStatus {
  config: {
    botTokenConfigured: boolean;
    botUsername?: string | null;
    botUrlConfigured: boolean;
    webhookSecretConfigured: boolean;
    webhookUrl?: string | null;
  };
  provider: {
    reachable: boolean;
    info?: Record<string, unknown> | null;
    webhookUrl?: string | null;
    hasCustomCertificate?: boolean | null;
    pendingUpdateCount?: number | null;
    lastErrorMessage?: string | null;
    lastErrorAt?: string | null;
    maxConnections?: number | null;
    ipAddress?: string | null;
  };
  usage: {
    linkedUsers: number;
    logs: {
      total: number;
      sent: number;
      pending: number;
      failed: number;
    };
  };
  recentLogs: Array<Pick<
    NotificationLog,
    | 'id'
    | 'status'
    | 'recipient'
    | 'recipientName'
    | 'subject'
    | 'templateKey'
    | 'attempts'
    | 'lastError'
    | 'sentAt'
    | 'failedAt'
    | 'createdAt'
  >>;
}

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

export interface ParentGradeRecord {
  id: string;
  date: string;
  title: string;
  type: string;
  className: string;
  subjectName: string;
  teacherName: string;
  score: number;
  maxScore: number;
  notes?: string | null;
}

export interface ParentGradeSummary {
  available: boolean;
  averageScore?: number | null;
  latestScore?: number | null;
  records: ParentGradeRecord[];
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
  grades?: ParentGradeSummary;
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

export type StudentLeaveRequestType = 'SICK' | 'EXCUSED';
export type StudentLeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface StudentLeaveRequest {
  id: string;
  studentId: string;
  guardianId: string;
  requestedById?: string | null;
  dateFrom: string;
  dateTo: string;
  type: StudentLeaveRequestType;
  status: StudentLeaveRequestStatus;
  reason: string;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  student: Student & {
    enrollments?: Array<{
      class: SchoolClass;
      schoolYear?: SchoolYear;
    }>;
  };
  guardian: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  requestedBy?: Pick<AppUser, 'id' | 'name' | 'email'> | null;
  reviewedBy?: Pick<AppUser, 'id' | 'name' | 'email'> | null;
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

export interface StudentReportItem {
  studentId: string;
  studentName: string;
  nis?: string | null;
  nisn?: string | null;
  classId?: string | null;
  className?: string | null;
  guardianName?: string | null;
  guardianContact?: string | null;
  summary: AttendanceSummary;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  riskReason: string;
  dailyGrades: {
    available: boolean;
    averageScore?: number | null;
    latestScore?: number | null;
    records: Array<{
      id: string;
      date: string;
      title: string;
      type: string;
      className: string;
      subjectName: string;
      teacherName: string;
      score: number;
      maxScore: number;
      notes?: string | null;
    }>;
  };
  latestRecords: Array<{
    id: string;
    date: string;
    className: string;
    subjectName: string;
    teacherName: string;
    status: AttendanceStatus;
    notes?: string | null;
  }>;
}

export interface StudentReportDashboard {
  from: string;
  to: string;
  classId?: string | null;
  status?: AttendanceStatus | null;
  summary: AttendanceSummary & {
    highRisk: number;
    mediumRisk: number;
  };
  students: StudentReportItem[];
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

export type AssessmentType =
  | 'DAILY_TASK'
  | 'QUIZ'
  | 'DAILY_TEST'
  | 'PRACTICE'
  | 'PROJECT'
  | 'PORTFOLIO'
  | 'OBSERVATION'
  | 'OTHER';
export type AssessmentStatus = 'DRAFT' | 'SUBMITTED' | 'LOCKED' | 'REVISION_REQUESTED';

export interface AssessmentScore {
  id: string;
  assessmentId: string;
  studentId: string;
  enrollmentId: string;
  score?: string | number | null;
  notes?: string | null;
  student: Pick<Student, 'id' | 'name' | 'nis' | 'nisn'>;
}

export interface Assessment {
  id: string;
  teacherId: string;
  schoolYearId: string;
  semesterId: string;
  classId: string;
  subjectId: string;
  title: string;
  type: AssessmentType;
  assessmentDate: string;
  maxScore: string | number;
  weight: string | number;
  status: AssessmentStatus;
  submittedAt?: string | null;
  notes?: string | null;
  class: SchoolClass;
  subject: Subject;
  schoolYear: SchoolYear;
  semester: Semester;
  scores?: AssessmentScore[];
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
