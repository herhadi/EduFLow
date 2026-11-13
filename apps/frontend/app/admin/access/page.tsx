import { AdminAccessCenter } from '../../../components/admin-access-center';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function SchoolAdminAccessPage() {
  return (
    <main>
      <Container>
        <PageHeader
          description="Kelola akun pengguna, role sekolah, dan bantuan akses sesuai kewenangan Super Admin Sekolah."
          eyebrow="Administrasi Sistem Sekolah"
          title="Akun & Akses"
        />
        <AdminAccessCenter canAssignRootRole={false} />
      </Container>
    </main>
  );
}
