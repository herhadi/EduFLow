import { TeacherPerformanceDashboard } from '../../components/teacher-performance-dashboard';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

export default function TeacherPerformancePage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Pantau sesi mengajar, keterlambatan submit, kelas kosong, dan konsistensi presensi guru."
          eyebrow="Teacher Performance"
          title="Dashboard Performa Guru"
        />

        <TeacherPerformanceDashboard />
      </Container>
    </main>
  );
}
