import { ScheduleManagement } from '../../../components/schedule-management';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function OperatorSchedulesPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader description="Kelola jadwal kelas dan tinjau ringkasan jadwal mingguan setiap kelas." eyebrow="Operator Sekolah" title="Jadwal Kelas" />
        <ScheduleManagement />
      </Container>
    </main>
  );
}
