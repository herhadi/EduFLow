'use client';

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
    <section className="mt-10 grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="px-3 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
          Master Data
        </p>
        <nav className="mt-4 space-y-2">
          {tabs.map((tab) => (
            <button
              className={[
                'w-full rounded-xl px-3 py-3 text-left text-sm font-semibold transition',
                activeTab === tab.id
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100',
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
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

        <div className="mt-6">
          {activeTab === 'teachers' ? <TeacherTable teachers={teachers} /> : null}
          {activeTab === 'students' ? <StudentTable students={students} /> : null}
          {activeTab === 'classes' ? <ClassTable classes={classes} /> : null}
          {activeTab === 'subjects' ? <SubjectTable subjects={subjects} /> : null}
          {activeTab === 'schoolYears' ? (
            <SchoolYearTable schoolYears={schoolYears} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TeacherTable({ teachers }: { teachers: Teacher[] }) {
  return (
    <SimpleTable
      emptyLabel="Belum ada guru."
      headers={['Nama Guru', 'NIP', 'No HP', 'Telegram', 'Status']}
      rows={teachers.map((teacher) => [
        teacher.name,
        teacher.nip ?? '-',
        teacher.phone ?? '-',
        teacher.telegramId ?? '-',
        teacher.isActive === false ? 'Nonaktif' : 'Aktif',
      ])}
    />
  );
}

function StudentTable({ students }: { students: Student[] }) {
  return (
    <SimpleTable
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

function ClassTable({ classes }: { classes: SchoolClass[] }) {
  return (
    <SimpleTable
      emptyLabel="Belum ada kelas."
      headers={['Nama Kelas', 'Kode', 'Tingkat', 'Tahun Ajaran']}
      rows={classes.map((schoolClass) => [
        schoolClass.name,
        schoolClass.code ?? '-',
        schoolClass.grade ?? '-',
        schoolClass.schoolYear?.name ?? '-',
      ])}
    />
  );
}

function SubjectTable({ subjects }: { subjects: Subject[] }) {
  return (
    <SimpleTable
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

function SchoolYearTable({ schoolYears }: { schoolYears: SchoolYear[] }) {
  return (
    <SimpleTable
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

function SimpleTable({
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
    <div className="overflow-hidden rounded-2xl border border-slate-200">
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
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
