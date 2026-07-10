import { TelegramOperationsCenter } from '../../../components/telegram-operations-center';
import { Container } from '../../../components/ui/container';
import { PageHeader } from '../../../components/ui/page-header';

export default function AdminTelegramPage() {
  return (
    <main>
      <Container>
        <PageHeader
          description="Pantau koneksi bot, pasang webhook, dan cek riwayat notifikasi Telegram."
          eyebrow="Admin Telegram"
          title="Setting & Monitoring Telegram"
        />
        <TelegramOperationsCenter />
      </Container>
    </main>
  );
}
