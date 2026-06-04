import { MasterDataDashboard } from '../../components/master-data-dashboard';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

export default function MasterDataPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Kelola fondasi data akademik secara bertahap: guru, siswa, kelas, mata pelajaran, dan tahun ajaran."
          eyebrow="Academic Master Data"
          title="Master Data Akademik"
        />

        <MasterDataDashboard />
      </Container>
    </main>
  );
}
