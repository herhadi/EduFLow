import { RoleDashboard } from '../../../components/role-dashboard';
import { Container } from '../../../components/ui/container';

export default function AdminDashboardPage() {
  return (
    <main className="py-8 sm:py-12">
      <Container>
        <RoleDashboard dashboardRole="operator_sekolah" />
      </Container>
    </main>
  );
}
