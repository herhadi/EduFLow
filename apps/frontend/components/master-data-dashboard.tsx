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
import {
  ClassList,
  SchoolYearList,
  StudentList,
  SubjectList,
  TeacherList,
} from './master-data-dashboard/master-data-lists';
import {
  masterDataTabs,
  type MasterTab,
} from './master-data-dashboard/master-data-utils';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

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
    () => masterDataTabs.find((tab) => tab.id === activeTab)?.description,
    [activeTab],
  );

  return (
    <section className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="min-w-0 rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60">
        <p className="px-3 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
          Master Data
        </p>
        <nav className="no-scrollbar mt-4 flex gap-2 overflow-x-auto lg:block lg:space-y-2 lg:overflow-visible">
          {masterDataTabs.map((tab) => (
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
              {masterDataTabs.find((tab) => tab.id === activeTab)?.label}
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
