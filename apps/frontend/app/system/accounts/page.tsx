import { RootAccountManagement } from '../../../components/root-account-management';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function SystemAccountsPage() {
  return <main className="py-8 sm:py-12"><Container><PageHeader description="Kelola siklus hidup akun sistem. Penghapusan permanen hanya tersedia untuk Root." eyebrow="Root · Administrasi Sistem" title="Kelola Akun Sistem" /><RootAccountManagement /></Container></main>;
}
