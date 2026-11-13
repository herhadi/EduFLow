'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { getPreferredSchoolYear } from '../../lib/school-year';
import { type CurrentUser } from './dashboard-types';
import { RoleActionCard, RoleSection, RoleHero } from './role-dashboard-shared';

type TuSummary = {
  teachers: number;
  students: number;
  classes: number;
  subjects: number;
  schoolYear: string;
  schoolYearId?: string;
};

type DashboardState = 'loading' | 'success' | 'error';

export function StaffHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'Tata Usaha';
  const [summary, setSummary] = useState<TuSummary | null>(null);
  const [state, setState] = useState<DashboardState>('loading');
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

        const preferredYear = getPreferredSchoolYear(yearResponse.data);
        const activeYearId = preferredYear?.id;
        const activeStudents = studentResponse.data.filter((student) =>
          student.isActive !== false &&
          student.enrollments?.some((enrollment) =>
            enrollment.isActive && (!activeYearId || enrollment.schoolYear?.id === activeYearId),
          ),
        );

        setSummary({
          teachers: teacherResponse.data.filter((teacher) => teacher.isActive !== false).length,
          students: activeStudents.length,
          classes: classResponse.data.filter((schoolClass) =>
            !activeYearId || schoolClass.schoolYearId === activeYearId,
          ).length,
          subjects: subjectResponse.data.filter((subject) => subject.isActive !== false).length,
          schoolYear: preferredYear?.name ?? 'Tahun ajaran belum ditentukan',
          schoolYearId: activeYearId,
        });
        setUpdatedAt(new Date().toISOString());
        setState('success');
      } catch {
        if (!ignore) setState('error');
      }
    }

    void loadSummary();

    return () => {
      ignore = true;
    };
  }, []);

  function downloadStudentExcel() {
    if (!selectedClassGroups.length) return;
    const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
    const rows = selectedClassGroups.flatMap((group) => [
      `<tr><th colspan=\"4\">${escapeHtml(group.name)} · ${group.students.length} siswa</th></tr>`,
      '<tr><th>No</th><th>Kelas</th><th>Nama Siswa</th><th>NIS</th></tr>',
      ...group.students.map((student, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(group.name)}</td><td>${escapeHtml(student.name)}</td><td>${escapeHtml(student.nis || '')}</td></tr>`),
    ]).join('');
    const workbook = `<html><head><meta charset=\"utf-8\"></head><body><table>${rows}</table></body></html>`;
    const blob = new Blob([`\uFEFF${workbook}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daftar-siswa-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <RoleHero
        description="Pantau ringkasan data sekolah dan lanjutkan pekerjaan administrasi dari satu beranda."
        eyebrow="Tata Usaha"
        title={`Selamat bekerja, ${displayName}`}
      />

      <section className="mt-6 rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:shadow-none sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-700">Ringkasan Administrasi</p>
            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-[var(--text)]">
              {summary?.schoolYear ?? 'Memuat data sekolah…'}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {updatedAt ? `Diperbarui ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(updatedAt))}` : 'Data diambil dari master sekolah.'}
            </p>
          </div>
          <Link className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-[var(--border)] dark:text-[var(--text)]" href="/tu/data">
            Buka Master Data
          </Link>
        </div>

        {state === 'loading' ? (
          <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-muted dark:bg-[var(--surface-soft)]">Mengambil ringkasan data administrasi…</p>
        ) : null}
        {state === 'error' ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
            Ringkasan belum dapat dimuat. Periksa koneksi dan hak akses data, lalu muat ulang halaman.
          </div>
        ) : null}

        {summary ? (
          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <TuStat label="Guru aktif" value={summary.teachers} detail="Data tenaga pendidik" />
            <TuStat label="Siswa aktif" value={summary.students} detail="Lihat daftar siswa tahun ajaran berjalan" onClick={() => { window.location.assign('/tu/siswa-aktif'); }} />
            <TuStat label="Rombel" value={summary.classes} detail="Tahun ajaran berjalan" />
            <TuStat label="Mata pelajaran" value={summary.subjects} detail="Master mata pelajaran" />
          </div>
        ) : null}
      </section>


      <RoleSection description="Pilih pekerjaan administrasi yang ingin dilanjutkan." title="Pekerjaan Administrasi">
        <RoleActionCard href="/tu/data" label="Master Data" description="Periksa dan kelola data kelas serta mata pelajaran sesuai kewenangan TU." />
        <RoleActionCard href="/tu/import-data" label="Import Guru & Siswa" description="Perbarui data massal melalui template Excel dan periksa hasil validasinya." />
        <RoleActionCard href="/tu/reports" label="Laporan" description="Unduh rekap administrasi sekolah dalam format yang tersedia." />
      </RoleSection>

      <section className="mt-7 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-[var(--border)] dark:bg-[var(--surface-solid)]">
          <h2 className="text-base font-black text-slate-900 dark:text-[var(--text)]">Checklist Administrasi</h2>
          <p className="mt-1 text-sm text-muted">Pemeriksaan rutin sebelum dan sesudah pembaruan data.</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-700 dark:text-[var(--text-soft)]">
            <li className="flex gap-3"><span className="mt-0.5 text-brand-600">01</span><span>Pastikan data guru dan siswa hasil import sudah sesuai dokumen sumber.</span></li>
            <li className="flex gap-3"><span className="mt-0.5 text-brand-600">02</span><span>Periksa kelas dan mata pelajaran yang digunakan pada administrasi sekolah.</span></li>
            <li className="flex gap-3"><span className="mt-0.5 text-brand-600">03</span><span>Unduh laporan sesuai kebutuhan dan periode yang diminta.</span></li>
          </ul>
        </div>
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-400/20 dark:bg-amber-400/10">
          <h2 className="text-base font-black text-amber-950 dark:text-amber-50">Batas Kewenangan TU</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900/80 dark:text-amber-100/80">
            Kalender pendidikan, jam pelajaran, jadwal, generate agenda, presensi, dan pengaturan KBM tetap dikelola Operator Sekolah.
          </p>
          <Link className="mt-4 inline-flex text-sm font-black text-amber-900 underline underline-offset-4 dark:text-amber-100" href="/tu/notifications">Lihat pesan dan tindak lanjut</Link>
        </div>
      </section>
    </>
  );
}

function TuStat({ label, value, detail, onClick }: { label: string; value: number; detail: string; onClick?: () => void }) {
  const className = "w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition dark:border-[var(--border)] dark:bg-[var(--surface-soft)]";
  const content = (
    <>
      <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-[var(--text)]">{value.toLocaleString('id-ID')}</p>
      <p className="mt-1 text-sm font-black text-slate-800 dark:text-[var(--text)]">{label}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </>
  );
  return onClick ? <button className={className + " cursor-pointer hover:border-brand-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 dark:hover:bg-[var(--surface-solid)]"} onClick={onClick} type="button">{content}</button> : <div className={className}>{content}</div>;
}

export function CounselingHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'BK';

  return (
    <>
      <RoleHero
        description="Pantau siswa yang membutuhkan perhatian dan gunakan data presensi sebagai dasar tindak lanjut."
        eyebrow="Bimbingan Konseling"
        title={`Selamat bekerja, ${displayName}`}
      />
      <section className="mt-7 grid gap-3 md:grid-cols-3">
        <StaffFocusCard label="Siswa Perlu Perhatian" text="Gunakan data presensi sebagai awal tindak lanjut siswa." />
        <StaffFocusCard label="Laporan BK" text="Baca rekap pendukung untuk observasi dan konseling." />
        <StaffFocusCard label="Inbox" text="Pantau pesan atau tindak lanjut yang masuk ke peran BK." />
      </section>
    </>
  );
}

function StaffFocusCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:shadow-none">
      <p className="text-base font-black text-slate-900 dark:text-[var(--text)]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}
