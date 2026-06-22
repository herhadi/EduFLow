import Link from 'next/link';
import { SchoolActivityCarousel } from '../components/school-activity-carousel';
import { ThemeToggle } from '../components/ui/theme-toggle';

const navigationItems = [
  'Profil',
  'Informasi',
  'PPDB',
  'Berita',
  'Galeri',
  'Kontak',
];

const cmsFeatures = [
  {
    icon: 'T',
    title: 'Tailwind CSS',
    description:
      'Tampilan bersih, responsif, dan mudah dikembangkan untuk kebutuhan website sekolah modern.',
  },
  {
    icon: 'I',
    title: 'Ikon Konsisten',
    description:
      'Arah visual disiapkan untuk ikon tajam dan seragam pada menu, tombol, serta kartu informasi.',
  },
  {
    icon: 'C',
    title: 'CMS Friendly',
    description:
      'Struktur halaman mendukung konten sekolah seperti profil, berita, pengumuman, PPDB, dan galeri.',
  },
  {
    icon: 'L',
    title: 'Ringan & Fleksibel',
    description:
      'Tanpa pola Bootstrap yang berat, halaman tetap cepat dibuka dan nyaman di perangkat mobile.',
  },
];

const schoolHighlights = [
  'Profil sekolah',
  'Pengumuman online',
  'Berita kegiatan',
  'Galeri foto',
  'Portal orang tua',
  'Login operator',
];

const ppdbSteps = ['Data calon siswa', 'Upload berkas', 'Verifikasi panitia'];

const commentExamples = [
  {
    author: 'Wali Murid',
    message: 'Info jadwal kegiatan sekolahnya mudah dilihat dan jelas.',
  },
  {
    author: 'Admin Sekolah',
    message: 'Pengumuman terbaru sudah terbit di portal informasi.',
  },
];

const activityItems = [
  'Komentar baru masuk',
  'Pengumuman PPDB diperbarui',
  'Galeri kegiatan ditambahkan',
];

const newsItems = [
  {
    label: 'Informasi',
    title: 'Portal sekolah siap menjadi pusat publikasi resmi',
    description:
      'Masyarakat dapat mengakses profil sekolah, agenda, berita, pengumuman, dan layanan wali murid.',
  },
  {
    label: 'PPDB',
    title: 'Alur pendaftaran dapat dibuat bertahap dan mudah diikuti',
    description:
      'Konsep wizard membantu calon siswa dan wali murid memahami setiap langkah pendaftaran.',
  },
  {
    label: 'Layanan',
    title: 'Komunikasi sekolah lebih rapi dan terdokumentasi',
    description:
      'Informasi penting sekolah disajikan dalam tampilan ringkas, jelas, dan mudah dibaca.',
  },
];

const thumbnailItems = [
  {
    category: 'Kegiatan',
    title: 'Dokumentasi kegiatan belajar mengajar',
    href: '#kegiatan-kbm',
    tone: 'blue',
  },
  {
    category: 'Info Terbaru',
    title: 'Pengumuman sekolah untuk wali murid',
    href: '#pengumuman-sekolah',
    tone: 'green',
  },
  {
    category: 'PPDB',
    title: 'Informasi penerimaan peserta didik baru',
    href: '#ppdb',
    tone: 'amber',
  },
  {
    category: 'Prestasi',
    title: 'Capaian siswa dan kegiatan lomba',
    href: '#prestasi-siswa',
    tone: 'rose',
  },
  {
    category: 'Galeri',
    title: 'Momen sekolah dan aktivitas siswa',
    href: '#galeri-sekolah',
    tone: 'blue',
  },
];

const quickActions = [
  { href: '#ppdb', label: 'PPDB' },
  { href: '/parent-portal', label: 'Ortu' },
  { href: '#kontak', label: 'Kontak' },
  { href: '/login', label: 'Login' },
];

