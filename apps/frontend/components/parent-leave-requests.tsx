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
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { EmptyState } from './ui/empty-state';
import { fieldClass, FormField } from './ui/form';
import { LoadingState } from './ui/loading';
import { SurfaceCard } from './ui/card';
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
      <SurfaceCard className="rounded-[1.75rem]">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-600">Form Pengajuan</p>
        <h2 className="mt-2 text-xl font-black">Ajukan Izin/Sakit</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Pengajuan masuk ke wali kelas dan operator. Jika disetujui, presensi pada tanggal terkait akan ditandai Sakit atau Izin.
        </p>

        {loading ? <LoadingState className="mt-5" label="Memuat data anak..." /> : null}

        <div className="mt-5 grid gap-3">
          <FormField label="Anak">
            <select
              className={fieldClass}
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
          </FormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Mulai">
              <input
                className={fieldClass}
                onChange={(event) => setForm((current) => ({ ...current, dateFrom: event.target.value }))}
                type="date"
                value={form.dateFrom}
              />
            </FormField>
            <FormField label="Sampai">
              <input
                className={fieldClass}
                onChange={(event) => setForm((current) => ({ ...current, dateTo: event.target.value }))}
                type="date"
                value={form.dateTo}
              />
            </FormField>
          </div>

          <FormField label="Jenis">
            <select
              className={fieldClass}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as StudentLeaveRequestType }))}
              value={form.type}
            >
              <option value="SICK">Sakit</option>
              <option value="EXCUSED">Izin</option>
            </select>
          </FormField>

          <FormField label="Alasan">
            <textarea
              className={`${fieldClass} min-h-24`}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Contoh: sakit demam dan istirahat di rumah."
              value={form.reason}
            />
          </FormField>

          <Button
            disabled={saving || loading || !students.length}
            onClick={() => void submit()}
          >
            {saving ? 'Mengirim...' : 'Kirim Pengajuan'}
          </Button>
        </div>
      </SurfaceCard>

      <SurfaceCard className="rounded-[1.75rem]">
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
                  <Badge className="shrink-0 bg-white" tone="brand">
                    {statusLabels[request.status]}
                  </Badge>
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
            <EmptyState title="Belum ada pengajuan izin/sakit." />
          )}
        </div>
      </SurfaceCard>
    </section>
  );
}
