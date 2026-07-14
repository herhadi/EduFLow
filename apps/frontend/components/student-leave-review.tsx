'use client';

import { useEffect, useState } from 'react';
import { api, type StudentLeaveRequest } from '../lib/api';
import { dispatchNotificationChanged } from '../lib/notifications';
import { formatReadableDate } from '../lib/format';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { EmptyState } from './ui/empty-state';
import { fieldClass, FormField } from './ui/form';
import { LoadingState } from './ui/loading';
import { SurfaceCard } from './ui/card';
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
      {loading ? <LoadingState label="Memuat pengajuan izin/sakit..." /> : null}

      {!loading && !items.length ? (
        <EmptyState title="Tidak ada pengajuan izin/sakit yang menunggu review." />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => {
          const activeEnrollment = item.student.enrollments?.[0];

          return (
            <SurfaceCard className="rounded-[1.75rem]" key={item.id}>
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
                <Badge tone="warning">
                  Menunggu
                </Badge>
              </div>

              <div className="mt-4 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-slate-700">
                {formatReadableDate(item.dateFrom)}
                {item.dateTo !== item.dateFrom ? ` - ${formatReadableDate(item.dateTo)}` : ''}
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-700">{item.reason}</p>

              <FormField className="mt-4" label="Catatan review">
                <textarea
                  className={`${fieldClass} min-h-20 font-normal`}
                  onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder="Opsional, misalnya bukti diterima atau alasan penolakan."
                  value={notes[item.id] ?? ''}
                />
              </FormField>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  disabled={processingId === item.id}
                  onClick={() => void review(item, 'APPROVED')}
                  variant="success"
                >
                  Setujui
                </Button>
                <Button
                  disabled={processingId === item.id}
                  onClick={() => void review(item, 'REJECTED')}
                  variant="danger"
                >
                  Tolak
                </Button>
              </div>
            </SurfaceCard>
          );
        })}
      </div>
    </section>
  );
}
