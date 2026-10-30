import { request } from '../api-client';
import type { ApiResponse, ClassJournal, TeachingJournal, TeachingJournalAgenda } from '../api-types';

export const journalApi = {
  getMyTeachingJournals: (date?: string) =>
    request<ApiResponse<TeachingJournalAgenda[]>>(`/teaching-journals/mine${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  saveTeachingJournal: (agendaId: string, payload: Partial<TeachingJournal>) =>
    request<ApiResponse<TeachingJournal>>(`/teaching-journals/${agendaId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  submitTeachingJournal: (agendaId: string) =>
    request<ApiResponse<TeachingJournal>>(`/teaching-journals/${agendaId}/submit`, { method: 'POST' }),
  getClassJournal: (classId: string, filters: { date?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (filters.date) query.set('date', filters.date);
    if (filters.from) query.set('from', filters.from);
    if (filters.to) query.set('to', filters.to);
    return request<ApiResponse<ClassJournal>>(`/class-journals/${classId}${query.size ? `?${query.toString()}` : ''}`);
  },
  createClassJournalNote: (classId: string, payload: { date: string; content: string }) =>
    request<ApiResponse<ClassJournal['notes'][number]>>(`/class-journals/${classId}/notes`, { method: 'POST', body: JSON.stringify(payload) }),
  updateClassJournalNote: (classId: string, noteId: string, content: string) =>
    request<ApiResponse<ClassJournal['notes'][number]>>(`/class-journals/${classId}/notes/${noteId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
};
