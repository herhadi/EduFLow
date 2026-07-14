import { ExportReportingCenter } from '../../../components/export-reporting-center';
import { StudentReportDashboard } from '../../../components/student-report-dashboard';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function PrincipalReportsPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Pantau presensi, risiko, izin/sakit, alpha, dan nilai harian siswa dengan tampilan ringkas yang bisa dibuka per detail."
          eyebrow="Kepala Sekolah"
          showBackLink={false}
          title="Report Siswa"
        />

        <StudentReportDashboard />
        <ExportReportingCenter />
      </Container>
    </main>
  );
}
