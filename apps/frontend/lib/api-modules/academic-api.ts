import { request, upload } from '../api-client';
import type { ApiResponse, AppUser, Attendance, AttendanceStatus, DailyAgenda, HomeroomOverview, Schedule, SchoolClass, SchoolYear, CloneSchoolYearMasterResult, Semester, Student, Subject, Teacher, TeacherAssignmentStatus, TeacherSchoolYearAssignment } from '../api-types';

export const academicApi = {
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
  uploadAttendanceClassPhoto: (id: string, file: File, metadata?: {
    accuracy?: number;
    latitude?: number;
    longitude?: number;
    takenAt?: string;
  }) => upload<ApiResponse<Attendance>>(`/attendance/${id}/class-photo`, file, metadata),
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
};
