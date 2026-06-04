import { NotificationCenter } from '../../components/notification-center';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

export default function NotificationsPage() {
  return (
    <main className="py-10">
      <Container>
        <PageHeader
          description="Pantau notifikasi terkirim, gagal, antrean retry, dan template pesan operasional sekolah."
          eyebrow="Notification Center"
          title="Pusat Notifikasi"
        />

        <NotificationCenter />
      </Container>
    </main>
  );
}
