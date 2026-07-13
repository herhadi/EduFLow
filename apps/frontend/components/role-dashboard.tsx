'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import {
  getDashboardPathForRole,
  getPrimaryRole,
  type UserRole,
} from '../lib/navigation.config';
import { OperationalDashboard } from './operational-dashboard';
import { PageHeader } from './ui/page-header';
import { UserAvatar } from './ui/user-avatar';

type CurrentUser = {
  id?: string;
  email?: string;
  name?: string;
  photoUrl?: string | null;
  roles?: string[];
  telegramId?: string | null;
  telegramLinkedAt?: string | null;
  username?: string | null;
};

export function RoleDashboard({
  dashboardRole,
}: {
  dashboardRole?: UserRole;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [teacherPhotoUrl, setTeacherPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');

    if (!storedUser) {
      setProfileChecked(true);
      return;
    }

    try {
      const user = JSON.parse(storedUser) as CurrentUser;
      setCurrentUser(user);
      setRole(getPrimaryRole(user.roles ?? []));
      setTeacherPhotoUrl(user.photoUrl ?? null);
      void import('../lib/api')
        .then(({ api }) => api.getMyProfile())
        .then((response) => {
          setCurrentUser(response.data);
          setTeacherPhotoUrl(response.data.photoUrl ?? null);
          localStorage.setItem('currentUser', JSON.stringify({ ...user, ...response.data }));
        })
        .catch(() => undefined)
        .finally(() => setProfileChecked(true));
    } catch {
      localStorage.removeItem('currentUser');
      setProfileChecked(true);
    }
  }, []);

  useEffect(() => {
    if (!role || dashboardRole) {
      return;
    }

    const dashboardPath = getDashboardPathForRole(role);

    if (dashboardPath !== '/dashboard' && dashboardPath !== pathname) {
      router.replace(dashboardPath);
    }
  }, [dashboardRole, pathname, role, router]);

  if (!role) {
    return (
      <div className="rounded-[2rem] border border-blue-100 bg-white p-5 text-sm font-semibold text-muted shadow-sm shadow-blue-100/60">
        Menyiapkan beranda sesuai akun...
      </div>
    );
  }

  const activeRole = dashboardRole ?? role;

  if (!dashboardRole && activeRole !== 'root' && pathname !== getDashboardPathForRole(activeRole)) {
    return (
      <div className="rounded-[2rem] border border-blue-100 bg-white p-5 text-sm font-semibold text-muted shadow-sm shadow-blue-100/60">
        Mengarahkan ke dashboard sesuai role...
      </div>
    );
  }

  if (activeRole === 'guru' || activeRole === 'wali_kelas') {
    return (
      <DashboardWithTelegramPrompt
        activeRole={activeRole}
        currentUser={currentUser}
        profileChecked={profileChecked}
      >
        <TeacherHome
          currentUser={currentUser}
          isHomeroom={currentUser?.roles?.includes('wali_kelas') ?? activeRole === 'wali_kelas'}
          photoUrl={teacherPhotoUrl}
        />
      </DashboardWithTelegramPrompt>
    );
  }

  if (activeRole === 'operator_sekolah') {
    return (
      <DashboardWithTelegramPrompt
        activeRole={activeRole}
        currentUser={currentUser}
        profileChecked={profileChecked}
      >
        <OperatorHome currentUser={currentUser} />
      </DashboardWithTelegramPrompt>
    );
  }

  if (activeRole === 'kepala_sekolah') {
    return (
      <DashboardWithTelegramPrompt
        activeRole={activeRole}
        currentUser={currentUser}
        profileChecked={profileChecked}
      >
        <PrincipalHome currentUser={currentUser} />
      </DashboardWithTelegramPrompt>
    );
  }

  if (activeRole === 'orang_tua') {
    return (
      <DashboardWithTelegramPrompt
        activeRole={activeRole}
        currentUser={currentUser}
        profileChecked={profileChecked}
      >
        <ParentHome currentUser={currentUser} />
      </DashboardWithTelegramPrompt>
    );
  }

  if (activeRole === 'tu') {
    return (
      <DashboardWithTelegramPrompt
        activeRole={activeRole}
        currentUser={currentUser}
        profileChecked={profileChecked}
      >
        <StaffHome currentUser={currentUser} />
      </DashboardWithTelegramPrompt>
    );
  }

  if (activeRole === 'bk') {
    return (
      <DashboardWithTelegramPrompt
        activeRole={activeRole}
        currentUser={currentUser}
        profileChecked={profileChecked}
      >
        <CounselingHome currentUser={currentUser} />
      </DashboardWithTelegramPrompt>
    );
  }

  return (
    <DashboardWithTelegramPrompt
      activeRole={activeRole}
      currentUser={currentUser}
      profileChecked={profileChecked}
    >
      <PageHeader
        description={getMonitoringDescription(activeRole)}
        eyebrow="EduFlow"
        showBackLink={false}
        title={getMonitoringTitle(activeRole)}
      />
      <OperationalDashboard />
    </DashboardWithTelegramPrompt>
  );
}

