import Link from 'next/link';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';

const adminMenus = [
  {
    href: '/admin/guru',
    title: 'Manajemen Guru',
    description: 'Akun login, role, mapel ampu, dan wali kelas.',
    icon: 'G',
  },
  {
    href: '/admin/akademik',
    title: 'Kelas & Mata Pelajaran',
    description: 'Tambah/hapus rombel dan mapel secara fleksibel.',
    icon: 'A',
  },
  {
    href: '/admin/akses',
    title: 'User & Hak Akses',
    description: 'User sistem, role, permission, nonaktif, dan hapus.',
    icon: 'U',
  },
  {
    href: '/schedules',
    title: 'Jadwal Pelajaran',
    description: 'Susun jadwal berdasarkan kelas, guru, dan mapel.',
    icon: 'J',
  },
  {
    href: '/import-data',
    title: 'Import Data',
    description: 'Import guru, siswa, kelas, mapel, dan jadwal.',
    icon: 'I',
  },
  {
    href: '/audit',
    title: 'Audit Trail',
    description: 'Pantau perubahan penting oleh pengguna sistem.',
    icon: 'L',
  },
];

export default function AdminPage() {
  return (
    <main>
      <Container>
        <PageHeader
          description="Pilih area administrasi agar tiap domain tetap terpisah, mudah dirawat, dan nyaman digunakan di mobile."
          eyebrow="Admin Center"
          title="Administrasi EduFlow"
        />

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {adminMenus.map((menu) => (
            <Link
              className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60 transition hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-lg"
              href={menu.href}
              key={menu.href}
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-600 text-lg font-black text-white shadow-lg shadow-blue-100">
                {menu.icon}
              </span>
              <h2 className="mt-4 text-lg font-black text-slate-900">{menu.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{menu.description}</p>
              <p className="mt-4 text-xs font-black text-brand-700">Buka menu →</p>
            </Link>
          ))}
        </section>
      </Container>
    </main>
  );
}
