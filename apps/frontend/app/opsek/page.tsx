'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Container } from '../../components/ui/container';
import { PageHeader } from '../../components/ui/page-header';
import { getPrimaryRole, type UserRole } from '../../lib/navigation.config';
import { getCurrentSessionUser } from '../../lib/session';

const operatorMenus = [
  {
    href: '/opsek/akademik',
    title: 'Kelas & Mata Pelajaran',
    description: 'Tambah/hapus rombel dan mapel secara fleksibel.',
    icon: 'A',
  },
  {
    href: '/opsek/guru',
    title: 'Manajemen Guru',
    description: 'Akun login, role, mapel ampu, dan wali kelas.',
    icon: 'G',
  },
  {
    href: '/opsek/akses',
    title: 'User & Hak Akses',
    description: 'User sistem, role, permission, nonaktif, dan hapus.',
    icon: 'U',
    roles: ['root'] as UserRole[],
  },
  {
    href: '/opsek/schedules',
    title: 'Setup Jadwal',
    description: 'Susun jadwal kelas keseluruhan berdasarkan kelas, guru, dan mapel.',
    icon: 'J',
  },
  {
    href: '/opsek/import-data',
    title: 'Import Data',
    description: 'Import data massal guru dan siswa dari Excel.',
    icon: 'I',
  },
  {
    href: '/opsek/audit',
    title: 'Audit Trail',
    description: 'Pantau perubahan penting oleh pengguna sistem.',
    icon: 'L',
  },
  {
    href: '/opsek/telegram',
    title: 'Telegram',
    description: 'Setting webhook, cek koneksi bot, dan pantau log notifikasi Telegram.',
    icon: 'T',
    roles: ['root'] as UserRole[],
  },
];

export default function AdminPage() {
  const [role, setRole] = useState<UserRole>('guru');

  useEffect(() => {
    setRole(getPrimaryRole(getCurrentSessionUser()?.roles ?? []));
  }, []);

  const visibleMenus = operatorMenus.filter(
    (menu) => !('roles' in menu) || !menu.roles?.length || menu.roles.includes(role),
  );

  return (
    <main>
      <Container>
        <PageHeader
          description="Pilih master data akademik, jadwal, import, dan audit dari area Operator Sekolah."
          eyebrow="Admin Data"
          title="Master Administrasi"
        />

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleMenus.map((menu) => (
            <Link
              className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-lg"
              href={menu.href}
              key={menu.href}
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-600 text-lg font-black text-white shadow-lg">
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
