import { TeacherPerformanceDashboard } from '../../../components/teacher-performance-dashboard';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function PrincipalTeacherPerformancePage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Pantau sesi mengajar, keterlambatan submit, kelas kosong, dan konsistensi presensi guru."
          eyebrow="Kepala Sekolah"
          title="Dashboard Performa Guru"
        />

        <TeacherPerformanceDashboard />
      </Container>
    </main>
  );
}
