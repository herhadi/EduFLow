export const QUEUES = {
  NOTIFICATION_SEND: 'notification:send',
  ATTENDANCE_SUMMARY: 'attendance:summary',
  TEACHER_REMINDER: 'teacher:reminder',
  REPORT_DAILY: 'report:daily',
} as const;

export const PERMISSIONS = {
  ACADEMIC_READ: 'academic.read',
  ACADEMIC_MANAGE: 'academic.manage',
  ATTENDANCE_READ: 'attendance.read',
  ATTENDANCE_MANAGE: 'attendance.manage',
  NOTIFICATION_MANAGE: 'notification.manage',
  REPORTING_READ: 'reporting.read',
  USER_MANAGE: 'user.manage',
} as const;

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  permissions: string[];
}

export function compact<T>(values: Array<T | null | undefined>): T[] {
  return values.filter((value): value is T => value != null);
}
