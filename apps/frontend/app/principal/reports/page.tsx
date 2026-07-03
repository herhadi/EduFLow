import { ExportReportingCenter } from '../../../components/export-reporting-center';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function PrincipalReportsPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Download laporan operasional sekolah dalam format Excel atau PDF."
          eyebrow="Kepala Sekolah"
          title="Laporan Sekolah"
        />

        <ExportReportingCenter />
      </Container>
    </main>
  );
}
