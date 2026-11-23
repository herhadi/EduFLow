import { AuditTrail } from '../../components/audit-trail';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

export default function AuditPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Lihat aktivitas penting di sekolah, siapa yang melakukannya, dan kapan aktivitas berlangsung."
          eyebrow="Riwayat Sekolah"
          title="Pusat Aktivitas"
        />

        <AuditTrail />
      </Container>
    </main>
  );
}
