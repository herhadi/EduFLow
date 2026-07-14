'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type ParentPortalSummary,
  type StudentLeaveRequest,
  type StudentLeaveRequestType,
} from '../lib/api';
import { formatReadableDate } from '../lib/format';
import { getCurrentSessionUser } from '../lib/session';
import { useToast } from './ui/toast';

const typeLabels: Record<StudentLeaveRequestType, string> = {
  SICK: 'Sakit',
  EXCUSED: 'Izin',
};

const statusLabels: Record<StudentLeaveRequest['status'], string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
};

const today = () => new Date().toISOString().slice(0, 10);

export function ParentLeaveRequests() {
  const toast = useToast();
  const [summary, setSummary] = useState<ParentPortalSummary | null>(null);
  const [requests, setRequests] = useState<StudentLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    dateFrom: today(),
    dateTo: today(),
    type: 'SICK' as StudentLeaveRequestType,
    reason: '',
  });

  async function load() {
    setLoading(true);
    try {
      const currentUser = getCurrentSessionUser();
      const contact = currentUser?.email ?? currentUser?.username ?? '';
      const [summaryResponse, requestsResponse] = await Promise.all([
        contact ? api.getParentPortalSummary(contact) : Promise.resolve({ data: null }),
        api.getMyStudentLeaveRequests(),
      ]);

      setSummary(summaryResponse.data);
      setRequests(requestsResponse.data);
      setForm((current) => ({
        ...current,
        studentId: current.studentId || summaryResponse.data?.students[0]?.id || '',
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Data pengajuan izin gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const students = useMemo(() => summary?.students ?? [], [summary]);

  async function submit() {
    if (!form.studentId) {
      toast.error('Pilih anak terlebih dahulu.');
      return;
    }

    if (!form.reason.trim()) {
      toast.error('Alasan izin/sakit wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.createMyStudentLeaveRequest({
        ...form,
        reason: form.reason.trim(),
      });
      toast.success(response.message ?? 'Pengajuan izin/sakit dikirim.');
      setForm((current) => ({ ...current, reason: '' }));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Pengajuan izin/sakit gagal dikirim.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="surface-card rounded-[1.75rem] p-5">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-600">Form Pengajuan</p>
        <h2 className="mt-2 text-xl font-black">Ajukan Izin/Sakit</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Pengajuan masuk ke wali kelas dan operator. Jika disetujui, presensi pada tanggal terkait akan ditandai Sakit atau Izin.
        </p>

        <div className="mt-5 grid gap-3">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Anak
            <select
              className="min-w-0 rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-600"
              disabled={loading || !students.length}
              onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}
              value={form.studentId}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} {student.activeClass ? `- ${student.activeClass.name}` : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Mulai
              <input
                className="min-w-0 rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-600"
                onChange={(event) => setForm((current) => ({ ...current, dateFrom: event.target.value }))}
                type="date"
                value={form.dateFrom}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Sampai
              <input
                className="min-w-0 rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-600"
                onChange={(event) => setForm((current) => ({ ...current, dateTo: event.target.value }))}
                type="date"
                value={form.dateTo}
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Jenis
            <select
              className="min-w-0 rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-600"
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as StudentLeaveRequestType }))}
              value={form.type}
            >
              <option value="SICK">Sakit</option>
              <option value="EXCUSED">Izin</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Alasan
            <textarea
              className="min-h-24 rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-brand-600"
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Contoh: sakit demam dan istirahat di rumah."
              value={form.reason}
            />
          </label>

          <button
            className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            disabled={saving || loading || !students.length}
            onClick={() => void submit()}
            type="button"
          >
            {saving ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </div>

      <aside className="surface-card rounded-[1.75rem] p-5">
        <h3 className="text-base font-black">Status Pengajuan</h3>
        <div className="mt-4 space-y-3">
          {requests.length ? (
            requests.map((request) => (
              <article className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3" key={request.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{request.student.name}</p>
                    <p className="mt-1 text-xs font-bold text-muted">
                      {typeLabels[request.type]} · {formatReadableDate(request.dateFrom)}
                      {request.dateTo !== request.dateFrom ? ` - ${formatReadableDate(request.dateTo)}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-brand-700">
                    {statusLabels[request.status]}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-700">{request.reason}</p>
                {request.reviewNote ? (
                  <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-muted">
                    Catatan: {request.reviewNote}
                  </p>
                ) : null}
              </article>
            ))
          ) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
              Belum ada pengajuan izin/sakit.
            </p>
          )}
        </div>
      </aside>
    </section>
  );
}
