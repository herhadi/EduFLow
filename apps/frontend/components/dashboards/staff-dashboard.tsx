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
        <StaffFocusCard label="Data Administrasi" text="Pastikan data dasar yang dibutuhkan layanan administrasi sekolah tetap rapi." />
        <StaffFocusCard label="Import Data" text="Gunakan import saat ada pembaruan kolektif dari file sekolah." />
        <StaffFocusCard label="Laporan" text="Pantau laporan yang mendukung kebutuhan tata usaha." />
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

function StaffFocusCard({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:shadow-none">
      <p className="text-base font-black text-slate-900 dark:text-[var(--text)]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}
