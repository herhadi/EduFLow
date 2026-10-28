'use client';

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api, type SchoolYear, type Semester, type Subject, type TeachingPlan, type TeachingPlanType } from '../lib/api';
import { openTeachingPlanAttachment } from '../lib/open-document';
import { getPreferredSchoolYear, getPreferredSemester } from '../lib/school-year';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { CameraCaptureButton } from './ui/camera-capture-button';
import { EmptyState } from './ui/empty-state';
import { fieldClass, FormField } from './ui/form';
import { LoadingState } from './ui/loading';
import { SurfaceCard, SurfaceFormCard } from './ui/card';
import { TeachingPlanStatus } from './teacher-teaching-plans/teaching-plan-status';
import {
  bookPhotoAccept,
  documentAccept,
  formatFileSize,
  getAttachmentAccept,
  getPlanTypeLabel,
  getRevisionPriorityLabel,
  hasPlanAttachment,
  planTypes,
} from './teacher-teaching-plans/teacher-teaching-plan-utils';
import { useToast } from './ui/toast';

export function TeacherTeachingPlans() {
  const toast = useToast();
  const [plans, setPlans] = useState<TeachingPlan[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPlanId, setUploadingPlanId] = useState<string | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<Record<string, File | null>>({});
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
      const defaultSchoolYear = getPreferredSchoolYear(schoolYearResponse.data);
      const defaultSemester = defaultSchoolYear
        ? getPreferredSemester(semesterResponse.data, defaultSchoolYear.id)
        : undefined;

      setForm((current) => ({
        ...current,
        semesterId: current.semesterId || defaultSemester?.id || '',
        subjectId: current.subjectId || subjectResponse.data[0]?.id || '',
        schoolYearId: current.schoolYearId || defaultSchoolYear?.id || '',
      }));
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
    setUploadingPlanId(plan.id);
    try {
      const selectedFile = selectedAttachments[plan.id];
      if (selectedFile) {
        await api.uploadTeachingPlanAttachment(plan.id, selectedFile);
      }
      const response = await api.submitTeachingPlan(plan.id);
      setPlans((current) => current.map((item) => item.id === plan.id ? response.data : item));
      setSelectedAttachments((current) => ({ ...current, [plan.id]: null }));
      toast.success(response.message ?? 'Perangkat ajar berhasil dikirim ke Kepala Sekolah.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Pengajuan gagal dikirim.'); }
    finally { setUploadingPlanId(null); }
  }

  function previewSelectedAttachment(file: File) {
    const previewUrl = URL.createObjectURL(file);
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);
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

  const filteredSemesters = useMemo(
    () => semesters.filter((semester) => semester.schoolYearId === form.schoolYearId),
    [form.schoolYearId, semesters],
  );
  const subjectOptions = useMemo(
    () => subjects.map((subject) => ({ value: subject.id, label: subject.name })),
    [subjects],
  );
  const schoolYearOptions = useMemo(
    () => schoolYears.map((item) => ({ value: item.id, label: item.name })),
    [schoolYears],
  );
  const semesterOptions = useMemo(
    () => [
      { value: '', label: 'Tidak spesifik semester' },
      ...filteredSemesters.map((item) => ({ value: item.id, label: item.type === 'ODD' ? 'Ganjil' : 'Genap' })),
    ],
    [filteredSemesters],
  );
  const isTeachingBook = form.type === 'TEACHING_BOOK';

  useEffect(() => {
    setForm((current) => {
      if (!current.schoolYearId) return current;
      if (filteredSemesters.some((semester) => semester.id === current.semesterId)) return current;

      return {
        ...current,
        semesterId: getPreferredSemester(filteredSemesters, current.schoolYearId)?.id ?? '',
      };
    });
  }, [filteredSemesters]);

  return (
    <section className="mt-7 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">Perangkat Ajar Saya</h2>
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
            <Select label="Mata Pelajaran" value={form.subjectId} onChange={(value) => setForm({ ...form, subjectId: value })} options={subjectOptions} />
            <Select label="Tahun Ajaran" value={form.schoolYearId} onChange={(value) => setForm({ ...form, schoolYearId: value, semesterId: '' })} options={schoolYearOptions} />
            <Select label="Semester (opsional)" value={form.semesterId} onChange={(value) => setForm({ ...form, semesterId: value })} options={semesterOptions} />
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
                  className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none file:mr-3 file:rounded-xl file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-black file:text-brand-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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

      <div className="space-y-6">
        {loading ? <LoadingState label="Memuat perangkat ajar..." /> : null}
        {!loading ? (
          <>
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Perangkat Ajar Disetujui</h2>
                <p className="mt-1 text-sm text-muted">Dokumen yang sudah disetujui Kepala Sekolah dapat dibuka kembali di sini.</p>
              </div>
              {plans.filter((plan) => plan.status === 'APPROVED').map((plan) => (
                <SurfaceCard className="rounded-[1.5rem]" key={plan.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-brand-700">{getPlanTypeLabel(plan.type)}</p>
                      <h3 className="mt-1 break-words text-lg font-black text-slate-900 dark:text-slate-100">{plan.title}</h3>
                      <p className="mt-1 text-sm text-muted">{plan.subject.name} · {plan.schoolYear.name}{plan.semester ? ` · ${plan.semester.type === 'ODD' ? 'Ganjil' : 'Genap'}` : ''}</p>
                    </div>
                    <TeachingPlanStatus status={plan.status} />
                  </div>
                  <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-400/20 dark:bg-blue-500/10 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.1em] text-brand-700">Dokumen Terlampir</p>
                      <p className="mt-1 break-words text-sm font-bold text-slate-900 dark:text-slate-100">{plan.attachmentName ?? (plan.type === 'TEACHING_BOOK' ? 'Foto Buku KBM' : 'Dokumen perangkat ajar')}</p>
                      {plan.attachmentSize ? <p className="mt-0.5 text-xs font-semibold text-muted">{formatFileSize(plan.attachmentSize)}</p> : null}
                    </div>
                    <Button className="w-full sm:w-auto" disabled={!hasPlanAttachment(plan)} onClick={() => void openAttachment(plan)} variant="outline">
                      {plan.type === 'TEACHING_BOOK' ? 'Buka Foto' : 'Buka Dokumen'}
                    </Button>
                  </div>
                  {!hasPlanAttachment(plan) ? <p className="mt-2 text-xs text-muted">Belum ada lampiran pada perangkat ajar ini.</p> : null}
                </SurfaceCard>
              ))}
              {!plans.some((plan) => plan.status === 'APPROVED') ? (
                <EmptyState className="py-4" title="Belum ada perangkat ajar yang disetujui." />
              ) : null}
            </section>
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Riwayat Pengajuan</h2>
                <p className="mt-1 text-sm text-muted">Periksa catatan revisi, lampiran, dan kirim kembali dokumen yang perlu diperbaiki.</p>
              </div>
              {plans.filter((plan) => plan.status !== 'APPROVED').map((plan) => (
                <SurfaceCard className="rounded-[1.75rem]" key={plan.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-brand-700">{getPlanTypeLabel(plan.type)}</p>
                      <h3 className="mt-1 break-words text-lg font-black text-slate-900 dark:text-slate-100">{plan.title}</h3>
                      <p className="mt-1 text-sm text-muted">{plan.subject.name} · {plan.schoolYear.name}{plan.semester ? ` · ${plan.semester.type === 'ODD' ? 'Ganjil' : 'Genap'}` : ''}</p>
                    </div>
                    <TeachingPlanStatus status={plan.status} />
                  </div>
                  {plan.reviewNote ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-400/25 dark:bg-amber-500/10">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-white text-amber-800 dark:bg-slate-950 dark:text-amber-100" tone="warning">Prioritas: {getRevisionPriorityLabel(plan.reviewPriority)}</Badge>
                        {plan.reviewSection ? <Badge tone="warning">{plan.reviewSection}</Badge> : null}
                      </div>
                      <p className="mt-2 font-semibold text-amber-950 dark:text-amber-100">Catatan KS</p>
                      <p className="mt-1 text-amber-900 dark:text-amber-100">{plan.reviewNote}</p>
                    </div>
                  ) : null}
                  <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">Dokumen Terlampir</p>
                    {hasPlanAttachment(plan) ? (
                      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-bold text-slate-900 dark:text-slate-100">{plan.attachmentName ?? (plan.type === 'TEACHING_BOOK' ? 'Foto Buku KBM' : 'Dokumen perangkat ajar')}</p>
                          {plan.attachmentSize ? <p className="mt-1 text-xs text-muted">{formatFileSize(plan.attachmentSize)}</p> : null}
                        </div>
                        <Button className="w-full sm:w-auto" onClick={() => void openAttachment(plan)} size="sm" variant="outline">
                          {plan.type === 'TEACHING_BOOK' ? 'Buka Foto' : 'Buka Dokumen'}
                        </Button>
                      </div>
                    ) : <p className="mt-2 text-sm text-muted">Belum ada dokumen yang diunggah.</p>}
                    {(plan.status === 'DRAFT' || plan.status === 'REVISION_REQUESTED') ? (
                      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                          {selectedAttachments[plan.id] ? 'Berkas baru dipilih' : 'Pilih dokumen untuk diunggah atau mengganti lampiran'}
                        </label>
                        <input
                          accept={getAttachmentAccept(plan.type)}
                          className="block w-full min-w-0 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-bold file:text-slate-800 hover:file:bg-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:file:bg-slate-800 dark:file:text-slate-100"
                          disabled={uploadingPlanId === plan.id}
                          onChange={(event) => setSelectedAttachments((current) => ({ ...current, [plan.id]: event.target.files?.[0] ?? null }))}
                          type="file"
                        />
                        {selectedAttachments[plan.id] ? (
                          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                            <p className="break-words text-sm font-bold text-slate-900 dark:text-slate-100">{selectedAttachments[plan.id]!.name}</p>
                            <p className="mt-1 text-xs text-muted">{formatFileSize(selectedAttachments[plan.id]!.size)} · Belum diunggah</p>
                            <Button className="mt-3 w-full sm:w-auto" onClick={() => previewSelectedAttachment(selectedAttachments[plan.id]!)} size="sm" variant="outline">Pratinjau berkas terpilih</Button>
                          </div>
                        ) : null}
                        <p className="text-xs text-muted">Pilih berkas, periksa pratinjau, lalu tekan tombol kirim. Lampiran baru akan diunggah saat pengajuan dikirim.</p>
                        <Button
                          className="w-full sm:w-auto"
                          disabled={uploadingPlanId === plan.id || (!selectedAttachments[plan.id] && !hasPlanAttachment(plan))}
                          onClick={() => void submitPlan(plan)}
                          size="md"
                        >
                          {uploadingPlanId === plan.id ? 'Mengunggah & mengirim...' : 'Kirim ke KS'}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </SurfaceCard>
              ))}
              {!plans.some((plan) => plan.status !== 'APPROVED') ? (
                <EmptyState className="py-4" title="Tidak ada riwayat pengajuan." />
              ) : null}
            </section>
          </>
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
