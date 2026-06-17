import { RoleDashboard } from '../../../components/role-dashboard';
import { Container } from '../../../components/ui/container';

export default function ParentDashboardPage() {
  return (
    <main className="py-8 sm:py-12">
      <Container>
        <RoleDashboard dashboardRole="orang_tua" />
      </Container>
    </main>
  );
}
