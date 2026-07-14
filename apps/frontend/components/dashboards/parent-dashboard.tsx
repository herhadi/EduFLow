import { ParentPortal } from '../parent-portal';
import { PageHeader } from '../ui/page-header';
import { type CurrentUser } from './dashboard-types';

export function ParentHome({ currentUser }: { currentUser: CurrentUser | null }) {
  return (
    <>
      <PageHeader
        description="Pantau kehadiran anak, ringkasan harian, dan riwayat presensi."
        eyebrow="Portal Orang Tua"
        showBackLink={false}
        title={`Halo, ${currentUser?.name ?? 'Wali Murid'}`}
      />
      <ParentPortal
        initialContact={currentUser?.email ?? currentUser?.username ?? ''}
        mode="overview"
        title="Ringkasan Kehadiran Anak"
      />
    </>
  );
}
