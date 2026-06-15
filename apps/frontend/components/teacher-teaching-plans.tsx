'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, type SchoolYear, type Semester, type Subject, type TeachingPlan, type TeachingPlanType } from '../lib/api';
import { useToast } from './ui/toast';

const planTypes: Array<{ value: TeachingPlanType; label: string }> = [
  { value: 'ANNUAL_PROGRAM', label: 'Program Tahunan' },
  { value: 'SEMESTER_PROGRAM', label: 'Program Semester' },
  { value: 'KKTP', label: 'KKTP' },
  { value: 'LESSON_PLAN', label: 'Perencanaan Pembelajaran' },
  { value: 'TEACHING_BOOK', label: 'Buku KBM' },
];

export function TeacherTeachingPlans() {
  const toast = useToast();
  const [plans, setPlans] = useState<TeachingPlan[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'ANNUAL_PROGRAM' as TeachingPlanType, subjectId: '', schoolYearId: '', semesterId: '', title: '', description: '', attachmentUrl: '' });

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
      const response = await api.createTeachingPlan({ ...form, semesterId: form.semesterId || undefined, description: form.description || undefined, attachmentUrl: form.attachmentUrl || undefined });
      setPlans((current) => [response.data, ...current]);
      setForm((current) => ({ ...current, title: '', description: '', attachmentUrl: '' }));
      toast.success(response.message ?? 'Draft berhasil disimpan.');
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

  const filteredSemesters = semesters.filter((semester) => semester.schoolYearId === form.schoolYearId);

  return (
    <section className="mt-7 grid gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
      <form className="surface-card rounded-[2rem] p-5" onSubmit={handleSubmit}>
        <h2 className="text-xl font-black">Buat Draft</h2>
        <p className="mt-1 text-sm text-muted">Simpan metadata dan tautan dokumen sebelum dikirim ke Kepala Sekolah.</p>
        <div className="mt-5 grid gap-3">
          <Select label="Jenis" value={form.type} onChange={(value) => setForm({ ...form, type: value as TeachingPlanType })} options={planTypes} />
          <Select label="Mata Pelajaran" value={form.subjectId} onChange={(value) => setForm({ ...form, subjectId: value })} options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))} />
          <Select label="Tahun Ajaran" value={form.schoolYearId} onChange={(value) => setForm({ ...form, schoolYearId: value, semesterId: '' })} options={schoolYears.map((item) => ({ value: item.id, label: item.name }))} />
          <Select label="Semester (opsional)" value={form.semesterId} onChange={(value) => setForm({ ...form, semesterId: value })} options={[{ value: '', label: 'Tidak spesifik semester' }, ...filteredSemesters.map((item) => ({ value: item.id, label: item.type === 'ODD' ? 'Ganjil' : 'Genap' }))]} />
          <Field label="Judul" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
          <Field label="Tautan Dokumen" value={form.attachmentUrl} onChange={(value) => setForm({ ...form, attachmentUrl: value })} placeholder="https://drive.google.com/..." type="url" />
          <label className="grid gap-2 text-sm font-bold">Keterangan<textarea className="min-h-24 rounded-2xl border bg-white px-4 py-3 font-normal outline-none focus:border-brand-600" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        </div>
        <button className="mt-5 w-full rounded-2xl bg-brand-600 px-5 py-4 text-sm font-black text-white disabled:opacity-50" disabled={saving || !form.title || !form.subjectId || !form.schoolYearId}>{saving ? 'Menyimpan...' : 'Simpan Draft'}</button>
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
              {plan.attachmentUrl ? <a className="secondary-button rounded-xl px-3 py-2 text-xs font-black" href={plan.attachmentUrl} rel="noreferrer" target="_blank">Buka Dokumen</a> : null}
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
function Status({ status }: { status: TeachingPlan['status'] }) { const labels = { DRAFT: 'Draft', SUBMITTED: 'Menunggu Review', REVISION_REQUESTED: 'Perlu Revisi', APPROVED: 'Disetujui', ARCHIVED: 'Diarsipkan' }; return <span className="rounded-full bg-brand-50 px-3 py-2 text-xs font-black text-brand-700">{labels[status]}</span>; }
