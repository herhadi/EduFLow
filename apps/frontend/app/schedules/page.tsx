import Link from 'next/link';
import { ScheduleManagement } from '../../components/schedule-management';
import { Container } from '../../components/ui/container';

export default function SchedulesPage() {
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
            Schedule Management
          </p>
          <h1 className="my-2 text-4xl font-bold tracking-tight sm:text-6xl">
            Manajemen Jadwal
          </h1>
          <p className="text-lg leading-7 text-slate-600">
            Buat template jadwal, ubah jadwal aktif, dan generate agenda harian
            sebagai dasar presensi.
          </p>
        </header>

        <ScheduleManagement />
      </Container>
    </main>
  );
}
