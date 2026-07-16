'use client';

import { useEffect, useState } from 'react';
import { api, type TeachingPlan, type TeachingPlanRevisionPriority } from '../lib/api';
import { dispatchNotificationChanged } from '../lib/notifications';
import { openTeachingPlanAttachment } from '../lib/open-document';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { EmptyState } from './ui/empty-state';
import { fieldClass, FormField } from './ui/form';
import { LoadingState } from './ui/loading';
import { SurfaceCard } from './ui/card';
import { useToast } from './ui/toast';

const typeLabels = {
  ANNUAL_PROGRAM: 'Program Tahunan',
  SEMESTER_PROGRAM: 'Program Semester',
  KKTP: 'KKTP',
  LESSON_PLAN: 'Perencanaan Pembelajaran',
  TEACHING_BOOK: 'Buku KBM',
};

export function PrincipalTeachingPlanReview() {
  const toast = useToast();
  const [plans, setPlans] = useState<TeachingPlan[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [sections, setSections] = useState<Record<string, string>>({});
  const [priorities, setPriorities] = useState<Record<string, TeachingPlanRevisionPriority>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    void loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const response = await api.getTeachingPlanReviewQueue();
      setPlans(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Antrean review gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }

  async function openAttachment(plan: TeachingPlan) {
    try {
      const response = await api.getTeachingPlanAttachmentUrl(plan.id);
      openTeachingPlanAttachment(response.data.url, plan.attachmentMimeType);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Dokumen gagal dibuka.');
    }
  }

  async function review(plan: TeachingPlan, status: 'APPROVED' | 'REVISION_REQUESTED') {
    const reviewNote = notes[plan.id]?.trim();
    const reviewSection = sections[plan.id]?.trim();
    const reviewPriority = priorities[plan.id] ?? 'MEDIUM';

    if (status === 'REVISION_REQUESTED' && !reviewNote) {
      toast.error('Catatan revisi wajib diisi.');
      return;
    }

    setProcessingId(plan.id);
    try {
      const response = await api.reviewTeachingPlan(plan.id, {
        status,
        reviewNote: reviewNote || undefined,
        reviewSection: status === 'REVISION_REQUESTED' ? reviewSection || undefined : undefined,
        reviewPriority: status === 'REVISION_REQUESTED' ? reviewPriority : undefined,
      });
      setPlans((current) => current.filter((item) => item.id !== plan.id));
      dispatchNotificationChanged();
      toast.success(response.message ?? (status === 'APPROVED' ? 'Perangkat ajar disetujui.' : 'Revisi dikirim ke guru.'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Review gagal disimpan.');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <section className="mt-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Perangkat Ajar Menunggu Review</h2>
          <p className="mt-1 text-sm text-muted">Periksa dokumen atau foto Buku KBM guru sebelum menyetujui atau meminta revisi.</p>
        </div>
        <Badge tone="brand">{plans.length} pengajuan</Badge>
      </div>

      {loading ? <LoadingState label="Memuat antrean review..." /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => (
          <SurfaceCard className="rounded-[1.75rem]" key={plan.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-brand-700">{typeLabels[plan.type]}</p>
                <h3 className="mt-1 text-lg font-black">{plan.title}</h3>
                <p className="mt-1 text-sm font-bold">{plan.teacher?.name ?? 'Guru'}</p>
                <p className="mt-1 text-sm text-muted">{plan.subject.name} · {plan.schoolYear.name}{plan.semester ? ` · ${plan.semester.type === 'ODD' ? 'Ganjil' : 'Genap'}` : ''}</p>
              </div>
              <Badge tone="warning">Menunggu Review</Badge>
            </div>

            {plan.description ? <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-900 dark:text-slate-200">{plan.description}</p> : null}
            {plan.attachmentKey || plan.attachmentUrl ? (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-400/20 dark:bg-blue-500/10 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-brand-700">
                    Lampiran Guru
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {plan.attachmentName ?? (plan.type === 'TEACHING_BOOK' ? 'Foto Buku KBM' : 'Dokumen perangkat ajar')}
                  </p>
                  {plan.attachmentSize ? (
                    <p className="mt-0.5 text-xs font-semibold text-muted">
                      {formatFileSize(plan.attachmentSize)}
                    </p>
                  ) : null}
                </div>
                <Button
                  onClick={() => void openAttachment(plan)}
                  variant="outline"
                >
                  {plan.type === 'TEACHING_BOOK' ? 'Buka Foto' : 'Buka Dokumen'}
                </Button>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100">
                Lampiran belum tersedia. Minta revisi agar guru mengunggah dokumen sebelum disetujui.
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.55fr]">
              <FormField label="Bagian/Halaman">
                <input
                  className={`${fieldClass} font-normal dark:bg-slate-950`}
                  onChange={(event) =>
                    setSections((current) => ({ ...current, [plan.id]: event.target.value }))
                  }
                  placeholder="Contoh: Hal. 2 bagian asesmen"
                  value={sections[plan.id] ?? ''}
                />
              </FormField>
              <FormField label="Prioritas">
                <select
                  className={`${fieldClass} font-normal dark:bg-slate-950`}
                  onChange={(event) =>
                    setPriorities((current) => ({
                      ...current,
                      [plan.id]: event.target.value as TeachingPlanRevisionPriority,
                    }))
                  }
                  value={priorities[plan.id] ?? 'MEDIUM'}
                >
                  <option value="HIGH">Tinggi</option>
                  <option value="MEDIUM">Sedang</option>
                  <option value="LOW">Rendah</option>
                </select>
              </FormField>
            </div>
            <FormField className="mt-4" label="Catatan untuk Guru">
              <textarea
                className={`${fieldClass} min-h-24 font-normal dark:bg-slate-950`}
                onChange={(event) =>
                  setNotes((current) => ({ ...current, [plan.id]: event.target.value }))
                }
                placeholder="Wajib diisi jika meminta revisi"
                value={notes[plan.id] ?? ''}
              />
            </FormField>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                className="border-amber-300 text-amber-700 hover:border-amber-400 hover:text-amber-800"
                disabled={processingId === plan.id}
                onClick={() => void review(plan, 'REVISION_REQUESTED')}
                variant="outline"
              >
                Minta Revisi
              </Button>
              <Button disabled={processingId === plan.id} onClick={() => void review(plan, 'APPROVED')}>
                Setujui
              </Button>
            </div>
          </SurfaceCard>
        ))}
      </div>
      {!loading && plans.length === 0 ? (
        <EmptyState title="Tidak ada perangkat ajar yang menunggu review." />
      ) : null}
    </section>
  );
}

function formatFileSize(size: number) {
  return size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
}
