import { Container } from '../../components/ui/container';
import { RoleDashboard } from '../../components/role-dashboard';

export default function DashboardPage() {
  return (
    <main className="py-8 sm:py-12">
      <Container>
        <RoleDashboard />
      </Container>
    </main>
  );
}
