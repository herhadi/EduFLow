'use client';

import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import { api, type SchoolYear, type Semester, type Subject, type TeachingPlan, type TeachingPlanType } from '../lib/api';
import { openTeachingPlanAttachment } from '../lib/open-document';
import { getPreferredSchoolYear } from '../lib/school-year';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { CameraCaptureButton } from './ui/camera-capture-button';
import { EmptyState } from './ui/empty-state';
import { fieldClass, FormField } from './ui/form';
import { LoadingState } from './ui/loading';
import { SurfaceCard, SurfaceFormCard } from './ui/card';
import { useToast } from './ui/toast';

const planTypes: Array<{ value: TeachingPlanType; label: string }> = [
  { value: 'ANNUAL_PROGRAM', label: 'Program Tahunan' },
  { value: 'SEMESTER_PROGRAM', label: 'Program Semester' },
  { value: 'KKTP', label: 'KKTP' },
  { value: 'LESSON_PLAN', label: 'Perencanaan Pembelajaran' },
  { value: 'TEACHING_BOOK', label: 'Buku KBM' },
];
const documentAccept = '.docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf';
const bookPhotoAccept = 'image/jpeg,image/png,image/webp';

export function TeacherTeachingPlans() {
  const toast = useToast();
  const [plans, setPlans] = useState<TeachingPlan[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPlanId, setUploadingPlanId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
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
      setForm((current) => ({ ...current, subjectId: current.subjectId || subjectResponse.data[0]?.id || '', schoolYearId: current.schoolYearId || getPreferredSchoolYear(schoolYearResponse.data)?.id || '' }));
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
      setShowCreateForm(false);
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

  async function uploadExistingAttachment(plan: TeachingPlan, file?: File | null) {
    if (!file) return;

    setUploadingPlanId(plan.id);
    try {
      const response = await api.uploadTeachingPlanAttachment(plan.id, file);
      setPlans((current) => current.map((item) => item.id === plan.id ? response.data : item));
      toast.success(response.message ?? 'Lampiran berhasil diunggah.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lampiran gagal diunggah.');
    } finally {
      setUploadingPlanId(null);
    }
  }

  function selectBookPhoto(event: ChangeEvent<HTMLInputElement>) {
    setAttachment(event.target.files?.[0] ?? null);
  }

  const filteredSemesters = semesters.filter((semester) => semester.schoolYearId === form.schoolYearId);
  const isTeachingBook = form.type === 'TEACHING_BOOK';

  return (
    <section className="mt-7 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900">Perangkat Ajar Saya</h2>
          <p className="mt-1 text-sm text-muted">Pantau draft, pengajuan, revisi, dan persetujuan sebelum membuat dokumen baru.</p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => setShowCreateForm((current) => !current)}
        >
          {showCreateForm ? 'Tutup Form' : 'Buat Draft'}
        </Button>
      </div>

      {showCreateForm ? (
        <SurfaceFormCard onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-black">Buat Draft Baru</h2>
              <p className="mt-1 text-sm text-muted">Unggah dokumen DOCX/PDF maksimal 10 MB. Buku KBM menggunakan foto buku dari kamera atau galeri.</p>
            </div>
            <Button
              onClick={() => setShowCreateForm(false)}
              size="sm"
              variant="outline"
            >
              Tutup
            </Button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Select label="Jenis" value={form.type} onChange={(value) => { setForm({ ...form, type: value as TeachingPlanType }); setAttachment(null); }} options={planTypes} />
            <Select label="Mata Pelajaran" value={form.subjectId} onChange={(value) => setForm({ ...form, subjectId: value })} options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))} />
            <Select label="Tahun Ajaran" value={form.schoolYearId} onChange={(value) => setForm({ ...form, schoolYearId: value, semesterId: '' })} options={schoolYears.map((item) => ({ value: item.id, label: item.name }))} />
            <Select label="Semester (opsional)" value={form.semesterId} onChange={(value) => setForm({ ...form, semesterId: value })} options={[{ value: '', label: 'Tidak spesifik semester' }, ...filteredSemesters.map((item) => ({ value: item.id, label: item.type === 'ODD' ? 'Ganjil' : 'Genap' }))]} />
            <Field label="Judul" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
            {isTeachingBook ? (
              <div className="grid gap-2">
                <p className="text-sm font-bold">Foto Buku KBM</p>
                <div className="grid grid-cols-2 gap-2">
                  <CameraCaptureButton onClick={() => cameraInputRef.current?.click()}>
                    Buka Kamera
                  </CameraCaptureButton>
                  <Button
                    onClick={() => galleryInputRef.current?.click()}
                    variant="outline"
                  >
                    Pilih Galeri
                  </Button>
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
              <FormField label="Dokumen DOCX/PDF (opsional)">
                <input
                  accept={documentAccept}
                  className="min-w-0 rounded-2xl border bg-white px-4 py-3 text-sm font-normal outline-none file:mr-3 file:rounded-xl file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-black file:text-brand-700"
                  onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </FormField>
            )}
          </div>
          {attachment ? <p className="mt-3 text-xs font-semibold text-muted">{attachment.name} · {formatFileSize(attachment.size)}</p> : null}
          <FormField className="mt-3" label="Keterangan">
            <textarea
              className={`${fieldClass} min-h-20 font-normal`}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </FormField>
          <Button
            className="mt-5 w-full sm:w-auto"
            disabled={saving || !form.title || !form.subjectId || !form.schoolYearId || (isTeachingBook && !attachment)}
            type="submit"
          >
            {saving ? 'Menyimpan...' : 'Simpan Draft'}
          </Button>
        </SurfaceFormCard>
      ) : null}

      <div className="space-y-3">
        {loading ? <LoadingState label="Memuat perangkat ajar..." /> : null}
        {plans.map((plan) => (
          <SurfaceCard className="rounded-[1.75rem]" key={plan.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-black text-brand-700">{planTypes.find((item) => item.value === plan.type)?.label}</p><h3 className="mt-1 text-lg font-black">{plan.title}</h3><p className="mt-1 text-sm text-muted">{plan.subject.name} · {plan.schoolYear.name}{plan.semester ? ` · ${plan.semester.type === 'ODD' ? 'Ganjil' : 'Genap'}` : ''}</p></div>
              <Status status={plan.status} />
            </div>
            {plan.attachmentKey || plan.attachmentUrl ? (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-brand-700">
                    Dokumen Terlampir
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-900">
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
              <EmptyState className="mt-4 py-2 text-xs" title="Belum ada dokumen terlampir." />
            )}
            {plan.reviewNote ? (
              <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white text-amber-800" tone="warning">
                    Prioritas: {getRevisionPriorityLabel(plan.reviewPriority)}
                  </Badge>
                  {plan.reviewSection ? (
                    <Badge className="bg-white text-amber-800" tone="warning">
                      {plan.reviewSection}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-3">Catatan KS: {plan.reviewNote}</p>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {plan.status === 'DRAFT' || plan.status === 'REVISION_REQUESTED' ? (
                <label className="cursor-pointer rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-brand-700 transition hover:border-brand-600">
                  {uploadingPlanId === plan.id ? 'Mengunggah...' : plan.attachmentKey || plan.attachmentUrl ? 'Ganti Lampiran' : 'Upload Lampiran'}
                  <input
                    accept={getAttachmentAccept(plan.type)}
                    className="sr-only"
                    disabled={uploadingPlanId === plan.id}
                    onChange={(event) => {
                      void uploadExistingAttachment(plan, event.target.files?.[0]);
                      event.currentTarget.value = '';
                    }}
                    type="file"
                  />
                </label>
              ) : null}
              {plan.status === 'DRAFT' || plan.status === 'REVISION_REQUESTED' ? (
                <Button
                  disabled={!hasPlanAttachment(plan)}
                  onClick={() => void submitPlan(plan)}
                  size="sm"
                >
                  Kirim ke KS
                </Button>
              ) : null}
            </div>
            {(plan.status === 'DRAFT' || plan.status === 'REVISION_REQUESTED') && !hasPlanAttachment(plan) ? (
              <p className="mt-2 text-xs font-bold text-amber-700">
                Upload lampiran terlebih dahulu sebelum dikirim ke Kepala Sekolah.
              </p>
            ) : null}
          </SurfaceCard>
        ))}
        {!loading && !plans.length ? (
          <EmptyState
            description="Klik Buat Draft untuk membuat dokumen pertama."
            title="Belum ada perangkat ajar."
          />
        ) : null}
      </div>
    </section>
  );
}

function Select({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <FormField label={label}>
      <select
        className={`${fieldClass} font-normal`}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

function Field({
  label,
  onChange,
  placeholder,
  required,
  type = 'text',
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <FormField label={label}>
      <input
        className={`${fieldClass} font-normal`}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </FormField>
  );
}

function Status({ status }: { status: TeachingPlan['status'] }) {
  const labels = { DRAFT: 'Draft', SUBMITTED: 'Menunggu Review', REVISION_REQUESTED: 'Perlu Revisi', APPROVED: 'Disetujui', ARCHIVED: 'Diarsipkan' };
  const tones: Record<TeachingPlan['status'], 'brand' | 'default' | 'muted' | 'success' | 'warning'> = {
    DRAFT: 'default',
    SUBMITTED: 'brand',
    REVISION_REQUESTED: 'warning',
    APPROVED: 'success',
    ARCHIVED: 'muted',
  };
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}
function getRevisionPriorityLabel(priority: TeachingPlan['reviewPriority']) {
  if (priority === 'HIGH') return 'Tinggi';
  if (priority === 'LOW') return 'Rendah';
  return 'Sedang';
}
function formatFileSize(size: number) { return size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`; }
function getAttachmentAccept(type: TeachingPlanType) {
  return type === 'TEACHING_BOOK' ? bookPhotoAccept : documentAccept;
}
function hasPlanAttachment(plan: TeachingPlan) {
  return Boolean(plan.attachmentKey || plan.attachmentUrl);
}
