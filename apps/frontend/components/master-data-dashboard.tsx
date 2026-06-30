'use client';

import { sortSchoolClasses } from '@eduflow/shared';

import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type SchoolClass,
  type SchoolYear,
  type Student,
  type Subject,
  type Teacher,
} from '../lib/api';

type LoadState = 'idle' | 'loading' | 'success' | 'error';
type MasterTab = 'teachers' | 'students' | 'classes' | 'subjects' | 'schoolYears';

const tabs: Array<{ id: MasterTab; label: string; description: string }> = [
  {
    id: 'teachers',
    label: 'Guru',
    description: 'Data pengajar untuk jadwal dan presensi.',
  },
  {
    id: 'students',
    label: 'Siswa',
    description: 'Data peserta didik beserta kelas aktif.',
  },
  {
    id: 'classes',
    label: 'Kelas',
    description: 'Rombongan belajar per tahun ajaran.',
  },
  {
    id: 'subjects',
    label: 'Mata Pelajaran',
    description: 'Daftar mapel yang dipakai di jadwal.',
  },
  {
    id: 'schoolYears',
    label: 'Tahun Ajaran',
    description: 'Periode akademik utama sekolah.',
  },
];

export function MasterDataDashboard() {
  const [activeTab, setActiveTab] = useState<MasterTab>('teachers');
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadMasterData() {
      setLoadState('loading');

      try {
        const [
          teacherResponse,
          studentResponse,
          classResponse,
          subjectResponse,
          schoolYearResponse,
        ] = await Promise.all([
          api.getTeachers(),
          api.getStudents(),
          api.getClasses(),
          api.getSubjects(),
          api.getSchoolYears(),
        ]);

        if (!isMounted) {
          return;
        }

        setTeachers(teacherResponse.data);
        setStudents(studentResponse.data);
        setClasses(classResponse.data);
        setSubjects(subjectResponse.data);
        setSchoolYears(schoolYearResponse.data);
        setLoadState('success');
      } catch {
        if (isMounted) {
          setLoadState('error');
        }
      }
    }

    void loadMasterData();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeDescription = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.description,
    [activeTab],
  );

  return (
    <section className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="min-w-0 rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60">
        <p className="px-3 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
          Master Data
        </p>
        <nav className="no-scrollbar mt-4 flex gap-2 overflow-x-auto lg:block lg:space-y-2 lg:overflow-visible">
          {tabs.map((tab) => (
            <button
              className={[
                'shrink-0 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition lg:w-full',
                activeTab === tab.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-brand-50 text-brand-700 hover:bg-blue-100 lg:bg-transparent lg:text-slate-700 lg:hover:bg-slate-100',
              ].join(' ')}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {tabs.find((tab) => tab.id === activeTab)?.label}
            </h2>
            <p className="mt-1 text-sm text-muted">{activeDescription}</p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {loadState === 'loading' ? 'Memuat' : 'Read-only MVP'}
          </span>
        </div>

        {loadState === 'error' ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Data belum bisa dimuat. Pastikan backend berjalan di port `3001`.
          </div>
        ) : null}

        <div className="mt-6 min-w-0">
          {activeTab === 'teachers' ? <TeacherList teachers={teachers} /> : null}
          {activeTab === 'students' ? <StudentList students={students} /> : null}
          {activeTab === 'classes' ? <ClassList classes={classes} /> : null}
          {activeTab === 'subjects' ? <SubjectList subjects={subjects} /> : null}
          {activeTab === 'schoolYears' ? (
            <SchoolYearList schoolYears={schoolYears} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TeacherList({ teachers }: { teachers: Teacher[] }) {
  return (
    <ResponsiveList
      emptyLabel="Belum ada guru."
      headers={['Nama Guru', 'NIP', 'No HP', 'Status']}
      rows={teachers.map((teacher) => [
        teacher.name,
        teacher.nip ?? '-',
        teacher.phone ?? '-',
        teacher.isActive === false ? 'Nonaktif' : 'Aktif',
      ])}
    />
  );
}

function StudentList({ students }: { students: Student[] }) {
  return (
    <ResponsiveList
      emptyLabel="Belum ada siswa."
      headers={['Nama Siswa', 'NIS', 'NISN', 'Kelas Aktif', 'Wali Utama']}
      rows={students.map((student) => {
        const activeEnrollment = student.enrollments[0];
        const primaryGuardian =
          student.guardians.find((guardian) => guardian.isPrimary) ??
          student.guardians[0];

        return [
          student.name,
          student.nis ?? '-',
          student.nisn ?? '-',
          activeEnrollment
            ? `${activeEnrollment.class.name} · ${activeEnrollment.schoolYear.name}`
            : '-',
          primaryGuardian
            ? `${primaryGuardian.guardian.name} (${primaryGuardian.relation})`
            : '-',
        ];
      })}
    />
  );
}

function ClassList({ classes }: { classes: SchoolClass[] }) {
  return (
    <ResponsiveList
      emptyLabel="Belum ada kelas."
      headers={['Nama Kelas', 'Kode', 'Tingkat', 'Tahun Ajaran']}
      rows={sortSchoolClasses(classes).map((schoolClass) => [
        schoolClass.name,
        schoolClass.code ?? '-',
        schoolClass.grade ?? '-',
        schoolClass.schoolYear?.name ?? '-',
      ])}
    />
  );
}

function SubjectList({ subjects }: { subjects: Subject[] }) {
  return (
    <ResponsiveList
      emptyLabel="Belum ada mata pelajaran."
      headers={['Mata Pelajaran', 'Kode', 'Status']}
      rows={subjects.map((subject) => [
        subject.name,
        subject.code ?? '-',
        subject.isActive === false ? 'Nonaktif' : 'Aktif',
      ])}
    />
  );
}

function SchoolYearList({ schoolYears }: { schoolYears: SchoolYear[] }) {
  return (
    <ResponsiveList
      emptyLabel="Belum ada tahun ajaran."
      headers={['Tahun Ajaran', 'Mulai', 'Selesai']}
      rows={schoolYears.map((schoolYear) => [
        schoolYear.name,
        formatDate(schoolYear.startsAt),
        formatDate(schoolYear.endsAt),
      ])}
    />
  );
}

function ResponsiveList({
  emptyLabel,
  headers,
  rows,
}: {
  emptyLabel: string;
  headers: string[];
  rows: string[][];
}) {
  if (rows.length === 0) {
    return <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row, rowIndex) => (
          <article
            className="rounded-2xl border border-blue-100 bg-slate-50 p-4"
            key={`${row.join('-')}-${rowIndex}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-slate-900">
                  {row[0]}
                </h3>
                {row[1] ? (
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {headers[1]}: {row[1]}
                  </p>
                ) : null}
              </div>
              {row[row.length - 1] ? (
                <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                  {row[row.length - 1]}
                </span>
              ) : null}
            </div>

            <dl className="mt-4 grid gap-2">
              {row.slice(1).map((cell, cellIndex) => (
                <div
                  className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2"
                  key={`${cell}-${cellIndex}`}
                >
                  <dt className="text-xs font-bold text-muted">
                    {headers[cellIndex + 1]}
                  </dt>
                  <dd className="max-w-[60%] text-right text-xs font-semibold text-slate-700">
                    {cell}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold tracking-[0.08em] text-slate-500 uppercase">
            <tr>
              {headers.map((header) => (
                <th className="px-4 py-3" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, rowIndex) => (
              <tr key={`${row.join('-')}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td className="px-4 py-4 text-slate-700" key={`${cell}-${cellIndex}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
