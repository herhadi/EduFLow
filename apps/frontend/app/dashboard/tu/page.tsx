import { RoleDashboard } from '../../../components/role-dashboard';
import { Container } from '../../../components/ui/container';

export default function StaffDashboardPage() {
  return (
    <main className="py-8 sm:py-12">
      <Container>
        <RoleDashboard dashboardRole="tu" />
      </Container>
    </main>
  );
}
