import Link from 'next/link';
import { type CurrentUser } from './dashboard-types';
import { RoleHero } from './role-dashboard-shared';

export function StaffHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'Tata Usaha';

  return (
    <>
      <RoleHero
        description="Kelola data administrasi akademik, import data, dan laporan yang mendukung operasional sekolah."
        eyebrow="Tata Usaha"
        title={`Selamat bekerja, ${displayName}`}
      />
      <section className="mt-7 grid gap-3 md:grid-cols-3">
        <StaffActionCard href="/tu/data" label="Data Administrasi" text="Buka data dasar yang dibutuhkan untuk layanan administrasi sekolah." />
        <StaffActionCard href="/tu/import-data" label="Import Data" text="Masukkan data dari file sekolah saat ada pembaruan kolektif." />
        <StaffActionCard href="/tu/reports" label="Laporan" text="Buka laporan yang mendukung kebutuhan tata usaha." />
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
        <StaffActionCard href="/bk/students" label="Siswa Perlu Perhatian" text="Lihat daftar siswa dan gunakan data presensi sebagai awal tindak lanjut." />
        <StaffActionCard href="/bk/reports" label="Laporan BK" text="Buka rekap pendukung untuk observasi dan konseling." />
        <StaffActionCard href="/bk/notifications" label="Inbox" text="Pantau pesan atau tindak lanjut yang masuk ke peran BK." />
      </section>
    </>
  );
}

function StaffActionCard({
  href,
  label,
  text,
}: {
  href: string;
  label: string;
  text: string;
}) {
  return (
    <Link
      className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-500 dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:shadow-none"
      href={href}
    >
      <p className="text-base font-black text-slate-900 dark:text-[var(--text)]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
      <span className="mt-4 inline-flex text-xs font-black text-brand-700 dark:text-blue-100">Buka</span>
    </Link>
  );
}