export default function LandingPage() {
  return (
    <main className="school-backdrop min-h-dvh overflow-x-hidden">
      <div className="school-landing-frame mx-auto min-h-dvh max-w-md overflow-x-hidden min-[600px]:my-3 min-[600px]:min-h-[calc(100dvh-1.5rem)] min-[600px]:w-[calc(100%-1rem)] min-[600px]:max-w-none min-[600px]:rounded-[1.25rem] md:w-[calc(100%-1.5rem)] xl:w-[calc(100%-2rem)]">
        <div className="school-top-strip px-4 py-2 text-xs font-semibold min-[600px]:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p>SMP Negeri 1 Pecalungan</p>
            <p>Website sekolah modern · ringan · mobile friendly</p>
          </div>
        </div>

        <header className="school-header sticky top-0 z-30 px-4 py-4 min-[600px]:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link className="flex min-w-0 items-center gap-3" href="/">
              <span className="school-brand-mark grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl p-1">
                <img
                  alt="Logo SMP Negeri 1 Pecalungan"
                  className="h-full w-full object-contain"
                  src="/logo_sekolah.webp"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-black leading-none text-ink sm:text-xl">
                  SMP Negeri 1 Pecalungan
                </span>
                <span className="mt-1 block truncate text-xs font-semibold text-muted">
                  Modern School CMS
                </span>
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              <nav className="school-nav-strip hidden items-center gap-1 lg:flex">
                {navigationItems.map((item) => (
                  <a
                    className="school-nav-link px-3 py-2"
                    href={`#${item.toLowerCase()}`}
                    key={item}
                  >
                    {item}
                  </a>
                ))}
              </nav>
              <ThemeToggle compact />
              <Link
                className="secondary-button rounded-full px-4 py-2 text-sm font-bold"
                href="/login"
              >
                Masuk
              </Link>
            </div>
          </div>

          <nav className="school-nav-strip no-scrollbar mt-4 flex gap-2 overflow-x-auto lg:hidden">
            {navigationItems.map((item) => (
              <a
                className="school-nav-link shrink-0 px-3 py-2"
                href={`#${item.toLowerCase()}`}
                key={item}
              >
                {item}
              </a>
            ))}
          </nav>
        </header>

        <section className="px-4 py-5 min-[600px]:px-6 lg:py-7">
          <div className="school-hero-banner overflow-hidden rounded-[1.25rem]">
            <div className="grid gap-4 p-6 md:grid-cols-[1.05fr_0.95fr] md:p-8 lg:p-7">
              <div className="flex min-h-[360px] flex-col justify-center">
                <p className="school-badge px-4 py-2 text-xs">
                  DESAIN HALAMAN INI HANYA UNTUK CONTOH
                </p>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-ink sm:text-5xl">
                  Website sekolah yang bersih, elegan, dan siap menjadi pusat informasi.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                  Tampilan depan SMP Negeri 1 Pecalungan dibuat seperti portal CMS
                  modern: ringan, responsif, punya komponen informasi lengkap,
                  dan tetap menyatu dengan sistem sekolah EduFlow.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link
                    className="school-primary-button px-6 py-4"
                    href="/parent-portal"
                  >
                    Portal Orang Tua
                  </Link>
                  <Link
                    className="secondary-button rounded-2xl px-6 py-4 text-center text-sm font-black"
                    href="/login"
                  >
                    Masuk Sistem
                  </Link>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="school-stat rounded-2xl px-4 py-3">
                    <p className="text-xs font-bold text-muted">Portal</p>
                    <p className="mt-1 font-black text-ink">CMS Modern</p>
                  </div>
                  <div className="school-stat rounded-2xl px-4 py-3">
                    <p className="text-xs font-bold text-muted">Konten</p>
                    <p className="mt-1 font-black text-ink">Aktif</p>
                  </div>
                  <div className="school-stat rounded-2xl px-4 py-3">
                    <p className="text-xs font-bold text-muted">Akses</p>
                    <p className="mt-1 font-black text-ink">Mobile</p>
                  </div>
                </div>
              </div>

              <div className="school-preview-shell rounded-[1.35rem] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="school-section-eyebrow">Preview Komponen</p>
                    <h2 className="mt-1 text-xl font-black text-ink">
                      CMS sekolah premium
                    </h2>
                  </div>
                  <div className="school-icon-tile">CMS</div>
                </div>

                <div className="mt-4 grid gap-3">
                  {ppdbSteps.map((item) => (
                    <div className="school-wizard-step" key={item}>
                      <p className="text-sm font-black text-ink">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.8fr]">
                  <div className="grid gap-3">
                    {commentExamples.map((item, index) => (
                      <div
                        className={
                          index === 0
                            ? 'school-chat-bubble p-4'
                            : 'school-chat-bubble-alt p-4'
                        }
                        key={item.author}
                      >
                        <p className="text-xs font-black text-brand-700">
                          {item.author}
                        </p>
                        <p className="mt-1 text-sm font-bold text-ink">
                          {item.message}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="school-menu-preview rounded-2xl p-4">
                    <p className="text-xs font-black text-muted">Modal Menu</p>
                    <div className="mt-3 grid gap-2">
                      <span className="h-2 rounded-full bg-brand-100" />
                      <span className="h-2 rounded-full bg-brand-100" />
                      <span className="h-2 rounded-full bg-brand-100" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.7fr]">
                  <div className="grid gap-2">
                    {activityItems.map((item) => (
                      <div className="school-activity-item rounded-2xl px-4 py-3" key={item}>
                        <p className="text-sm font-black text-ink">{item}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-2xl border p-4">
                    <p className="text-sm font-bold text-muted">
                      Loader fullscreen siap.
                    </p>
                    <span className="school-loader-preview size-10" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 px-4 pb-5 min-[600px]:px-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="school-cover-visual p-5 sm:p-6">
            <div className="school-cover-content flex h-full min-h-56 flex-col justify-end">
              <p className="text-xs font-black tracking-[0.14em] uppercase text-blue-100">
                Cover Sekolah
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Foto gedung atau kegiatan sekolah bisa tampil besar di sini.
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-blue-50">
                Saat foto asli tersedia, area ini tinggal diganti dengan asset
                sekolah agar landing terasa jauh lebih personal.
              </p>
            </div>
          </div>

          <article className="school-panel rounded-[1.25rem] p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-[0.45fr_1fr]">
              <div className="school-principal-avatar p-5">
                <img
                  alt=""
                  aria-hidden="true"
                  className="h-24 w-24 object-contain opacity-90"
                  src="/logo_sekolah.webp"
                />
              </div>
              <div>
                <p className="school-section-eyebrow">Sambutan Kepala Sekolah</p>
                <h2 className="school-section-title mt-2 text-2xl sm:text-3xl">
                  Selamat datang di gerbang digital SMP Negeri 1 Pecalungan.
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
                  Portal ini kami hadirkan sebagai ruang informasi resmi untuk
                  siswa, wali murid, alumni, dan masyarakat. Semoga layanan digital
                  sekolah membantu komunikasi menjadi lebih cepat, terbuka, dan
                  tertata.
                </p>
                <p className="mt-3 text-sm font-black text-ink">
                  Kepala SMP Negeri 1 Pecalungan
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="px-4 pb-5 min-[600px]:px-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="school-section-eyebrow">Kegiatan & Info Terbaru</p>
              <h2 className="school-section-title mt-2 text-2xl sm:text-3xl">
                Thumbnail bergerak yang bisa diklik
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted">
              Arahkan kursor untuk menghentikan gerakan, lalu klik thumbnail
              menuju detail kegiatan atau pengumuman.
            </p>
          </div>

          <SchoolActivityCarousel items={thumbnailItems} />
        </section>

        <section className="grid gap-4 px-4 pb-5 min-[600px]:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="school-panel rounded-[1.25rem] p-5 sm:p-6">
            <p className="school-section-eyebrow">Konten Sekolah</p>
            <h2 className="school-section-title mt-2 text-2xl sm:text-3xl">
              Semua informasi penting tampil dalam satu portal.
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {schoolHighlights.map((item) => (
                <div className="school-feature-card rounded-2xl px-4 py-3" key={item}>
                  <p className="font-black text-ink">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="school-panel rounded-[1.25rem] p-5 sm:p-6">
            <p className="school-section-eyebrow">Info Terkini</p>
            <h2 className="school-section-title mt-2 text-2xl sm:text-3xl">
              Berita, pengumuman, dan layanan digital
            </h2>
            <div className="mt-4 grid gap-3">
              {newsItems.map((item) => (
                <article
                  className="school-feature-card rounded-2xl p-4"
                  key={item.title}
                >
                  <p className="school-news-date">{item.label}</p>
                  <h3 className="mt-1 font-black text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-5 min-[600px]:px-6">
          <div className="school-panel rounded-[1.25rem] p-5 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="school-section-eyebrow">PPDB Wizard</p>
                <h2 className="school-section-title mt-2 text-2xl sm:text-3xl">
                  Alur pendaftaran dibuat lebih jelas untuk wali murid.
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
                  Konsep wizard membantu proses PPDB terasa terarah: isi data,
                  lengkapi berkas, lalu tunggu verifikasi panitia sekolah.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {ppdbSteps.map((item, index) => (
                  <div className="school-feature-card rounded-2xl p-4" key={item}>
                    <p className="school-news-date">Langkah {index + 1}</p>
                    <p className="mt-2 font-black text-ink">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 px-4 pb-5 min-[600px]:px-6 lg:grid-cols-4">
          {cmsFeatures.map((item) => (
            <article className="school-feature-card rounded-[1.25rem] p-5" key={item.title}>
              <div className="school-icon-tile">{item.icon}</div>
              <h2 className="mt-4 text-lg font-black text-ink">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {item.description}
              </p>
            </article>
          ))}
        </section>

        <footer className="school-footer px-4 py-6 min-[600px]:px-6">
          <div className="grid gap-4 md:grid-cols-[1fr_0.8fr_0.8fr]">
            <div>
              <p className="font-black text-ink">SMP Negeri 1 Pecalungan</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Portal informasi sekolah modern untuk profil, berita, PPDB,
                galeri, dan layanan wali murid.
              </p>
            </div>
            <div>
              <p className="font-black text-ink">Stack Tampilan</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Tailwind CSS · Next.js · Dark theme · Responsive layout
              </p>
            </div>
            <div>
              <p className="font-black text-ink">Akses Cepat</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link className="school-nav-link px-3 py-2" href="/parent-portal">
                  Portal Orang Tua
                </Link>
                <Link className="school-nav-link px-3 py-2" href="/login">
                  Login
                </Link>
              </div>
            </div>
          </div>
        </footer>

        <div aria-label="Akses cepat" className="school-floating-actions">
          {quickActions.map((item) => (
            <Link className="school-floating-action" href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
