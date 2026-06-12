import { AcademicMasterManagement } from '../../../components/academic-master-management';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function AdminAcademicPage() {
  return (
    <main>
      <Container>
        <PageHeader
          description="Kelola rombongan belajar dan mata pelajaran secara fleksibel sesuai kondisi sekolah."
          eyebrow="Admin Akademik"
          title="Kelas & Mata Pelajaran"
        />
        <AcademicMasterManagement />
      </Container>
    </main>
  );
}
