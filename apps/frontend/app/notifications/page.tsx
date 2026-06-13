import { NotificationCenter } from '../../components/notification-center';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

export default function NotificationsPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Konten halaman otomatis disesuaikan dengan role: inbox personal untuk guru dan pusat delivery untuk pengelola notifikasi."
          eyebrow="Notifikasi"
          title="Pusat Pemberitahuan"
        />

        <NotificationCenter />
      </Container>
    </main>
  );
}
