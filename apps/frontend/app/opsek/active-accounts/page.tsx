import { ActiveAccountDirectory } from '../../../components/active-account-directory';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function ActiveAccountsPage() {
  return (
    <main>
      <Container>
        <PageHeader
          description="Lihat informasi akun pengguna sekolah yang belum dinonaktifkan. Halaman ini hanya menyediakan akses baca dan cetak."
          eyebrow="Operator Sekolah"
          title="Daftar Akun Aktif"
        />
        <ActiveAccountDirectory audience="operator" />
      </Container>
    </main>
  );
}
