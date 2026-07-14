'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  api,
  type Assessment,
  type AssessmentScore,
  type AssessmentStatus,
  type AssessmentType,
  type SchoolClass,
  type SchoolYear,
  type Semester,
  type Subject,
} from '../lib/api';
import { formatReadableDate } from '../lib/format';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { EmptyState } from './ui/empty-state';
import { fieldClass, FormField } from './ui/form';
import { LoadingState } from './ui/loading';
import { useToast } from './ui/toast';

const assessmentTypeLabels: Record<AssessmentType, string> = {
  DAILY_TASK: 'Tugas',
  QUIZ: 'Kuis',
  DAILY_TEST: 'Ulangan Harian',
  PRACTICE: 'Praktik',
  PROJECT: 'Proyek',
  PORTFOLIO: 'Portofolio',
  OBSERVATION: 'Observasi',
  OTHER: 'Lainnya',
};

const statusLabels: Record<AssessmentStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  LOCKED: 'Terkunci',
  REVISION_REQUESTED: 'Revisi',
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function TeacherAssessments() {
  const toast = useToast();
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [scoreDraft, setScoreDraft] = useState<Record<string, { score: string; notes: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    schoolYearId: '',
    semesterId: '',
    classId: '',
    subjectId: '',
    title: '',
    type: 'DAILY_TASK' as AssessmentType,
    assessmentDate: today(),
    maxScore: 100,
    weight: 1,
    notes: '',
  });

  const selectedSchoolYearClasses = useMemo(
    () => classes.filter((schoolClass) => schoolClass.schoolYearId === form.schoolYearId),
    [classes, form.schoolYearId],
  );
  const selectedSchoolYearSemesters = useMemo(
    () => semesters.filter((semester) => semester.schoolYearId === form.schoolYearId),
    [semesters, form.schoolYearId],
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
      const defaultSchoolYear = nextSchoolYears.find((schoolYear) => {
        const currentDate = today();
        return schoolYear.startsAt.slice(0, 10) <= currentDate && schoolYear.endsAt.slice(0, 10) >= currentDate;
      }) ?? nextSchoolYears[0];
      const defaultSemester = semesterResponse.data.find(
        (semester) => semester.schoolYearId === defaultSchoolYear?.id,
      );

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

  useEffect(() => {
    void loadInitial();
  }, []);

  useEffect(() => {
    const nextSemester = selectedSchoolYearSemesters[0];
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
  }, [selectedSchoolYearClasses, selectedSchoolYearSemesters]);

  if (loading) {
    return (
      <LoadingState className="mt-6" label="Memuat penilaian..." />
    );
  }

  return (
    <section className="mt-6 space-y-5">
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">Nilai Harian</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Buat Komponen Nilai</h2>
            <p className="mt-1 text-sm text-muted">
              Nilai disimpan per kelas, mapel, semester, dan enrollment siswa.
            </p>
          </div>
          <Button
            disabled={saving}
            onClick={() => void createAssessment()}
          >
            Buat Draft
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <FormSelect label="Tahun Ajaran" onChange={(value) => setForm((current) => ({ ...current, schoolYearId: value }))} value={form.schoolYearId}>
            {schoolYears.map((schoolYear) => (
              <option key={schoolYear.id} value={schoolYear.id}>{schoolYear.name}</option>
            ))}
          </FormSelect>
          <FormSelect label="Semester" onChange={(value) => setForm((current) => ({ ...current, semesterId: value }))} value={form.semesterId}>
            {selectedSchoolYearSemesters.map((semester) => (
              <option key={semester.id} value={semester.id}>{semester.type === 'ODD' ? 'Ganjil' : 'Genap'}</option>
            ))}
          </FormSelect>
          <FormSelect label="Kelas" onChange={(value) => setForm((current) => ({ ...current, classId: value }))} value={form.classId}>
            {selectedSchoolYearClasses.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
            ))}
          </FormSelect>
          <FormSelect label="Mapel" onChange={(value) => setForm((current) => ({ ...current, subjectId: value }))} value={form.subjectId}>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </FormSelect>
          <FormField className="md:col-span-2" label="Judul">
            <input
              className={fieldClass}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Contoh: Kuis Bab 1"
              value={form.title}
            />
          </FormField>
          <FormSelect label="Jenis" onChange={(value) => setForm((current) => ({ ...current, type: value as AssessmentType }))} value={form.type}>
            {Object.entries(assessmentTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </FormSelect>
          <FormField label="Tanggal">
            <input
              className={fieldClass}
              onChange={(event) => setForm((current) => ({ ...current, assessmentDate: event.target.value }))}
              type="date"
              value={form.assessmentDate}
            />
          </FormField>
          <FormField label="Skor Maks.">
            <input
              className={fieldClass}
              min={1}
              onChange={(event) => setForm((current) => ({ ...current, maxScore: Number(event.target.value) }))}
              type="number"
              value={form.maxScore}
            />
          </FormField>
          <FormField label="Bobot">
            <input
              className={fieldClass}
              min={0}
              onChange={(event) => setForm((current) => ({ ...current, weight: Number(event.target.value) }))}
              type="number"
              value={form.weight}
            />
          </FormField>
          <FormField className="md:col-span-2" label="Catatan">
            <input
              className={fieldClass}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Opsional"
              value={form.notes}
            />
          </FormField>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr]">
        <Card>
          <h3 className="text-sm font-black text-slate-900">Komponen Nilai</h3>
          <div className="mt-3 space-y-2">
            {assessments.map((assessment) => (
              <button
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selectedAssessment?.id === assessment.id ? 'border-brand-300 bg-brand-50' : 'border-blue-50 bg-slate-50 hover:border-brand-200'
                }`}
                key={assessment.id}
                onClick={() => void openAssessment(assessment.id)}
                type="button"
              >
                <p className="text-sm font-black text-slate-900">{assessment.title}</p>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {assessment.class.name} · {assessment.subject.name}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>{assessmentTypeLabels[assessment.type]}</Badge>
                  <Badge>{statusLabels[assessment.status]}</Badge>
                  <Badge>{formatReadableDate(assessment.assessmentDate)}</Badge>
                </div>
              </button>
            ))}
            {!assessments.length ? (
              <EmptyState title="Belum ada komponen nilai." />
            ) : null}
          </div>
        </Card>

        <AssessmentScoresEditor
          assessment={selectedAssessment}
          draft={scoreDraft}
          onDraftChange={setScoreDraft}
          onSave={() => void saveScores()}
          onSubmit={() => void submitScores()}
          saving={saving}
        />
      </div>
    </section>
  );
}

function AssessmentScoresEditor({
  assessment,
  draft,
  onDraftChange,
  onSave,
  onSubmit,
  saving,
}: {
  assessment: Assessment | null;
  draft: Record<string, { score: string; notes: string }>;
  onDraftChange: (draft: Record<string, { score: string; notes: string }>) => void;
  onSave: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  if (!assessment) {
    return (
      <EmptyState title="Pilih atau buat komponen nilai untuk mulai input skor siswa." />
    );
  }

  const editable = assessment.status === 'DRAFT' || assessment.status === 'REVISION_REQUESTED';

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">{assessment.title}</h3>
          <p className="mt-1 text-sm font-semibold text-muted">
            {assessment.class.name} · {assessment.subject.name} · Maks. {Number(assessment.maxScore)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button disabled={!editable || saving} onClick={onSave} size="sm" variant="outline">
            Simpan
          </Button>
          <Button disabled={!editable || saving} onClick={onSubmit} size="sm">
            Submit
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {(assessment.scores ?? []).map((score) => (
          <div className="grid gap-2 rounded-2xl border border-blue-50 bg-slate-50 p-3 md:grid-cols-[1.3fr_120px_1fr]" key={score.id}>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900">{score.student.name}</p>
              <p className="mt-1 text-xs font-semibold text-muted">NIS: {score.student.nis ?? '-'}</p>
            </div>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black outline-none focus:border-brand-600 disabled:bg-slate-100"
              disabled={!editable}
              max={Number(assessment.maxScore)}
              min={0}
              onChange={(event) => onDraftChange({ ...draft, [score.id]: { ...(draft[score.id] ?? { notes: '' }), score: event.target.value } })}
              placeholder="Nilai"
              type="number"
              value={draft[score.id]?.score ?? ''}
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-brand-600 disabled:bg-slate-100"
              disabled={!editable}
              onChange={(event) => onDraftChange({ ...draft, [score.id]: { ...(draft[score.id] ?? { score: '' }), notes: event.target.value } })}
              placeholder="Catatan"
              value={draft[score.id]?.notes ?? ''}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

function FormSelect({
  children,
  label,
  onChange,
  value,
}: {
  children: ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <FormField label={label}>
      <select
        className={fieldClass}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </FormField>
  );
}

function toScoreDraft(scores: AssessmentScore[]) {
  return Object.fromEntries(
    scores.map((score) => [
      score.id,
      {
        score: score.score === null || score.score === undefined ? '' : String(score.score),
        notes: score.notes ?? '',
      },
    ]),
  );
}