function DashboardWithTelegramPrompt({
  activeRole,
  children,
  currentUser,
  profileChecked,
}: {
  activeRole: UserRole;
  children: ReactNode;
  currentUser: CurrentUser | null;
  profileChecked: boolean;
}) {
  return (
    <>
      {profileChecked && !currentUser?.telegramId ? (
        <TelegramActivationPrompt activeRole={activeRole} />
      ) : null}
      {children}
    </>
  );
}

function TelegramActivationPrompt({ activeRole }: { activeRole: UserRole }) {
  const [status, setStatus] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  async function handleActivate() {
    setLinking(true);
    setStatus(null);

    try {
      const { api } = await import('../lib/api');
      const response = await api.createTelegramLinkToken();

      if (!response.data.botUrl) {
        setStatus('Bot Telegram belum dikonfigurasi oleh admin.');
        return;
      }

      window.open(response.data.botUrl, '_blank', 'noopener,noreferrer');
      setStatus('Telegram dibuka. Klik Start di bot, lalu refresh beranda ini.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Aktivasi Telegram gagal dibuat.');
    } finally {
      setLinking(false);
    }
  }

  return (
    <section className="mb-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm shadow-amber-100/60 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700 dark:text-amber-200">
            Aktivasi Telegram
          </p>
          <h2 className="mt-1 text-base font-black text-slate-900 dark:text-amber-50">
            Aktifkan Telegram agar reminder dan notifikasi penting masuk.
          </h2>
          <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-100/80">
            Peringatan ini akan hilang setelah akun Telegram berhasil terhubung.
          </p>
          {status ? (
            <p className="mt-2 text-sm font-bold text-amber-900 dark:text-amber-50">
              {status}
            </p>
          ) : null}
        </div>
        <button
          aria-label={`Aktifkan Telegram untuk ${activeRole.replaceAll('_', ' ')}`}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-amber-800 sm:w-auto"
          disabled={linking}
          onClick={() => void handleActivate()}
          type="button"
        >
          {linking ? 'Membuka Bot...' : 'Aktifkan Telegram'}
        </button>
      </div>
    </section>
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
      <section className="mt-7">
        <div className="mb-4">
          <h2 className="text-xl font-black tracking-tight text-slate-900">
            Ruang Kerja Admin
          </h2>
          <p className="mt-1 text-sm text-muted">
            Fokus pengecekan data sebelum aktivitas KBM berjalan penuh.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminInsightCard
            description="Pastikan tahun ajaran, semester, kelas, dan mapel aktif sudah benar."
            href="/admin/akademik"
            label="Kesiapan Data Akademik"
            status="Fondasi"
            tone="primary"
          />
          <AdminInsightCard
            description="Cek jadwal yang belum lengkap, bentrok guru, atau slot kelas kosong."
            href="/admin/schedules"
            label="Validasi Jadwal"
            status="Harian"
            tone="warning"
          />
          <AdminInsightCard
            description="Tinjau akun guru, role wali kelas, dan mapel ampu yang belum terhubung."
            href="/admin/guru"
            label="Kelengkapan Guru"
            status="Akses"
            tone="primary"
          />
          <AdminInsightCard
            description="Lihat notifikasi gagal, perubahan data penting, dan laporan yang perlu diekspor."
            href="/admin/notifications"
            label="Kesehatan Operasional"
            status="Monitoring"
            tone="danger"
          />
        </div>
      </section>

      <section className="mt-7 rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">
              Checklist Sebelum KBM
            </h2>
            <p className="mt-1 text-sm text-muted">
              Urutan kerja singkat agar data harian tidak tercecer.
            </p>
          </div>
          <span className="w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
            Admin
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <AdminChecklistItem label="Data guru dan siswa sudah terbaru" />
          <AdminChecklistItem label="Jadwal hari ini tidak ada bentrok" />
          <AdminChecklistItem label="Notifikasi dan audit dipantau" />
        </div>
      </section>
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
        <RoleActionCard href="/principal/notifications" icon="✦" label="Inbox Kepala Sekolah" description="Lihat kelas kosong, guru belum submit, koreksi, dan pengajuan approval." />
      </RoleSection>
      <RoleSection description="Ringkasan untuk evaluasi dan pengambilan keputusan." title="Monitoring Sekolah">
        <RoleActionCard href="/principal/teacher-performance" icon="◈" label="Performa Guru" description="Bandingkan sesi mengajar, keterlambatan submit, dan kelas kosong." />
        <RoleActionCard href="/principal/reports" icon="▣" label="Laporan Sekolah" description="Lihat dan export rekap kehadiran serta kegiatan belajar mengajar." />
        <RoleActionCard href="/principal/audit" icon="◇" label="Jejak Aktivitas" description="Telusuri aktivitas penting untuk kebutuhan supervisi." />
      </RoleSection>
      <section className="mt-7">
        <div className="mb-4">
          <h2 className="text-xl font-black tracking-tight text-slate-900">
            Kondisi KBM Hari Ini
          </h2>
          <p className="mt-1 text-sm text-muted">
            Ringkasan kelas berjalan, presensi, checklist KBM, guru pengganti, dan agenda yang perlu perhatian.
          </p>
        </div>
        <OperationalDashboard className="mt-0" />
      </section>
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
  const basePath = isHomeroom ? '/homeroom' : '/teacher';

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
            <TeacherAction href={`${basePath}/schedules`} label="Jadwal Saya" />
            <TeacherAction href={`${basePath}/attendance`} label="Buka Presensi" />
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
            href="/teacher/assessments"
            label="Penilaian"
          />
          {isHomeroom ? (
            <TeacherCard
              description="Pantau presensi, ringkasan, dan tindak lanjut siswa kelas binaan."
              href="/homeroom/students"
              label="Kelas Binaan"
            />
          ) : null}
          <TeacherCard
            description="Lihat pengumuman, reminder kelas, dan permintaan revisi."
            href={`${basePath}/notifications`}
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

function AdminInsightCard({
  description,
  href,
  label,
  status,
  tone,
}: {
  description: string;
  href: string;
  label: string;
  status: string;
  tone: 'primary' | 'warning' | 'danger';
}) {
  const toneClass = {
    primary:
      'border-blue-100 bg-white text-brand-700 dark:border-blue-400/20 dark:bg-[var(--surface-soft)] dark:text-blue-200',
    warning:
      'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-200',
    danger:
      'border-red-100 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-200',
  }[tone];

  return (
    <Link
      className={`group rounded-[1.75rem] border p-5 shadow-sm shadow-blue-100/60 transition hover:-translate-y-0.5 hover:shadow-lg dark:shadow-black/20 ${toneClass}`}
      href={href}
    >
      <span className="inline-flex rounded-full bg-white/70 px-3 py-1 text-xs font-black dark:bg-white/10">
        {status}
      </span>
      <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-[var(--text)]">
        {label}
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <span className="mt-4 inline-flex text-xs font-black">Tinjau data →</span>
    </Link>
  );
}

function AdminChecklistItem({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--surface-soft)]">
      <p className="text-sm font-bold text-slate-900 dark:text-[var(--text)]">
        {label}
      </p>
    </div>
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
        <TeacherAction href="/parent/info" label="Lihat Data Anak" />
      </div>
    </>
  );
}

function StaffHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'Tata Usaha';

  return (
    <>
      <RoleHero
        description="Kelola data administrasi akademik, import data, dan laporan yang mendukung operasional sekolah."
        eyebrow="Tata Usaha"
        title={`Selamat bekerja, ${displayName}`}
      />
      <RoleSection description="Ruang kerja administratif harian." title="Administrasi Sekolah">
        <RoleActionCard href="/tu/data" icon="☷" label="Data Akademik" description="Lihat kelas, mata pelajaran, tahun ajaran, dan struktur data akademik." priority />
        <RoleActionCard href="/tu/import-data" icon="⇧" label="Import Data" description="Upload data guru dan siswa dari Excel sesuai format sekolah." />
        <RoleActionCard href="/tu/reports" icon="▣" label="Laporan" description="Export rekap operasional untuk kebutuhan administrasi." />
        <RoleActionCard href="/tu/notifications" icon="✉" label="Inbox" description="Pantau pemberitahuan administratif yang perlu ditindaklanjuti." />
      </RoleSection>
    </>
  );
}

function CounselingHome({ currentUser }: { currentUser: CurrentUser | null }) {
  const displayName = currentUser?.name ?? currentUser?.username ?? 'BK';

  return (
    <>
      <RoleHero
        description="Pantau siswa yang membutuhkan perhatian dan gunakan data presensi sebagai dasar tindak lanjut."
        eyebrow="Bimbingan Konseling"
        title={`Selamat bekerja, ${displayName}`}
      />
      <RoleSection description="Fokus pada monitoring siswa dan tindak lanjut pembinaan." title="Monitoring BK">
        <RoleActionCard href="/bk/students" icon="☷" label="Data Siswa" description="Lihat data siswa, kelas, dan wali murid sebagai dasar pembinaan." priority />
        <RoleActionCard href="/bk/reports" icon="▣" label="Laporan Presensi" description="Tinjau rekap presensi dan siswa yang perlu perhatian." />
        <RoleActionCard href="/bk/notifications" icon="✉" label="Inbox" description="Pantau notifikasi kelas kosong, presensi, dan tindak lanjut siswa." />
      </RoleSection>
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
