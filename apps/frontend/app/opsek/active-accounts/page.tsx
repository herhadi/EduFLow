import { ActiveAccountDirectory } from '../../../components/active-account-directory';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function ActiveAccountsPage() {
  return (
    <main>
      <Container>
        <PageHeader
          description="Lihat daftar akun pengguna sekolah beserta username, email, role, dan status akses. Halaman ini hanya menyediakan akses baca dan cetak."
          eyebrow="Operator Sekolah"
          title="Akun & Akses"
        />
        <ActiveAccountDirectory audience="operator" />
      </Container>
    </main>
  );
}
