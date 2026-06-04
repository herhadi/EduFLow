import { ScheduleManagement } from '../../components/schedule-management';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

export default function SchedulesPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Buat template jadwal, ubah jadwal aktif, dan generate agenda harian sebagai dasar presensi."
          eyebrow="Schedule Management"
          title="Manajemen Jadwal"
        />

        <ScheduleManagement />
      </Container>
    </main>
  );
}
