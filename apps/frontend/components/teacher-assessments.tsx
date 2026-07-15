'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type Assessment,
  type SchoolClass,
  type SchoolYear,
  type Semester,
  type Subject,
} from '../lib/api';
import { AssessmentFormCard } from './teacher-assessments/assessment-form-card';
import { AssessmentListCard } from './teacher-assessments/assessment-list-card';
import { AssessmentScoresEditor } from './teacher-assessments/assessment-scores-editor';
import {
  getEmptyAssessmentForm,
  getToday,
  toScoreDraft,
  type ScoreDraft,
} from './teacher-assessments/teacher-assessment-utils';
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
  const [form, setForm] = useState(getEmptyAssessmentForm);

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
        const currentDate = getToday();
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

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr]">
        <AssessmentListCard
          assessments={assessments}
          onOpen={(id) => void openAssessment(id)}
          selectedAssessmentId={selectedAssessment?.id}
        />

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
