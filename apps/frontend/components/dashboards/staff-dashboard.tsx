import { type CurrentUser } from './dashboard-types';
import { RoleHero } from './role-dashboard-shared';

export function StaffHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'Tata Usaha';

  return (
    <RoleHero
      description="Kelola data administrasi akademik, import data, dan laporan yang mendukung operasional sekolah."
      eyebrow="Tata Usaha"
      title={`Selamat bekerja, ${displayName}`}
    />
  );
}

export function CounselingHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'BK';

  return (
    <RoleHero
      description="Pantau siswa yang membutuhkan perhatian dan gunakan data presensi sebagai dasar tindak lanjut."
      eyebrow="Bimbingan Konseling"
      title={`Selamat bekerja, ${displayName}`}
    />
  );
}
