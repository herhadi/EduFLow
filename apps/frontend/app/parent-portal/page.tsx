import { ParentPortal } from '../../components/parent-portal';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

export default function ParentPortalPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Wali murid dapat melihat kehadiran anak, ringkasan harian, dan riwayat presensi."
          eyebrow="Parent Portal"
          title="Portal Orang Tua"
        />

        <ParentPortal />
      </Container>
    </main>
  );
}
