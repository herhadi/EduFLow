'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { getPreferredSchoolYear } from '../../lib/school-year';

type Audience = 'tu' | 'operator';
type Summary = { teachers: number; students: number; classes: number; subjects: number; schoolYear: string };
type LoadState = 'loading' | 'success' | 'error';

const cards = [
  { tone: 'blue', label: 'Guru Aktif', icon: 'GR', tuHref: '/tu/ringkasan/guru', operatorHref: '/opsek/ringkasan/guru', tuDescription: 'Lihat, cetak, dan export daftar guru aktif', operatorDescription: 'Lihat, cetak, dan export daftar guru aktif' },
  { tone: 'violet', label: 'Siswa Aktif', icon: 'SW', tuHref: '/tu/siswa-aktif', operatorHref: '/opsek/siswa-aktif', tuDescription: 'Lihat daftar siswa tahun ajaran berjalan', operatorDescription: 'Lihat daftar siswa tahun ajaran berjalan' },
  { tone: 'amber', label: 'Rombel', icon: 'RB', tuHref: '/tu/ringkasan/rombel', operatorHref: '/opsek/ringkasan/rombel', tuDescription: 'Lihat, cetak, dan export daftar rombel', operatorDescription: 'Lihat, cetak, dan export daftar rombel' },
  { tone: 'emerald', label: 'Mata Pelajaran', icon: 'MP', tuHref: '/tu/ringkasan/mapel', operatorHref: '/opsek/ringkasan/mapel', tuDescription: 'Lihat, cetak, dan export daftar mata pelajaran', operatorDescription: 'Lihat, cetak, dan export daftar mata pelajaran' },
] as const;

const toneClasses = {
  blue: 'border-blue-200 bg-blue-50 text-blue-950 hover:border-blue-400 hover:bg-blue-100 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-100 dark:hover:border-blue-300/60 dark:hover:bg-blue-400/20',
  violet: 'border-violet-200 bg-violet-50 text-violet-950 hover:border-violet-400 hover:bg-violet-100 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-100 dark:hover:border-violet-300/60 dark:hover:bg-violet-400/20',
  amber: 'border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-400 hover:bg-amber-100 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100 dark:hover:border-amber-300/60 dark:hover:bg-amber-400/20',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100 dark:hover:border-emerald-300/60 dark:hover:bg-emerald-400/20',
} as const;

export function SchoolOverview({ audience }: { audience: Audience }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadSummary() {
      setState('loading');
      try {
        const [teacherResponse, studentResponse, classResponse, subjectResponse, yearResponse] =
          await Promise.all([
            api.getTeachers(),
            api.getStudents(),
            api.getClasses(),
            api.getSubjects(),
            api.getSchoolYears(),
          ]);
        if (ignore) return;
        const year = getPreferredSchoolYear(yearResponse.data);
        const yearId = year?.id;
        const activeStudents = studentResponse.data.filter((student) =>
          student.isActive !== false &&
          student.enrollments?.some((enrollment) =>
            enrollment.isActive && (!yearId || enrollment.schoolYear?.id === yearId),
          ),
        );
        setSummary({
          teachers: teacherResponse.data.filter((teacher) => teacher.isActive !== false).length,
          students: activeStudents.length,
          classes: classResponse.data.filter((schoolClass) => !yearId || schoolClass.schoolYearId === yearId).length,
          subjects: subjectResponse.data.filter((subject) => subject.isActive !== false).length,
          schoolYear: year?.name ?? 'Tahun ajaran belum ditentukan',
        });
        setUpdatedAt(new Date().toISOString());
        setState('success');
      } catch {
        if (!ignore) setState('error');
      }
    }
    void loadSummary();
    return () => { ignore = true; };
  }, []);

  const values = summary ? [summary.teachers, summary.students, summary.classes, summary.subjects] : [];
  return (
    <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:shadow-none sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-700 dark:text-brand-300">Ringkasan Data Sekolah</p>
          <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-[var(--text)]">
            {summary?.schoolYear ?? (state === 'loading' ? 'Memuat tahun ajaran…' : 'Ringkasan sekolah')}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {updatedAt ? 'Diperbarui ' + new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(updatedAt)) : 'Pilih kartu untuk membuka data terkait.'}
          </p>
        </div>
        {state === 'error' ? <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-400/10 dark:text-rose-200">Data gagal dimuat</span> : null}
      </div>
      {state === 'loading' ? <p className="mt-4 text-sm text-muted">Mengambil ringkasan data sekolah…</p> : null}
      {state === 'error' ? <p className="mt-4 text-sm text-rose-700 dark:text-rose-200">Periksa koneksi dan hak akses, lalu muat ulang halaman.</p> : null}
      {state === 'success' && summary ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card, index) => {
            const href = audience === 'tu' ? card.tuHref : card.operatorHref;
            const description = audience === 'tu' ? card.tuDescription : card.operatorDescription;
            return (
              <Link
                aria-label={card.label + ': ' + values[index].toLocaleString('id-ID') + '. ' + description}
                className={'group relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-2xl border p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[var(--surface-solid)] ' + toneClasses[card.tone]}
                href={href}
                key={card.label}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/80 text-xs font-black tracking-wide shadow-sm dark:bg-slate-950/30">{card.icon}</span>
                  <span className="text-lg font-black opacity-70 transition group-hover:translate-x-1 group-hover:-translate-y-0.5" aria-hidden="true">↗</span>
                </div>
                <div>
                  <p className="text-3xl font-black tabular-nums tracking-tight">{values[index].toLocaleString('id-ID')}</p>
                  <p className="mt-1 text-sm font-black">{card.label}</p>
                  <p className="mt-1 text-xs opacity-75">{description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
