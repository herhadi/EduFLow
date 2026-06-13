'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPrimaryRole, type UserRole } from '../lib/navigation.config';
import { OperationalDashboard } from './operational-dashboard';
import { PageHeader } from './ui/page-header';

type CurrentUser = {
  name?: string;
  roles?: string[];
  username?: string | null;
};

export function RoleDashboard() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');

    if (!storedUser) {
      return;
    }

    try {
      const user = JSON.parse(storedUser) as CurrentUser;
      setCurrentUser(user);
      setRole(getPrimaryRole(user.roles ?? []));
    } catch {
      localStorage.removeItem('currentUser');
    }
  }, []);

  if (!role) {
    return (
      <div className="rounded-[2rem] border border-blue-100 bg-white p-5 text-sm font-semibold text-muted shadow-sm shadow-blue-100/60">
        Menyiapkan beranda sesuai akun...
      </div>
    );
  }

  if (role === 'guru' || role === 'wali_kelas') {
    return (
      <TeacherHome
        currentUser={currentUser}
        isHomeroom={currentUser?.roles?.includes('wali_kelas') ?? false}
      />
    );
  }

  if (role === 'orang_tua') {
    return <ParentHome currentUser={currentUser} />;
  }

  return (
    <>
      <PageHeader
        description={getMonitoringDescription(role)}
        eyebrow="EduFlow"
        showBackLink={false}
        title={getMonitoringTitle(role)}
      />
      <OperationalDashboard />
    </>
  );
}

function TeacherHome({
  currentUser,
  isHomeroom,
}: {
  currentUser: CurrentUser | null;
  isHomeroom: boolean;
}) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'Guru';

  return (
    <>
      <PageHeader
        description="Lihat agenda mengajar, buka kelas, isi presensi, dan lanjutkan pekerjaan akademik pribadi."
        eyebrow="Beranda Guru"
        showBackLink={false}
        title={`Selamat datang, ${displayName}`}
      />

      <section className="mt-7 space-y-4">
        <div className="rounded-[2rem] bg-gradient-to-br from-brand-700 to-brand-600 p-5 text-white shadow-xl shadow-blue-200">
          <p className="text-sm font-bold text-blue-100">Agenda Hari Ini</p>
          <h2 className="mt-2 text-2xl font-black">Siap untuk kegiatan belajar mengajar</h2>
          <p className="mt-2 text-sm leading-6 text-blue-100">
            Jadwal personal akan tampil berdasarkan akun guru, mapel ampu, dan agenda harian.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <TeacherAction href="/teacher/schedules" label="Jadwal Saya" />
            <TeacherAction href="/teacher/attendance" label="Buka Presensi" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <TeacherCard
            description="Program Tahunan, Program Semester, KKTP, perencanaan pembelajaran, dan buku KBM."
            label="Perangkat Ajar"
          />
          <TeacherCard
            description="Input dan pantau nilai siswa untuk kelas serta mapel yang diampu."
            label="Penilaian"
          />
          {isHomeroom ? (
            <TeacherCard
              description="Pantau presensi, ringkasan, dan tindak lanjut siswa kelas binaan."
              label="Kelas Binaan"
            />
          ) : null}
          <TeacherCard
            description="Lihat pengumuman, reminder kelas, dan permintaan revisi."
            href="/notifications"
            label="Notifikasi"
          />
        </div>
      </section>
    </>
  );
}

function ParentHome({ currentUser }: { currentUser: CurrentUser | null }) {
  return (
    <>
      <PageHeader
        description="Pantau kehadiran anak, ringkasan harian, dan riwayat presensi."
        eyebrow="Portal Orang Tua"
        showBackLink={false}
        title={`Halo, ${currentUser?.name ?? 'Wali Murid'}`}
      />
      <div className="mt-6">
        <TeacherAction href="/parent-portal" label="Lihat Data Anak" />
      </div>
    </>
  );
}

function TeacherAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="rounded-2xl bg-white/15 px-4 py-4 text-center text-sm font-black text-white backdrop-blur transition hover:bg-white/25"
      href={href}
    >
      {label}
    </Link>
  );
}

function TeacherCard({
  description,
  href,
  label,
}: {
  description: string;
  href?: string;
  label: string;
}) {
  const content = (
    <>
      <h2 className="text-lg font-black text-slate-900">{label}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </>
  );

  return href ? (
    <Link
      className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60 transition hover:border-brand-600"
      href={href}
    >
      {content}
    </Link>
  ) : (
    <article className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60">
      {content}
    </article>
  );
}

function getMonitoringTitle(role: UserRole) {
  if (role === 'operator_sekolah') {
    return 'Operasional Sekolah Hari Ini';
  }

  if (role === 'kepala_sekolah') {
    return 'Monitoring Sekolah';
  }

  if (role === 'tu') {
    return 'Administrasi Sekolah';
  }

  if (role === 'bk') {
    return 'Monitoring Siswa';
  }

  return 'Monitoring Sistem';
}

function getMonitoringDescription(role: UserRole) {
  if (role === 'root') {
    return 'Ringkasan teknis dan operasional untuk akses root.';
  }

  return 'Ringkasan kegiatan sekolah disesuaikan dengan tanggung jawab pengguna.';
}
