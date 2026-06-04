import { ExportReportingCenter } from '../../components/export-reporting-center';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

export default function ReportsPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Download laporan operasional sekolah dalam format Excel atau PDF."
          eyebrow="Export & Reporting"
          title="Export Laporan"
        />

        <ExportReportingCenter />
      </Container>
    </main>
  );
}
