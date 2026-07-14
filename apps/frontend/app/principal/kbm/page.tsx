import { OperationalDashboard } from '../../../components/operational-dashboard';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function PrincipalKbmPage() {
  return (
    <main className="py-8 sm:py-10">
      <Container>
        <PageHeader
          description="Fokus pada agenda hari ini: kelas kosong, belum submit, kendala KBM, checklist guru, dan guru pengganti."
          eyebrow="Kepala Sekolah"
          showBackLink={false}
          title="Monitoring KBM"
        />

        <OperationalDashboard audience="principal" className="mt-5" />
      </Container>
    </main>
  );
}
