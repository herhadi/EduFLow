import { AuditTrail } from '../../components/audit-trail';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

export default function AuditPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Lihat jejak aktivitas penting seperti submit presensi, approval, pengiriman summary, retry notifikasi, dan perubahan jadwal."
          eyebrow="Audit & Activity Center"
          title="Pusat Aktivitas"
        />

        <AuditTrail />
      </Container>
    </main>
  );
}
