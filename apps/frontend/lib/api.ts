const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  grade?: string | null;
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

export interface Schedule {
  id: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  class: SchoolClass;
  subject: Subject;
  teacher: Teacher;
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
  getClasses: () => request<ApiResponse<SchoolClass[]>>('/academic/classes'),
  getSchedules: () => request<ApiResponse<Schedule[]>>('/academic/schedules'),
  runTeacherFlowDemo: () =>
    request<ApiResponse<AttendanceDemoResult>>('/attendance/demo/teacher-flow', {
      method: 'POST',
    }),
};

