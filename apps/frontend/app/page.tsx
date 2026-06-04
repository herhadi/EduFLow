import { AcademicDashboard } from '../components/academic-dashboard';
import { Container } from '../components/ui/container';

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
        </header>

        <AcademicDashboard />
      </Container>
    </main>
  );
}

