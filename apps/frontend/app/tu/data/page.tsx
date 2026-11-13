import { AcademicMasterManagement } from '../../../components/academic-master-management';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function TuDataPage() {
  return (
    <main>
      <Container>
        <PageHeader
          description="Kelola master kelas dan mata pelajaran untuk mendukung administrasi data sekolah. Pengaturan kalender, jadwal, dan jam KBM tetap menjadi kewenangan Operator Sekolah."
          eyebrow="Administrasi Tata Usaha"
          title="Master Data Sekolah"
        />
        <AcademicMasterManagement showTimeSlots={false} />
      </Container>
    </main>
  );
}
