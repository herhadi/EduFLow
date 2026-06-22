'use client';

import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import { api, type SchoolYear, type Semester, type Subject, type TeachingPlan, type TeachingPlanType } from '../lib/api';
import { openTeachingPlanAttachment } from '../lib/open-document';
import { useToast } from './ui/toast';

const planTypes: Array<{ value: TeachingPlanType; label: string }> = [
  { value: 'ANNUAL_PROGRAM', label: 'Program Tahunan' },
  { value: 'SEMESTER_PROGRAM', label: 'Program Semester' },
  { value: 'KKTP', label: 'KKTP' },
  { value: 'LESSON_PLAN', label: 'Perencanaan Pembelajaran' },
  { value: 'TEACHING_BOOK', label: 'Buku KBM' },
];
const documentAccept = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const bookPhotoAccept = 'image/jpeg,image/png,image/webp';

export function TeacherTeachingPlans() {
  const toast = useToast();
  const [plans, setPlans] = useState<TeachingPlan[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ type: 'ANNUAL_PROGRAM' as TeachingPlanType, subjectId: '', schoolYearId: '', semesterId: '', title: '', description: '' });

  async function loadData() {
    setLoading(true);
    try {
      const [planResponse, subjectResponse, schoolYearResponse, semesterResponse] = await Promise.all([
        api.getMyTeachingPlans(), api.getMySubjects(), api.getSchoolYears(), api.getSemesters(),
      ]);
      setPlans(planResponse.data);
      setSubjects(subjectResponse.data);
      setSchoolYears(schoolYearResponse.data);
      setSemesters(semesterResponse.data);
      setForm((current) => ({ ...current, subjectId: current.subjectId || subjectResponse.data[0]?.id || '', schoolYearId: current.schoolYearId || schoolYearResponse.data[0]?.id || '' }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Data perangkat ajar gagal dimuat.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadData(); }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await api.createTeachingPlan({ ...form, semesterId: form.semesterId || undefined, description: form.description || undefined });
      const savedPlan = attachment ? (await api.uploadTeachingPlanAttachment(response.data.id, attachment)).data : response.data;
      setPlans((current) => [savedPlan, ...current]);
      setForm((current) => ({ ...current, title: '', description: '' }));
      setAttachment(null);
      toast.success(attachment ? 'Draft dan dokumen berhasil disimpan.' : response.message ?? 'Draft berhasil disimpan.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Draft gagal disimpan.'); }
    finally { setSaving(false); }
  }

  async function submitPlan(plan: TeachingPlan) {
    try {
      const response = await api.submitTeachingPlan(plan.id);
      setPlans((current) => current.map((item) => item.id === plan.id ? response.data : item));
      toast.success(response.message ?? 'Perangkat ajar berhasil disubmit.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Submit gagal.'); }
  }

  async function openAttachment(plan: TeachingPlan) {
    try {
      const response = await api.getTeachingPlanAttachmentUrl(plan.id);
      openTeachingPlanAttachment(response.data.url, plan.attachmentMimeType);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Dokumen gagal dibuka.');
    }
  }

  function selectBookPhoto(event: ChangeEvent<HTMLInputElement>) {
    setAttachment(event.target.files?.[0] ?? null);
  }

  const filteredSemesters = semesters.filter((semester) => semester.schoolYearId === form.schoolYearId);
  const isTeachingBook = form.type === 'TEACHING_BOOK';

  return (
    <section className="mt-7 grid gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
      <form className="surface-card rounded-[2rem] p-5" onSubmit={handleSubmit}>
        <h2 className="text-xl font-black">Buat Draft</h2>
        <p className="mt-1 text-sm text-muted">Unggah dokumen DOCX maksimal 10 MB. Buku KBM menggunakan foto buku dari kamera atau galeri.</p>
        <div className="mt-5 grid gap-3">
          <Select label="Jenis" value={form.type} onChange={(value) => { setForm({ ...form, type: value as TeachingPlanType }); setAttachment(null); }} options={planTypes} />
          <Select label="Mata Pelajaran" value={form.subjectId} onChange={(value) => setForm({ ...form, subjectId: value })} options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))} />
          <Select label="Tahun Ajaran" value={form.schoolYearId} onChange={(value) => setForm({ ...form, schoolYearId: value, semesterId: '' })} options={schoolYears.map((item) => ({ value: item.id, label: item.name }))} />
          <Select label="Semester (opsional)" value={form.semesterId} onChange={(value) => setForm({ ...form, semesterId: value })} options={[{ value: '', label: 'Tidak spesifik semester' }, ...filteredSemesters.map((item) => ({ value: item.id, label: item.type === 'ODD' ? 'Ganjil' : 'Genap' }))]} />
          <Field label="Judul" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
          {isTeachingBook ? (
            <div className="grid gap-2">
              <p className="text-sm font-bold">Foto Buku KBM</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white"
                  onClick={() => cameraInputRef.current?.click()}
                  type="button"
                >
                  Buka Kamera
                </button>
                <button
                  className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm font-black text-brand-700"
                  onClick={() => galleryInputRef.current?.click()}
                  type="button"
                >
                  Pilih Galeri
                </button>
              </div>
              <input
                accept={bookPhotoAccept}
                capture="environment"
                className="sr-only"
                onChange={selectBookPhoto}
                ref={cameraInputRef}
                type="file"
              />
              <input
                accept={bookPhotoAccept}
                className="sr-only"
                onChange={selectBookPhoto}
                ref={galleryInputRef}
                type="file"
              />
            </div>
          ) : (
            <label className="grid gap-2 text-sm font-bold">
              Dokumen DOCX (opsional)
              <input
                accept={documentAccept}
                className="rounded-2xl border bg-white px-4 py-3 text-sm font-normal outline-none file:mr-3 file:rounded-xl file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-black file:text-brand-700"
                onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
          )}
          {attachment ? <p className="text-xs font-semibold text-muted">{attachment.name} · {formatFileSize(attachment.size)}</p> : null}
          <label className="grid gap-2 text-sm font-bold">Keterangan<textarea className="min-h-24 rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        </div>
        <button className="mt-5 w-full rounded-2xl bg-brand-600 px-5 py-4 text-sm font-black text-white disabled:opacity-50" disabled={saving || !form.title || !form.subjectId || !form.schoolYearId || (isTeachingBook && !attachment)}>{saving ? 'Menyimpan...' : 'Simpan Draft'}</button>
      </form>

      <div className="space-y-3">
        <div><h2 className="text-xl font-black">Perangkat Ajar Saya</h2><p className="mt-1 text-sm text-muted">Pantau draft, pengajuan, revisi, dan persetujuan.</p></div>
        {loading ? <div className="surface-card rounded-3xl p-5 text-sm text-muted">Memuat perangkat ajar...</div> : null}
        {plans.map((plan) => (
          <article className="surface-card rounded-[1.75rem] p-5" key={plan.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-black text-brand-700">{planTypes.find((item) => item.value === plan.type)?.label}</p><h3 className="mt-1 text-lg font-black">{plan.title}</h3><p className="mt-1 text-sm text-muted">{plan.subject.name} · {plan.schoolYear.name}{plan.semester ? ` · ${plan.semester.type === 'ODD' ? 'Ganjil' : 'Genap'}` : ''}</p></div>
              <Status status={plan.status} />
            </div>
            {plan.reviewNote ? <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Catatan KS: {plan.reviewNote}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {plan.attachmentKey || plan.attachmentUrl ? <button className="secondary-button rounded-xl px-3 py-2 text-xs font-black" onClick={() => void openAttachment(plan)} type="button">{plan.type === 'TEACHING_BOOK' ? 'Lihat Foto Buku' : 'Buka Dokumen'}{plan.attachmentName ? ` · ${plan.attachmentName}` : ''}</button> : null}
              {plan.status === 'DRAFT' || plan.status === 'REVISION_REQUESTED' ? <button className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white" onClick={() => void submitPlan(plan)} type="button">Kirim ke KS</button> : null}
            </div>
          </article>
        ))}
        {!loading && !plans.length ? <div className="surface-card rounded-3xl p-5 text-sm text-muted">Belum ada perangkat ajar. Buat draft pertama dari form.</div> : null}
      </div>
    </section>
  );
}

function Select({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: Array<{ label: string; value: string }>; value: string }) { return <label className="grid gap-2 text-sm font-bold">{label}<select className="rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600" onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function Field({ label, onChange, placeholder, required, type = 'text', value }: { label: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; type?: string; value: string }) { return <label className="grid gap-2 text-sm font-bold">{label}<input className="rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} type={type} value={value} /></label>; }
function Status({ status }: { status: TeachingPlan['status'] }) {
  const labels = { DRAFT: 'Draft', SUBMITTED: 'Menunggu Review', REVISION_REQUESTED: 'Perlu Revisi', APPROVED: 'Disetujui', ARCHIVED: 'Diarsipkan' };
  const tones = {
    DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    SUBMITTED: 'bg-brand-50 text-brand-700 dark:bg-blue-950 dark:text-blue-300',
    REVISION_REQUESTED: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    ARCHIVED: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  };
  return <span className={`rounded-full px-3 py-2 text-xs font-black ${tones[status]}`}>{labels[status]}</span>;
}
function formatFileSize(size: number) { return size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`; }
