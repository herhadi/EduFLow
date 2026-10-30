import { AcademicCalendarManagement } from '../../../../components/academic-calendar-management';
import { Container } from '../../../../components/ui/container';
import { PageHeader } from '../../../../components/ui/page-header';

export default function AcademicCalendarPage() {
  return (
    <main>
      <Container>
        <PageHeader
          description="Tandai libur, ujian, kegiatan sekolah, dan hari non-KBM sebagai acuan agenda harian."
          eyebrow="Admin Akademik"
          title="Kalender Pendidikan"
        />
        <AcademicCalendarManagement />
      </Container>
    </main>
  );
}
