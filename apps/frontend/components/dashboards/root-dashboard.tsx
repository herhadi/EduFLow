import { type CurrentUser } from './dashboard-types';
import { RoleActionCard, RoleHero, RoleSection } from './role-dashboard-shared';

export function RootHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'Root';

  return (
    <>
      <RoleHero
        description="Area root dipakai untuk support teknis: akses sistem, health check, queue, Telegram, audit, backup, dan pemulihan. Operasional akademik harian tetap berada di role operator sekolah."
        eyebrow="Support Teknis"
        title={`Selamat datang, ${displayName}`}
      />
      <RoleSection description="Pantau dan tangani konfigurasi teknis tanpa masuk ke pekerjaan harian operator sekolah." title="Kontrol Sistem">
        <RoleActionCard href="/operations" label="Ops & Health" description="Cek database, Redis, queue, worker, backup, dan retry job teknis." />
        <RoleActionCard href="/system/access" label="User & Hak Akses" description="Kelola user sistem, role, permission, reset akses, dan akun bermasalah." />
        <RoleActionCard href="/system/telegram" label="Telegram Bot" description="Cek token, webhook, user yang sudah link Telegram, dan log notifikasi." />
        <RoleActionCard href="/system/audit" label="Audit Teknis" description="Telusuri aktivitas penting, retry notifikasi, dan perubahan konfigurasi sistem." />
      </RoleSection>
    </>
  );
}
