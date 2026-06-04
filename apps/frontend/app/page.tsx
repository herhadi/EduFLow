import { Container } from '../components/ui/container';
import { OperationalDashboard } from '../components/operational-dashboard';
import { PageHeader } from '../components/ui/page-header';

export default function Home() {
  return (
    <main className="py-8 sm:py-12">
      <Container>
        <PageHeader
          description="Dashboard ringkas untuk operator dan kepala sekolah memantau KBM, presensi, guru, siswa, dan notifikasi."
          eyebrow="EduFlow"
          showBackLink={false}
          title="Monitoring Hari Ini"
        />

        <OperationalDashboard />
      </Container>
    </main>
  );
}
