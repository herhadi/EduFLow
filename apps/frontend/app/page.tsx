import Link from 'next/link';
import { ThemeToggle } from '../components/ui/theme-toggle';

const newsItems = [
  {
    title: 'Monitoring KBM Harian',
    date: 'Hari ini',
    description:
      'Sekolah dapat memantau kelas berlangsung, presensi siswa, dan guru yang belum submit.',
  },
  {
    title: 'Informasi Untuk Wali Murid',
    date: 'Terbaru',
    description:
      'Ringkasan kehadiran anak dan notifikasi sekolah akan tersedia melalui Parent Portal.',
  },
  {
    title: 'Laporan Kepala Sekolah',
    date: 'Mingguan',
    description:
      'Rekap guru mengajar, kelas kosong, dan performa operasional siap dievaluasi berkala.',
  },
];

const highlights = [
  'Presensi siswa',
  'Reminder guru',
  'Notifikasi wali murid',
  'Dashboard kepala sekolah',
];

export default function LandingPage() {
  return (
    <main className="app-backdrop min-h-dvh px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-5xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <Link className="flex items-center gap-3" href="/">
            <span className="grid size-11 place-items-center rounded-2xl bg-brand-600 text-xl font-black text-white shadow-lg shadow-blue-200">
              E
            </span>
            <span>
              <span className="block text-lg font-black leading-none text-ink">
                EduFlow
              </span>
              <span className="mt-1 block text-xs font-semibold text-muted">
                Sistem KBM Sekolah
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <Link className="secondary-button rounded-full px-4 py-2 text-sm font-bold" href="/login">
              Masuk
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="inline-flex rounded-full bg-brand-50 px-4 py-2 text-xs font-black tracking-[0.12em] text-brand-700 uppercase">
              Portal Informasi Sekolah
            </p>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-ink sm:text-6xl">
              Monitoring KBM sekolah dalam satu genggaman.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              EduFlow membantu sekolah memantau jadwal, presensi, aktivitas guru,
              notifikasi wali murid, dan laporan operasional harian secara rapi.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                className="rounded-2xl bg-brand-600 px-6 py-4 text-center text-sm font-black text-white shadow-xl shadow-blue-200 transition hover:bg-brand-700"
                href="/login"
              >
                Masuk Sistem EduFlow
              </Link>
              <Link
                className="rounded-2xl border border-blue-100 bg-white px-6 py-4 text-center text-sm font-black text-brand-700 shadow-sm shadow-blue-100 transition hover:bg-brand-50"
                href="/parent-portal"
              >
                Cek Portal Orang Tua
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              {highlights.map((item) => (
                <span
                  className="rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-slate-600"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="surface-card rounded-[2rem] p-5">
            <div className="rounded-[1.5rem] bg-gradient-to-br from-brand-700 to-brand-600 p-5 text-white">
              <p className="text-sm font-semibold text-blue-100">
                Informasi Sekolah
              </p>
              <h2 className="mt-2 text-2xl font-black">SMP EduFlow Demo</h2>
              <p className="mt-2 text-sm leading-6 text-blue-100">
                Jl. Pendidikan No. 1 · Sekolah digital yang memprioritaskan
                transparansi KBM dan komunikasi orang tua.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {newsItems.map((item) => (
                <article
                  className="rounded-2xl border border-blue-50 bg-slate-50 p-4"
                  key={item.title}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 rounded-full bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">
                      {item.date}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
