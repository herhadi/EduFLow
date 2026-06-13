import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';
import { TeacherScheduleList } from '../../../components/teacher-schedule-list';

export default function TeacherSchedulesPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Halaman ini disiapkan untuk jadwal mengajar guru yang sedang login. Setup jadwal keseluruhan tetap dikelola operator sekolah."
          eyebrow="Guru"
          title="Jadwal Saya"
        />

        <TeacherScheduleList />
      </Container>
    </main>
  );
}
