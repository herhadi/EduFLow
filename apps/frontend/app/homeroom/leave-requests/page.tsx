import { StudentLeaveReview } from '../../../components/student-leave-review';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function HomeroomLeaveRequestsPage() {
  return (
    <main className="py-8 sm:py-12">
      <Container>
        <PageHeader
          description="Review pengajuan izin atau sakit siswa kelas binaan."
          eyebrow="Wali Kelas"
          showBackLink={false}
          title="Pengajuan Izin/Sakit"
        />
        <StudentLeaveReview />
      </Container>
    </main>
  );
}
