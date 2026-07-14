import { ParentLeaveRequests } from '../../../components/parent-leave-requests';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function ParentPermitsPage() {
  return (
    <main className="py-8 sm:py-12">
      <Container>
        <PageHeader
          description="Ajukan izin atau sakit anak, lalu pantau status review dari wali kelas/operator."
          eyebrow="Izin/Sakit"
          showBackLink={false}
          title="Pengajuan Izin Anak"
        />
        <ParentLeaveRequests />
      </Container>
    </main>
  );
}
