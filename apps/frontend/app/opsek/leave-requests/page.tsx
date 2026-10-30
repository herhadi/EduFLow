import { StudentLeaveReview } from '../../../components/student-leave-review';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function AdminLeaveRequestsPage() {
  return (
    <main className="py-8 sm:py-12">
      <Container>
        <PageHeader
          description="Review pengajuan izin atau sakit siswa dari wali murid."
          eyebrow="Operator Sekolah"
          showBackLink={false}
          title="Pengajuan Izin/Sakit"
        />
        <StudentLeaveReview />
      </Container>
    </main>
  );
}
