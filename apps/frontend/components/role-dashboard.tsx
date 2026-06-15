'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';
import { getPrimaryRole, type UserRole } from '../lib/navigation.config';
import { OperationalDashboard } from './operational-dashboard';
import { PageHeader } from './ui/page-header';
import { UserAvatar } from './ui/user-avatar';

type CurrentUser = {
  name?: string;
  roles?: string[];
  username?: string | null;
};

export function RoleDashboard() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [teacherPhotoUrl, setTeacherPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');

    if (!storedUser) {
      return;
    }

    try {
      const user = JSON.parse(storedUser) as CurrentUser;
      setCurrentUser(user);
      setRole(getPrimaryRole(user.roles ?? []));
      if (user.roles?.some((roleName) => roleName === 'guru' || roleName === 'wali_kelas')) {
        void import('../lib/api').then(({ api }) => api.getMyTeacherProfile()).then((response) => setTeacherPhotoUrl(response.data.photoUrl ?? null)).catch(() => undefined);
      }
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
        photoUrl={teacherPhotoUrl}
      />
    );
  }

  if (role === 'operator_sekolah') {
    return <OperatorHome currentUser={currentUser} />;
  }

  if (role === 'kepala_sekolah') {
    return <PrincipalHome currentUser={currentUser} />;
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

function OperatorHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'Operator';

  return (
    <>
      <RoleHero
        description="Kelola data akademik, susun jadwal, dan pastikan kebutuhan operasional sekolah siap digunakan."
        eyebrow="Operator Sekolah"
        title={`Selamat bekerja, ${displayName}`}
      />
      <RoleSection
        description="Pekerjaan yang paling sering dilakukan operator."
        title="Akses Cepat"
      >
        <RoleActionCard href="/schedules" icon="◷" label="Susun Jadwal" description="Atur jadwal kelas berdasarkan hari, jam, guru, dan mata pelajaran." priority />
        <RoleActionCard href="/admin/guru" icon="♙" label="Kelola Guru" description="Atur akun, role, mapel ampu, dan wali kelas." />
        <RoleActionCard href="/admin/akademik" icon="▦" label="Data Akademik" description="Kelola tahun ajaran, semester, kelas, dan mata pelajaran." />
        <RoleActionCard href="/import-data" icon="⇧" label="Import Data" description="Masukkan data guru dan siswa dari file Excel." />
      </RoleSection>
      <RoleSection description="Kontrol administratif yang tidak perlu dibuka setiap hari." title="Administrasi">
        <RoleActionCard href="/admin/akses" icon="⚿" label="Akun & Akses" description="Kelola akun pengguna sekolah dan status aksesnya." />
        <RoleActionCard href="/notifications" icon="✦" label="Notifikasi" description="Pantau pesan pending, terkirim, dan gagal." />
        <RoleActionCard href="/audit" icon="◇" label="Aktivitas" description="Lihat perubahan penting yang terjadi di sistem." />
        <RoleActionCard href="/reports" icon="▣" label="Laporan" description="Export rekap sekolah ke Excel atau PDF." />
      </RoleSection>
    </>
  );
}

function PrincipalHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'Kepala Sekolah';

  return (
    <>
      <RoleHero
        description="Pantau kualitas pembelajaran, tindak lanjuti pekerjaan yang menunggu persetujuan, dan evaluasi kinerja sekolah."
        eyebrow="Kepala Sekolah"
        title={`Selamat datang, ${displayName}`}
      />
      <RoleSection description="Hal yang membutuhkan perhatian dan keputusan kepala sekolah." title="Perlu Tindakan">
        <RoleActionCard href="/principal/review" icon="✓" label="Pusat Review" description="Review perangkat ajar dan penilaian semester yang diajukan guru." priority />
        <RoleActionCard href="/notifications" icon="✦" label="Inbox Kepala Sekolah" description="Lihat kelas kosong, guru belum submit, koreksi, dan pengajuan approval." />
      </RoleSection>
      <RoleSection description="Ringkasan untuk evaluasi dan pengambilan keputusan." title="Monitoring Sekolah">
        <RoleActionCard href="/teacher-performance" icon="◈" label="Performa Guru" description="Bandingkan sesi mengajar, keterlambatan submit, dan kelas kosong." />
        <RoleActionCard href="/reports" icon="▣" label="Laporan Sekolah" description="Lihat dan export rekap kehadiran serta kegiatan belajar mengajar." />
        <RoleActionCard href="/audit" icon="◇" label="Jejak Aktivitas" description="Telusuri aktivitas penting untuk kebutuhan supervisi." />
      </RoleSection>
    </>
  );
}

function TeacherHome({
  currentUser,
  isHomeroom,
  photoUrl,
}: {
  currentUser: CurrentUser | null;
  isHomeroom: boolean;
  photoUrl?: string | null;
}) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'Guru';

  return (
    <>
      <section className="page-hero relative w-full overflow-hidden rounded-[2rem] border border-blue-100/70 p-5 shadow-sm shadow-blue-100/60 sm:p-7">
        <div className="flex items-center gap-4 sm:gap-5">
          <UserAvatar className="size-20 sm:size-24" name={displayName} photoUrl={photoUrl} />
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">{isHomeroom ? 'Guru & Wali Kelas' : 'Guru'}</p>
            <h1 className="mt-2 truncate text-2xl font-black tracking-tight sm:text-4xl">Halo, {displayName}</h1>
            <p className="mt-2 text-sm leading-6 text-muted">Lihat jadwal pribadi, buka presensi, dan selesaikan pekerjaan akademik Anda.</p>
          </div>
        </div>
      </section>

      <section className="mt-7 space-y-4">
        <div className="rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-600 to-blue-500 p-5 text-white shadow-xl shadow-blue-200 sm:p-7">
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

        <RoleSection description="Menu personal berdasarkan kelas dan mata pelajaran yang Anda ampu." title="Pekerjaan Saya">
          <TeacherCard
            description="Program Tahunan, Program Semester, KKTP, perencanaan pembelajaran, dan buku KBM."
            href="/teacher/teaching-plans"
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
        </RoleSection>
      </section>
    </>
  );
}

function RoleHero({ description, eyebrow, title }: { description: string; eyebrow: string; title: string }) {
  return <PageHeader description={description} eyebrow={eyebrow} showBackLink={false} title={title} />;
}

function RoleSection({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section className="mt-7">
      <div className="mb-4">
        <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  );
}

function RoleActionCard({ description, href, icon, label, priority = false }: { description: string; href: string; icon: string; label: string; priority?: boolean }) {
  return (
    <Link className={priority ? 'group rounded-[1.75rem] bg-gradient-to-br from-brand-700 to-brand-600 p-5 text-white shadow-xl shadow-blue-200 transition hover:-translate-y-0.5' : 'group rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60 transition hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-lg'} href={href}>
      <span className={priority ? 'grid size-11 place-items-center rounded-2xl bg-white/15 text-xl' : 'grid size-11 place-items-center rounded-2xl bg-brand-50 text-xl text-brand-700'}>{icon}</span>
      <h3 className={priority ? 'mt-4 text-lg font-black text-white' : 'mt-4 text-lg font-black text-slate-900'}>{label}</h3>
      <p className={priority ? 'mt-2 text-sm leading-6 text-blue-100' : 'mt-2 text-sm leading-6 text-muted'}>{description}</p>
      <span className={priority ? 'mt-4 inline-flex text-xs font-black text-white' : 'mt-4 inline-flex text-xs font-black text-brand-700'}>Buka menu →</span>
    </Link>
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
