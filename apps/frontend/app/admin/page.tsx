import { AdminAccessCenter } from '../../components/admin-access-center';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

export default function AdminPage() {
  return (
    <main>
      <Container>
        <PageHeader
          description="Kelola actor, role, permission, dan aksi administratif aman seperti menonaktifkan guru tanpa merusak histori akademik."
          eyebrow="Admin Center"
          title="Manajemen Akses & Data"
        />

        <AdminAccessCenter />
      </Container>
    </main>
  );
}
