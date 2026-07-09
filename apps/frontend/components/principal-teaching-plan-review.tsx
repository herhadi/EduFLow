'use client';

import { useEffect, useState } from 'react';
import { api, type TeachingPlan, type TeachingPlanRevisionPriority } from '../lib/api';
import { openTeachingPlanAttachment } from '../lib/open-document';
import { useToast } from './ui/toast';
import { NOTIFICATION_CHANGED_EVENT } from './mobile-app-shell';

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
      window.dispatchEvent(new Event(NOTIFICATION_CHANGED_EVENT));
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
        <span className="rounded-full bg-brand-50 px-3 py-2 text-xs font-black text-brand-700">{plans.length} pengajuan</span>
      </div>

      {loading ? <div className="surface-card rounded-3xl p-5 text-sm text-muted">Memuat antrean review...</div> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => (
          <article className="surface-card rounded-[1.75rem] p-5" key={plan.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-brand-700">{typeLabels[plan.type]}</p>
                <h3 className="mt-1 text-lg font-black">{plan.title}</h3>
                <p className="mt-1 text-sm font-bold">{plan.teacher?.name ?? 'Guru'}</p>
                <p className="mt-1 text-sm text-muted">{plan.subject.name} · {plan.schoolYear.name}{plan.semester ? ` · ${plan.semester.type === 'ODD' ? 'Ganjil' : 'Genap'}` : ''}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">Menunggu Review</span>
            </div>

            {plan.description ? <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-900 dark:text-slate-200">{plan.description}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {plan.attachmentKey || plan.attachmentUrl ? <button className="secondary-button rounded-xl px-3 py-2 text-xs font-black" onClick={() => void openAttachment(plan)} type="button">{plan.type === 'TEACHING_BOOK' ? 'Lihat Foto Buku' : 'Buka Dokumen'}{plan.attachmentName ? ` · ${plan.attachmentName}` : ''}</button> : <span className="text-xs font-bold text-amber-700">Lampiran belum tersedia</span>}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.55fr]">
              <label className="grid gap-2 text-sm font-bold">
                Bagian/Halaman
                <input
                  className="rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600 dark:bg-slate-950"
                  onChange={(event) =>
                    setSections((current) => ({ ...current, [plan.id]: event.target.value }))
                  }
                  placeholder="Contoh: Hal. 2 bagian asesmen"
                  value={sections[plan.id] ?? ''}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Prioritas
                <select
                  className="rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600 dark:bg-slate-950"
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
              </label>
            </div>
            <label className="mt-4 grid gap-2 text-sm font-bold">Catatan untuk Guru<textarea className="min-h-24 rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600 dark:bg-slate-950" onChange={(event) => setNotes((current) => ({ ...current, [plan.id]: event.target.value }))} placeholder="Wajib diisi jika meminta revisi" value={notes[plan.id] ?? ''} /></label>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="rounded-2xl border border-amber-300 px-4 py-3 text-sm font-black text-amber-700 disabled:opacity-50" disabled={processingId === plan.id} onClick={() => void review(plan, 'REVISION_REQUESTED')} type="button">Minta Revisi</button>
              <button className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50" disabled={processingId === plan.id} onClick={() => void review(plan, 'APPROVED')} type="button">Setujui</button>
            </div>
          </article>
        ))}
      </div>
      {!loading && plans.length === 0 ? <div className="surface-card rounded-3xl p-5 text-sm text-muted">Tidak ada perangkat ajar yang menunggu review.</div> : null}
    </section>
  );
}
