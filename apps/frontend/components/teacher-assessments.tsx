'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type Assessment,
  type AssessmentExcelPreview,
  type SchoolClass,
  type SchoolYear,
  type Semester,
  type Subject,
} from '../lib/api';
import { getPreferredSchoolYear, getPreferredSemester } from '../lib/school-year';
import { AssessmentFormCard } from './teacher-assessments/assessment-form-card';
import { AssessmentListCard } from './teacher-assessments/assessment-list-card';
import {
  getEmptyAssessmentForm,
  toScoreDraft,
  type ScoreDraft,
} from './teacher-assessments/teacher-assessment-utils';
import { Button } from './ui/button';
import { SurfaceCard } from './ui/card';
import { LoadingState } from './ui/loading';
import { useToast } from './ui/toast';

export function TeacherAssessments() {
  const toast = useToast();
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [scoreDraft, setScoreDraft] = useState<ScoreDraft>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'monthly' | 'semester' | null>(null);
  const [previewing, setPreviewing] = useState<'monthly' | 'semester' | null>(null);
  const [exportPreview, setExportPreview] = useState<AssessmentExcelPreview | null>(null);
  const [previewPayload, setPreviewPayload] = useState<ReturnType<typeof getExportPayload> | null>(null);
  const [form, setForm] = useState(getEmptyAssessmentForm);

  const selectedSchoolYearClasses = useMemo(
    () => classes.filter((schoolClass) => schoolClass.schoolYearId === form.schoolYearId),
    [classes, form.schoolYearId],
  );
  const selectedSchoolYearSemesters = useMemo(
    () => semesters.filter((semester) => semester.schoolYearId === form.schoolYearId),
    [semesters, form.schoolYearId],
  );
  const selectedSchoolYear = useMemo(
    () => schoolYears.find((schoolYear) => schoolYear.id === form.schoolYearId),
    [schoolYears, form.schoolYearId],
  );
  const selectedSemester = useMemo(
    () => semesters.find((semester) => semester.id === form.semesterId),
    [semesters, form.semesterId],
  );
  const selectedClass = useMemo(
    () => classes.find((schoolClass) => schoolClass.id === form.classId),
    [classes, form.classId],
  );
  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === form.subjectId),
    [subjects, form.subjectId],
  );

  async function loadInitial() {
    setLoading(true);

    try {
      const [schoolYearResponse, semesterResponse, classResponse, subjectResponse, assessmentResponse] =
        await Promise.all([
          api.getSchoolYears(),
          api.getSemesters(),
          api.getClasses(),
          api.getMySubjects(),
          api.getMyAssessments(),
        ]);
      const nextSchoolYears = schoolYearResponse.data;
      const defaultSchoolYear = getPreferredSchoolYear(nextSchoolYears);
      const defaultSemester = defaultSchoolYear
        ? getPreferredSemester(semesterResponse.data, defaultSchoolYear.id)
        : undefined;

      setSchoolYears(nextSchoolYears);
      setSemesters(semesterResponse.data);
      setClasses(classResponse.data);
      setSubjects(subjectResponse.data);
      setAssessments(assessmentResponse.data);
      setForm((current) => ({
        ...current,
        schoolYearId: current.schoolYearId || defaultSchoolYear?.id || '',
        semesterId: current.semesterId || defaultSemester?.id || '',
        classId: current.classId || classResponse.data.find((item) => item.schoolYearId === defaultSchoolYear?.id)?.id || '',
        subjectId: current.subjectId || subjectResponse.data[0]?.id || '',
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Data penilaian gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }

  async function refreshAssessments() {
    const response = await api.getMyAssessments();
    setAssessments(response.data);
  }

  async function createAssessment() {
    if (!form.schoolYearId || !form.semesterId || !form.classId || !form.subjectId || !form.title.trim()) {
      toast.warning('Lengkapi tahun ajaran, semester, kelas, mapel, dan judul.', 'Data Belum Lengkap');
      return;
    }

    setSaving(true);
    try {
      const response = await api.createAssessment({
        ...form,
        title: form.title.trim(),
        notes: form.notes.trim() || undefined,
      });
      toast.success(response.message ?? 'Komponen nilai dibuat.');
      setSelectedAssessment(response.data);
      setScoreDraft(toScoreDraft(response.data.scores ?? []));
      setForm((current) => ({ ...current, title: '', notes: '' }));
      await refreshAssessments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Komponen nilai gagal dibuat.');
    } finally {
      setSaving(false);
    }
  }

  async function openAssessment(id: string) {
    if (selectedAssessment?.id === id) {
      setSelectedAssessment(null);
      setScoreDraft({});
      return;
    }

    try {
      const response = await api.getAssessment(id);
      setSelectedAssessment(response.data);
      setScoreDraft(toScoreDraft(response.data.scores ?? []));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Detail nilai gagal dimuat.');
    }
  }

  async function saveScores() {
    if (!selectedAssessment) {
      return;
    }

    setSaving(true);
    try {
      const assessment = await persistScores();
      toast.success('Draft nilai disimpan.');
      setSelectedAssessment(assessment);
      setScoreDraft(toScoreDraft(assessment.scores ?? []));
      await refreshAssessments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Draft nilai gagal disimpan.');
    } finally {
      setSaving(false);
    }
  }

  async function submitScores() {
    if (!selectedAssessment) {
      return;
    }

    setSaving(true);
    try {
      await persistScores();
      const response = await api.submitAssessment(selectedAssessment.id);
      toast.success(response.message ?? 'Nilai disubmit.');
      setSelectedAssessment(response.data);
      setScoreDraft(toScoreDraft(response.data.scores ?? []));
      await refreshAssessments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Submit nilai gagal.');
    } finally {
      setSaving(false);
    }
  }

  async function persistScores() {
    if (!selectedAssessment) {
      throw new Error('Pilih komponen nilai terlebih dahulu.');
    }

    const response = await api.saveAssessmentScores(selectedAssessment.id, {
      scores: Object.entries(scoreDraft).map(([scoreId, value]) => ({
        scoreId,
        score: value.score.trim() === '' ? null : Number(value.score),
        notes: value.notes.trim() || null,
      })),
    });

    return response.data;
  }

  function getSelectedExportPayload(period: 'monthly' | 'semester') {
    if (!form.schoolYearId || !form.semesterId || !form.classId || !form.subjectId) {
      return null;
    }

    return getExportPayload({
      classId: form.classId,
      period,
      schoolYearId: form.schoolYearId,
      semesterId: form.semesterId,
      subjectId: form.subjectId,
      valueDate: form.assessmentDate,
    });
  }

  async function previewExcel(period: 'monthly' | 'semester') {
    const payload = getSelectedExportPayload(period);

    if (!payload) {
      toast.warning('Pilih tahun ajaran, semester, kelas, dan mapel sebelum preview.', 'Filter Belum Lengkap');
      return;
    }

    setPreviewing(period);

    try {
      const response = await api.getAssessmentExcelPreview(payload);
      setExportPreview(response.data);
      setPreviewPayload(payload);
      toast.success('Preview rekap nilai siap.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Preview nilai gagal.');
    } finally {
      setPreviewing(null);
    }
  }

  async function exportExcel() {
    if (!previewPayload) {
      toast.warning('Preview rekap terlebih dahulu sebelum download Excel.', 'Preview Belum Ada');
      return;
    }

    setExporting(previewPayload.period);

    try {
      await api.downloadAssessmentExcel(previewPayload);
      toast.success('File Excel nilai harian sedang didownload.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export nilai gagal.');
    } finally {
      setExporting(null);
    }
  }

  useEffect(() => {
    void loadInitial();
  }, []);

  useEffect(() => {
    const nextSemester = getPreferredSemester(selectedSchoolYearSemesters, form.schoolYearId);
    const nextClass = selectedSchoolYearClasses[0];

    setForm((current) => ({
      ...current,
      semesterId: selectedSchoolYearSemesters.some((semester) => semester.id === current.semesterId)
        ? current.semesterId
        : nextSemester?.id ?? '',
      classId: selectedSchoolYearClasses.some((schoolClass) => schoolClass.id === current.classId)
        ? current.classId
        : nextClass?.id ?? '',
    }));
  }, [form.schoolYearId, selectedSchoolYearClasses, selectedSchoolYearSemesters]);

  if (loading) {
    return (
      <LoadingState className="mt-6" label="Memuat penilaian..." />
    );
  }

  return (
    <section className="mt-6 space-y-5">
      <AssessmentFormCard
        classes={selectedSchoolYearClasses}
        form={form}
        onCreate={() => void createAssessment()}
        saving={saving}
        schoolYears={schoolYears}
        semesters={selectedSchoolYearSemesters}
        setForm={setForm}
        subjects={subjects}
      />

      <SurfaceCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">Export Excel</p>
            <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">Rekap Nilai Harian</h2>
            <p className="mt-1 text-sm text-muted">
              {selectedClass?.name ?? 'Kelas belum dipilih'} · {selectedSubject?.name ?? 'Mapel belum dipilih'} · {selectedSemester ? (selectedSemester.type === 'ODD' ? 'Ganjil' : 'Genap') : 'Semester belum dipilih'} · {selectedSchoolYear?.name ?? 'Tahun ajaran belum dipilih'}
            </p>
            <p className="mt-2 text-xs font-semibold text-muted">
              File berisi sheet Rekap, Komponen, dan Catatan. Export bulanan memakai bulan dari tanggal komponen nilai.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-80">
            <Button
              disabled={Boolean(previewing || exporting)}
              onClick={() => void previewExcel('monthly')}
              variant="outline"
            >
              {previewing === 'monthly' ? 'Memuat...' : 'Preview Bulanan'}
            </Button>
            <Button
              disabled={Boolean(previewing || exporting)}
              onClick={() => void previewExcel('semester')}
            >
              {previewing === 'semester' ? 'Memuat...' : 'Preview Semester'}
            </Button>
          </div>
        </div>
        {exportPreview ? (
          <AssessmentExcelPreviewPanel
            onDownload={() => void exportExcel()}
            preview={exportPreview}
            saving={Boolean(exporting)}
          />
        ) : null}
      </SurfaceCard>

      <AssessmentListCard
        assessments={assessments}
        draft={scoreDraft}
        onDraftChange={setScoreDraft}
        onOpen={(id) => void openAssessment(id)}
        onSave={() => void saveScores()}
        onSubmit={() => void submitScores()}
        saving={saving}
        selectedAssessment={selectedAssessment}
      />
    </section>
  );
}

function AssessmentExcelPreviewPanel({
  onDownload,
  preview,
  saving,
}: {
  onDownload: () => void;
  preview: AssessmentExcelPreview;
  saving: boolean;
}) {
  const columns = Object.keys(preview.recap[0] ?? {});

  return (
    <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-900 dark:text-slate-100">Preview Rekap</p>
          <p className="mt-1 text-xs font-semibold text-muted">
            {Object.entries(preview.meta).map(([key, value]) => `${key}: ${value}`).join(' · ')}
          </p>
        </div>
        <Button disabled={saving} onClick={onDownload} size="sm">
          {saving ? 'Mengunduh...' : 'Download Excel'}
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-100 text-left text-xs dark:divide-slate-800">
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <tr>
              {columns.map((column) => (
                <th className="whitespace-nowrap px-3 py-2 font-black" key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
            {preview.recap.slice(0, 10).map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-700 dark:text-slate-200" key={column}>
                    {row[column] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs font-semibold text-muted">
        Menampilkan {Math.min(preview.recap.length, 10)} dari {preview.recap.length} siswa. Sheet Komponen: {preview.components.length} baris, Catatan: {preview.notes.length} baris.
      </p>
    </div>
  );
}

function getExportPayload({
  classId,
  period,
  schoolYearId,
  semesterId,
  subjectId,
  valueDate,
}: {
  classId: string;
  period: 'monthly' | 'semester';
  schoolYearId: string;
  semesterId: string;
  subjectId: string;
  valueDate: string;
}) {
  const monthRange = period === 'monthly' ? getMonthRange(valueDate) : undefined;

  return {
    classId,
    from: monthRange?.from,
    period,
    schoolYearId,
    semesterId,
    subjectId,
    to: monthRange?.to,
  };
}

function getMonthRange(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const fallback = new Date();
    return getMonthRange(formatDateInput(fallback));
  }

  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    from: formatDateInput(from),
    to: formatDateInput(to),
  };
}

function formatDateInput(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
