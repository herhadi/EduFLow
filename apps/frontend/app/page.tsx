import { AcademicDashboard } from '../components/academic-dashboard';
import { Container } from '../components/ui/container';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="py-16">
      <Container>
        <header className="max-w-2xl">
          <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
            School Academic Monitoring
          </p>
          <h1 className="my-2 text-5xl font-bold tracking-tight sm:text-7xl">
            EduFlow
          </h1>
          <p className="text-lg leading-7 text-slate-600">
            Pantau kegiatan belajar mengajar dengan alur yang rapi dan sederhana.
          </p>
          <Link
            className="mt-6 inline-flex rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            href="/master-data"
          >
            Buka Master Data
          </Link>
          <Link
            className="mt-3 ml-3 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            href="/schedules"
          >
            Kelola Jadwal
          </Link>
          <Link
            className="mt-3 ml-3 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            href="/notifications"
          >
            Pusat Notifikasi
          </Link>
        </header>

        <AcademicDashboard />
      </Container>
    </main>
  );
}
