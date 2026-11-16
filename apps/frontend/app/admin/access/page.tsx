import { AdminAccessCenter } from '../../../components/admin-access-center';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function SchoolAdminAccessPage() {
  return (
    <main>
      <Container>
        <PageHeader
          description="Kelola seluruh akun sekolah, termasuk seluruh akun guru, serta atur role dan akses sesuai kewenangan Super Admin Sekolah."
          eyebrow="Administrasi Sistem Sekolah"
          title="Akun & Akses"
        />
        <AdminAccessCenter canAssignRootRole={false} />
      </Container>
    </main>
  );
}
