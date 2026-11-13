'use client';

import { RoleActionCard, RoleSection, RoleHero } from './role-dashboard-shared';
import { type CurrentUser } from './dashboard-types';
import { SchoolOverview } from './school-overview';

export function StaffHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'Tata Usaha';
  return (
    <>
      <RoleHero
        description="Pantau ringkasan data sekolah dan lanjutkan pekerjaan administrasi dari satu beranda."
        eyebrow="Tata Usaha"
        title={'Selamat bekerja, ' + displayName}
      />
      <SchoolOverview audience="tu" />
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
          <a className="mt-4 inline-flex text-sm font-black text-amber-900 underline underline-offset-4 dark:text-amber-100" href="/tu/notifications">Lihat pesan dan tindak lanjut</a>
        </div>
      </section>
    </>
  );
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
