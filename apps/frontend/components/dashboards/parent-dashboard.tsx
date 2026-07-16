import Link from 'next/link';
import { ParentPortal } from '../parent-portal';
import { PageHeader } from '../ui/page-header';
import { type CurrentUser } from './dashboard-types';

export function ParentHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? 'Wali Murid';

  return (
    <>
      <PageHeader
        description="Pantau status anak hari ini, ajukan izin/sakit bila diperlukan, dan buka riwayat presensi atau nilai harian."
        eyebrow="Portal Orang Tua"
        showBackLink={false}
        title={`Halo, ${displayName}`}
      />
      <section className="mt-6 rounded-[2rem] border border-blue-100 bg-blue-50/70 p-5 shadow-sm dark:border-blue-400/20 dark:bg-blue-400/10 dark:shadow-none">
        <div className="grid gap-3 md:grid-cols-3">
          <ParentActionHint
            description="Lihat apakah anak sudah tercatat hadir, izin, sakit, atau alpha dari presensi guru."
            href="/parent/dashboard"
            label="Status Hari Ini"
          />
          <ParentActionHint
            description="Ajukan izin/sakit sebelum guru membuka presensi agar status bisa ikut terbaca."
            href="/parent/permits"
            label="Ajukan Izin"
          />
          <ParentActionHint
            description="Buka riwayat presensi dan nilai harian yang sudah disubmit guru."
            href="/parent/reports"
            label="Riwayat Anak"
          />
        </div>
      </section>
      <ParentPortal
        initialContact={currentUser?.email ?? currentUser?.username ?? ''}
        mode="overview"
        title="Ringkasan Kehadiran Anak"
      />
    </>
  );
}

function ParentActionHint({
  description,
  href,
  label,
}: {
  description: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      className="rounded-2xl border border-blue-100 bg-white p-4 text-slate-900 transition hover:-translate-y-0.5 hover:border-brand-300 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-50"
      href={href}
    >
      <p className="text-sm font-black">{label}</p>
      <p className="mt-2 text-sm leading-6 opacity-75">{description}</p>
      <span className="mt-3 inline-flex text-xs font-black text-brand-700 dark:text-blue-100">Buka</span>
    </Link>
  );
}
