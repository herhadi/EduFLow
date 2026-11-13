import { type CurrentUser } from './dashboard-types';
import { RoleActionCard, RoleHero, RoleSection } from './role-dashboard-shared';

export function AdminHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'Super Admin Sekolah';

  return (
    <>
      <RoleHero
        description="Kelola akses pengguna dan bantu operasional teknis aplikasi di tingkat sekolah. Untuk perubahan infrastruktur global atau insiden developer, koordinasikan dengan Root."
        eyebrow="Super Admin Sekolah"
        title={`Selamat datang, ${displayName}`}
      />
      <RoleSection description="Kewenangan pengelolaan aplikasi sekolah sesuai role dan permission." title="Administrasi Sistem Sekolah">
        <RoleActionCard href="/admin/access" label="Akun & Akses" description="Kelola akun pengguna, role, dan tindak lanjut reset password." />
        <RoleActionCard href="/admin/operations" label="Monitoring Sistem" description="Pantau health check, antrean, worker, dan layanan pendukung." />
        <RoleActionCard href="/admin/notifications" label="Helpdesk" description="Pantau notifikasi operasional dan tindak lanjut bantuan pengguna." />
        <RoleActionCard href="/admin/audit" label="Audit" description="Telusuri perubahan akses dan aktivitas penting aplikasi." />
      </RoleSection>
      <section className="mt-7 rounded-[1.75rem] border border-slate-200 bg-white p-5 dark:border-[var(--border)] dark:bg-[var(--surface-solid)]">
        <h2 className="text-base font-black text-slate-900 dark:text-[var(--text)]">Batas kewenangan</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Super Admin Sekolah tidak mengelola jadwal, agenda, presensi, nilai, atau kegiatan KBM. Infrastruktur global, database, dan recovery tingkat developer tetap dikoordinasikan dengan Root.
        </p>
      </section>
    </>
  );
}
