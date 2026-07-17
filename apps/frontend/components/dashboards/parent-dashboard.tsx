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
            label="Status Hari Ini"
          />
          <ParentActionHint
            description="Ajukan izin/sakit sebelum guru membuka presensi agar status bisa ikut terbaca."
            label="Ajukan Izin"
          />
          <ParentActionHint
            description="Buka riwayat presensi dan nilai harian yang sudah disubmit guru."
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
  label,
}: {
  description: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 text-slate-900 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-50">
      <p className="text-sm font-black">{label}</p>
      <p className="mt-2 text-sm leading-6 opacity-75">{description}</p>
    </div>
  );
}
