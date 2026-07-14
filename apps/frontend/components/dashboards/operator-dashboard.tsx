import { type CurrentUser } from './dashboard-types';
import { RoleActionCard, RoleHero, RoleSection } from './role-dashboard-shared';

export function OperatorHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'Operator';

  return (
    <>
      <RoleHero
        description="Kelola data akademik, susun jadwal, dan pastikan kebutuhan operasional sekolah siap digunakan."
        eyebrow="Operator Sekolah"
        title={`Selamat bekerja, ${displayName}`}
      />
      <section className="mt-7 rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">
              Checklist Sebelum KBM
            </h2>
            <p className="mt-1 text-sm text-muted">
              Urutan kerja singkat agar data harian tidak tercecer.
            </p>
          </div>
          <span className="w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
            Admin
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <AdminChecklistItem label="Data guru dan siswa sudah terbaru" />
          <AdminChecklistItem label="Jadwal hari ini tidak ada bentrok" />
          <AdminChecklistItem label="Notifikasi dan audit dipantau" />
        </div>
      </section>
      <RoleSection description="Akses yang tidak tampil di navbar utama operator." title="Akses Pendukung">
        <RoleActionCard href="/admin/guru" label="Pengaturan Guru" description="Atur data guru, akun, role, mapel ampu, dan wali kelas." />
        <RoleActionCard href="/admin/akademik" label="Admin Akademik" description="Kelola rombel, mata pelajaran, jam pelajaran, dan master akademik." />
        <RoleActionCard href="/admin/import-data" label="Import Data" description="Upload data guru dan siswa dari file sekolah." />
        <RoleActionCard href="/admin/audit" label="Audit Aktivitas" description="Telusuri perubahan data penting oleh operator." />
      </RoleSection>
    </>
  );
}

function AdminChecklistItem({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--surface-soft)]">
      <p className="text-sm font-bold text-slate-900 dark:text-[var(--text)]">
        {label}
      </p>
    </div>
  );
}
