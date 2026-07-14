'use client';

import { useEffect, useState } from 'react';
import { api, type StudentLeaveRequest } from '../lib/api';
import { dispatchNotificationChanged } from '../lib/notifications';
import { formatReadableDate } from '../lib/format';
import { useToast } from './ui/toast';

const typeLabels = {
  SICK: 'Sakit',
  EXCUSED: 'Izin',
} as const;

export function StudentLeaveReview() {
  const toast = useToast();
  const [items, setItems] = useState<StudentLeaveRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await api.getStudentLeaveReviewQueue();
      setItems(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Pengajuan izin gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function review(item: StudentLeaveRequest, status: 'APPROVED' | 'REJECTED') {
    setProcessingId(item.id);
    try {
      const response = await api.reviewStudentLeaveRequest(item.id, {
        status,
        reviewNote: notes[item.id]?.trim() || undefined,
      });
      toast.success(response.message ?? 'Review pengajuan disimpan.');
      dispatchNotificationChanged();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Review pengajuan gagal disimpan.');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <section className="mt-6 space-y-4">
      {loading ? (
        <p className="surface-card rounded-2xl p-5 text-sm text-muted">
          Memuat pengajuan izin/sakit...
        </p>
      ) : null}

      {!loading && !items.length ? (
        <p className="surface-card rounded-2xl p-5 text-sm text-muted">
          Tidak ada pengajuan izin/sakit yang menunggu review.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => {
          const activeEnrollment = item.student.enrollments?.[0];

          return (
            <article className="surface-card rounded-[1.75rem] p-5" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-600">
                    {typeLabels[item.type]}
                  </p>
                  <h3 className="mt-1 truncate text-xl font-black">{item.student.name}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {activeEnrollment?.class.name ?? 'Kelas aktif tidak ditemukan'} · {item.guardian.name}
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  Menunggu
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-slate-700">
                {formatReadableDate(item.dateFrom)}
                {item.dateTo !== item.dateFrom ? ` - ${formatReadableDate(item.dateTo)}` : ''}
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-700">{item.reason}</p>

              <label className="mt-4 grid gap-2 text-sm font-bold text-slate-700">
                Catatan review
                <textarea
                  className="min-h-20 rounded-2xl border bg-white px-4 py-3 text-sm font-normal outline-none focus:border-brand-600"
                  onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder="Opsional, misalnya bukti diterima atau alasan penolakan."
                  value={notes[item.id] ?? ''}
                />
              </label>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                  disabled={processingId === item.id}
                  onClick={() => void review(item, 'APPROVED')}
                  type="button"
                >
                  Setujui
                </button>
                <button
                  className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                  disabled={processingId === item.id}
                  onClick={() => void review(item, 'REJECTED')}
                  type="button"
                >
                  Tolak
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
