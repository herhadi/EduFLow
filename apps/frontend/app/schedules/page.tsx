import { ScheduleManagement } from '../../components/schedule-management';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

export default function SchedulesPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          showBackLink={false}
          description="Area admin untuk membuat template jadwal keseluruhan, mengubah jadwal aktif, dan generate agenda harian sebagai dasar presensi."
          eyebrow="Admin Schedule Setup"
          title="Setup Jadwal Kelas"
        />

        <ScheduleManagement dashboardHref="/dashboard" />
      </Container>
    </main>
  );
}
