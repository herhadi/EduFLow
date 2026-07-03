import { AuditTrail } from '../../../components/audit-trail';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function PrincipalAuditPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Lihat jejak aktivitas penting untuk kebutuhan supervisi kepala sekolah."
          eyebrow="Kepala Sekolah"
          title="Jejak Aktivitas"
        />

        <AuditTrail />
      </Container>
    </main>
  );
}
