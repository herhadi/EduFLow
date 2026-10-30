import { TeacherRoleManagement } from '../../../components/teacher-role-management';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function AdminTeacherPage() {
  return (
    <main>
      <Container>
        <PageHeader
          description="Atur akun login, role, mata pelajaran yang diampu, dan kelas binaan guru."
          eyebrow="Admin Guru"
          title="Manajemen Guru"
        />
        <TeacherRoleManagement />
      </Container>
    </main>
  );
}
