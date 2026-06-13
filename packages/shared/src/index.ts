export const QUEUES = {
  NOTIFICATION_SEND: 'notification-send',
  ATTENDANCE_SUMMARY: 'attendance-summary',
  TEACHER_REMINDER: 'teacher-reminder',
  REPORT_DAILY: 'report-daily',
} as const;

export const QUEUE_JOBS = {
  NOTIFICATION_SEND_WHATSAPP: 'notification:send:whatsapp',
  NOTIFICATION_SEND_TELEGRAM: 'notification:send:telegram',
  NOTIFICATION_SEND_EMAIL: 'notification:send:email',
  ATTENDANCE_GENERATE_AGENDA: 'attendance:generate-agenda',
  ATTENDANCE_SUMMARY_DAILY: 'attendance:summary:daily',
  TEACHER_REMINDER_BEFORE_CLASS: 'teacher:reminder:before-class',
  TEACHER_DETECT_ABSENT: 'teacher:detect:absent',
  REPORT_DAILY_PRINCIPAL: 'report:daily:principal',
} as const;

export const DOMAIN_EVENTS = {
  ATTENDANCE_STUDENT_RECORDED: 'attendance.student.recorded',
  ATTENDANCE_STUDENT_ABSENT: 'attendance.student.absent',
  ATTENDANCE_CLASS_EMPTY: 'attendance.class.empty',
  TEACHER_CLASS_REMINDER: 'teacher.class.reminder',
  TEACHER_CLASS_ABSENT: 'teacher.class.absent',
  NOTIFICATION_MESSAGE_SENT: 'notification.message.sent',
  NOTIFICATION_MESSAGE_FAILED: 'notification.message.failed',
} as const;

export const PERMISSIONS = {
  AUTH_SESSION_MANAGE: 'auth.session.manage',
  ACADEMIC_READ: 'academic.read',
  ACADEMIC_MANAGE: 'academic.manage',
  SCHEDULE_READ: 'schedule.read',
  SCHEDULE_MANAGE: 'schedule.manage',
  AGENDA_READ: 'agenda.read',
  AGENDA_GENERATE: 'agenda.generate',
  ATTENDANCE_READ: 'attendance.read',
  ATTENDANCE_MANAGE: 'attendance.manage',
  CLASS_STATUS_READ: 'class-status.read',
  CLASS_STATUS_MANAGE: 'class-status.manage',
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_MANAGE: 'notification.manage',
  REPORTING_READ: 'reporting.read',
  REPORTING_MANAGE: 'reporting.manage',
  AUDIT_READ: 'audit.read',
  USER_MANAGE: 'user.manage',
} as const;

export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'guru',
  HOMEROOM_TEACHER: 'wali-kelas',
  PRINCIPAL: 'kepala-sekolah',
  STAFF: 'tu',
  COUNSELOR: 'bk',
  OPERATOR: 'operator',
  PARENT: 'orang-tua',
} as const;

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username?: string | null;
  name?: string;
  roles?: string[];
  permissions: string[];
}

export function compact<T>(values: Array<T | null | undefined>): T[] {
  return values.filter((value): value is T => value != null);
}

export interface SortableSchoolClass {
  name: string;
  grade?: string | null;
}

const gradeOrder: Record<string, number> = {
  VII: 7,
  VIII: 8,
  IX: 9,
};

export function compareSchoolClasses(
  firstClass: SortableSchoolClass,
  secondClass: SortableSchoolClass,
) {
  const gradeDifference =
    getSchoolGradeOrder(firstClass.grade) -
    getSchoolGradeOrder(secondClass.grade);

  return (
    gradeDifference ||
    firstClass.name.localeCompare(secondClass.name, 'id', {
      numeric: true,
      sensitivity: 'base',
    })
  );
}

export function sortSchoolClasses<T extends SortableSchoolClass>(classes: T[]) {
  return [...classes].sort(compareSchoolClasses);
}

export function getSchoolGradeOrder(grade?: string | null) {
  return gradeOrder[grade?.trim().toUpperCase() ?? ''] ?? Number.MAX_SAFE_INTEGER;
}
