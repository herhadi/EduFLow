import { ExportReportingCenter } from '../../../components/export-reporting-center';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function PrincipalExportsPage() {
  return (
    <main className="py-8 sm:py-10">
      <Container>
        <PageHeader
          description="Unduh rekap operasional sekolah per tanggal dalam format Excel atau PDF."
          eyebrow="Kepala Sekolah"
          showBackLink={false}
          title="Export Laporan"
        />

        <ExportReportingCenter />
      </Container>
    </main>
  );
}
