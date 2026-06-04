import Link from 'next/link';
import { MasterDataDashboard } from '../../components/master-data-dashboard';
import { Container } from '../../components/ui/container';

export default function MasterDataPage() {
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
            Academic Master Data
          </p>
          <h1 className="my-2 text-4xl font-bold tracking-tight sm:text-6xl">
            Master Data Akademik
          </h1>
          <p className="text-lg leading-7 text-slate-600">
            Kelola fondasi data akademik secara bertahap: guru, siswa, kelas,
            mata pelajaran, dan tahun ajaran.
          </p>
        </header>

        <MasterDataDashboard />
      </Container>
    </main>
  );
}
