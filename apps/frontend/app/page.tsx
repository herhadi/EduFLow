const highlights = [
  ['Agenda hari ini', '0', 'Jadwal yang perlu dipantau'],
  ['Kelas aktif', '0', 'KBM sedang berlangsung'],
  ['Perlu tindakan', '0', 'Kelas kosong atau presensi tertunda'],
];

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

        <section
          className="mt-12 grid gap-4 sm:grid-cols-3"
          aria-label="Ringkasan monitoring"
        >
          {highlights.map(([title, value, description]) => (
            <article
              className="grid gap-2.5 rounded-2xl border border-slate-200 bg-white p-6"
              key={title}
            >
              <p>{title}</p>
              <strong className="text-4xl text-brand-600">{value}</strong>
              <span className="text-sm leading-5 text-muted">{description}</span>
            </article>
          ))}
        </section>
      </Container>
    </main>
  );
}
import { Container } from '../components/ui/container';

