import { ScheduleManagement } from '../../components/schedule-management';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

export default function SchedulesPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Area admin untuk membuat template jadwal keseluruhan, mengubah jadwal aktif, dan generate agenda harian sebagai dasar presensi."
          eyebrow="Admin Schedule Setup"
          title="Setup Jadwal Kelas"
        />

        <ScheduleManagement />
      </Container>
    </main>
  );
}
