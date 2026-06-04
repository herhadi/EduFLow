import Link from 'next/link';
import { NotificationCenter } from '../../components/notification-center';
import { Container } from '../../components/ui/container';

export default function NotificationsPage() {
  return (
    <main className="py-10">
      <Container>
        <Link
          className="text-sm font-semibold text-brand-700 hover:text-brand-600"
          href="/"
        >
          ← Kembali ke dashboard
        </Link>

        <header className="mt-8 max-w-3xl">
          <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
            Notification Center
          </p>
          <h1 className="my-2 text-4xl font-bold tracking-tight sm:text-6xl">
            Pusat Notifikasi
          </h1>
          <p className="text-lg leading-7 text-slate-600">
            Pantau notifikasi terkirim, gagal, antrean retry, dan template pesan
            operasional sekolah.
          </p>
        </header>

        <NotificationCenter />
      </Container>
    </main>
  );
}
