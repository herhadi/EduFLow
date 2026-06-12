import { AdminAccessCenter } from '../../../components/admin-access-center';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function AdminAccessPage() {
  return (
    <main>
      <Container>
        <PageHeader
          description="Kelola user, role, permission, serta status akun sistem."
          eyebrow="Admin Akses"
          title="User & Hak Akses"
        />
        <AdminAccessCenter />
      </Container>
    </main>
  );
}
