import { RoleDashboard } from '../../../components/role-dashboard';
import { Container } from '../../../components/ui/container';

export default function TeacherDashboardPage() {
  return (
    <main className="py-8 sm:py-12">
      <Container>
        <RoleDashboard />
      </Container>
    </main>
  );
}
