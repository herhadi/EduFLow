import Link from 'next/link';
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

      <section className="mt-7 rounded-[2rem] border border-sky-100 bg-sky-50/80 p-5 shadow-sm dark:border-sky-400/20 dark:bg-sky-400/10 dark:shadow-none">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-sky-950 dark:text-sky-50">
              Ringkasan Support Teknis
            </h2>
            <p className="mt-1 text-sm text-sky-900/75 dark:text-sky-100/75">
              Cek kondisi sistem, koneksi bot, dan akses user sebelum menangani laporan sekolah.
            </p>
          </div>
          <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-sky-800 shadow-sm dark:bg-sky-400/15 dark:text-sky-100">
            Root only
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <RootFocusItem
            description="CPU, RAM, database, Redis, queue, worker, failed job, backup, dan R2."
            label="Kesehatan Sistem"
            tone="info"
          />
          <RootFocusItem
            description="Webhook aktif, user sudah link Telegram, dan log pengiriman notifikasi."
            href="/system/telegram"
            label="Telegram"
            tone="success"
          />
          <RootFocusItem
            description="Akun terkunci, reset password, permission root/operator, dan audit akses."
            label="Akses User"
            tone="warning"
          />
        </div>
      </section>

      <section className="mt-7 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-solid)] dark:shadow-none">
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-[var(--text)]">
          Batas Peran Root
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <RootBoundaryItem label="Support teknis" value="monitoring, recovery, akses, Telegram, audit" />
          <RootBoundaryItem label="Bukan operator" value="tidak menangani jadwal, presensi, dan izin harian" />
          <RootBoundaryItem label="Saat insiden" value="cek Ops, lihat failed job, lalu gunakan audit untuk jejak perubahan" />
        </div>
      </section>

      <RoleSection description="Akses teknis yang paling sering dipakai saat support sekolah." title="Aksi Lanjutan">
        <RoleActionCard href="/system/audit" label="Audit Teknis" description="Telusuri aktivitas penting, retry notifikasi, dan perubahan konfigurasi sistem." />
        <RoleActionCard href="/system/profile" label="Profil Root" description="Kelola profil, sandi, sesi aktif, dan pengaturan akun root." />
      </RoleSection>
    </>
  );
}

function RootFocusItem({
  description,
  href,
  label,
  tone,
}: {
  description: string;
  href?: string;
  label: string;
  tone: 'info' | 'success' | 'warning';
}) {
  const toneClass = {
    info: 'border-sky-200 bg-white text-sky-950 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-50',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-50',
    warning: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-50',
  }[tone];

  const className = `rounded-2xl border p-4 ${href ? 'transition hover:-translate-y-0.5' : ''} ${toneClass}`;
  const content = (
    <>
      <p className="text-sm font-black">{label}</p>
      <p className="mt-2 text-sm leading-6 opacity-80">{description}</p>
      {href ? <span className="mt-3 inline-flex text-xs font-black opacity-90">Buka</span> : null}
    </>
  );

  return href ? <Link className={className} href={href}>{content}</Link> : <div className={className}>{content}</div>;
}

function RootBoundaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--surface-soft)]">
      <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-900 dark:text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}
