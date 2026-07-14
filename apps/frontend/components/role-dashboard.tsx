'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  getDashboardPathForRole,
  getPrimaryRole,
  type UserRole,
} from '../lib/navigation.config';
import { api, type Assessment, type DailyAgenda, type Schedule, type TeachingPlan } from '../lib/api';
import { OperationalDashboard } from './operational-dashboard';
import { ParentPortal } from './parent-portal';
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
      <RoleSection description="Akses yang tidak tampil di navbar utama operator." title="Akses Pendukung">
        <RoleActionCard href="/admin/guru" label="Pengaturan Guru" description="Atur data guru, akun, role, mapel ampu, dan wali kelas." />
        <RoleActionCard href="/admin/akademik" label="Admin Akademik" description="Kelola rombel, mata pelajaran, jam pelajaran, dan master akademik." />
        <RoleActionCard href="/admin/import-data" label="Import Data" description="Upload data guru dan siswa dari file sekolah." />
        <RoleActionCard href="/admin/audit" label="Audit Aktivitas" description="Telusuri perubahan data penting oleh operator." />
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
      <section className="mt-5">
        <div className="mb-3">
          <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
            Kondisi KBM Hari Ini
          </h2>
          <p className="mt-1 text-sm text-muted">
            Prioritas kelas, guru, dan kendala yang perlu dilihat lebih dulu.
          </p>
        </div>
        <OperationalDashboard audience="principal" className="mt-0" />
      </section>
      <RoleSection description="Akses pendukung supervisi yang tidak perlu dibuka setiap hari." title="Akses Lanjutan">
        <RoleActionCard href="/principal/audit" label="Jejak Aktivitas" description="Telusuri aktivitas penting untuk kebutuhan supervisi." />
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

      <TeacherDashboardSummary isHomeroom={isHomeroom} />
      <RoleSection description="Akses akademik guru yang tidak tampil di navbar utama." title="Akses Pendukung">
        <RoleActionCard href="/teacher/teaching-plans" label="Perangkat Ajar" description="Kelola program, modul ajar, KKTP, dan buku KBM." />
      </RoleSection>
    </>
  );
}

function TeacherDashboardSummary({ isHomeroom }: { isHomeroom: boolean }) {
  const [agendas, setAgendas] = useState<DailyAgenda[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [plans, setPlans] = useState<TeachingPlan[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const today = useMemo(() => getLocalDateOnly(), []);

  useEffect(() => {
    let ignore = false;

    async function loadTeacherDashboard() {
      setState('loading');

      try {
        const [agendaResponse, scheduleResponse, planResponse, assessmentResponse] = await Promise.all([
          api.getMyAgendas(today),
          api.getMySchedules(),
          api.getMyTeachingPlans(),
          api.getMyAssessments(),
        ]);

        if (ignore) {
          return;
        }

        setAgendas(agendaResponse.data);
        setSchedules(scheduleResponse.data);
        setPlans(planResponse.data);
        setAssessments(assessmentResponse.data);
        setState('success');
      } catch {
        if (!ignore) {
          setState('error');
        }
      }
    }

    void loadTeacherDashboard();

    return () => {
      ignore = true;
    };
  }, [today]);

  const submittedStates = ['SUBMITTED', 'APPROVED', 'CORRECTED', 'LOCKED'];
  const todaySubmitted = agendas.filter((agenda) => agenda.attendance && submittedStates.includes(agenda.attendance.state));
  const todayPending = agendas.filter((agenda) => !agenda.attendance || !submittedStates.includes(agenda.attendance.state));
  const nextAgenda = [...todayPending, ...agendas]
    .sort((first, second) => (first.schedule?.startsAt ?? '').localeCompare(second.schedule?.startsAt ?? ''))[0];
  const dayOfWeek = getLocalDayOfWeek();
  const weeklyToday = schedules.filter((schedule) => schedule.dayOfWeek === dayOfWeek);
  const revisionPlans = plans.filter((plan) => plan.status === 'REVISION_REQUESTED');
  const waitingPlans = plans.filter((plan) => plan.status === 'SUBMITTED');
  const approvedPlans = plans.filter((plan) => plan.status === 'APPROVED');
  const draftAssessments = assessments.filter((assessment) => assessment.status === 'DRAFT' || assessment.status === 'REVISION_REQUESTED');

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
      <div className="surface-card rounded-[2rem] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-700">Agenda Hari Ini</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 sm:text-xl">
              {state === 'loading' ? 'Memuat ringkasan mengajar...' : `${agendas.length} agenda mengajar`}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {formatReadableDate(today)} · {weeklyToday.length} sesi pada jadwal mingguan.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-56">
            <TeacherMiniStat label="Sudah submit" value={todaySubmitted.length} tone="success" />
            <TeacherMiniStat label="Belum submit" value={todayPending.length} tone={todayPending.length ? 'warning' : 'neutral'} />
          </div>
        </div>

        {state === 'error' ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
            Ringkasan guru belum bisa dimuat. Menu tetap bisa dibuka dari pintasan di bawah.
          </p>
        ) : null}

        <div className="mt-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
            <p className="text-xs font-black text-brand-700">Prioritas berikutnya</p>
            {nextAgenda ? (
              <div className="mt-2 min-w-0">
                <h3 className="truncate text-base font-black text-slate-900">
                  {nextAgenda.subject.name}
                </h3>
                <p className="mt-1 text-sm font-semibold text-muted">
                  {nextAgenda.class.name} · {nextAgenda.schedule?.startsAt ?? '--:--'}-{nextAgenda.schedule?.endsAt ?? '--:--'}
                </p>
                <p className="mt-2 text-xs font-black text-slate-600">
                  {getAgendaLabel(nextAgenda)}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold text-muted">
                Belum ada agenda mengajar hari ini.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="surface-card rounded-[2rem] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-700">Tugas Akademik</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">Yang perlu dipantau</h2>
          </div>
          {isHomeroom ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              Wali kelas
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <TeacherMiniStat label="Revisi ajar" value={revisionPlans.length} tone={revisionPlans.length ? 'warning' : 'neutral'} />
          <TeacherMiniStat label="Disetujui" value={approvedPlans.length} tone="success" />
          <TeacherMiniStat label="Menunggu KS" value={waitingPlans.length} tone={waitingPlans.length ? 'primary' : 'neutral'} />
          <TeacherMiniStat label="Draft nilai" value={draftAssessments.length} tone={draftAssessments.length ? 'warning' : 'neutral'} />
        </div>
      </div>
    </section>
  );
}

function TeacherMiniStat({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'neutral' | 'primary' | 'success' | 'warning';
  value: number;
}) {
  const toneClass = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    primary: 'border-blue-100 bg-blue-50 text-brand-700',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-100 bg-amber-50 text-amber-700',
  }[tone];

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <p className="text-xl font-black leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-black leading-tight">{label}</p>
    </div>
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

function RoleActionCard({
  description,
  href,
  label,
}: {
  description: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60 transition hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-lg"
      href={href}
    >
      <h3 className="text-lg font-black text-slate-900">{label}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <span className="mt-4 inline-flex text-xs font-black text-brand-700">Buka halaman</span>
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
      <ParentPortal
        initialContact={currentUser?.email ?? currentUser?.username ?? ''}
        mode="overview"
        title="Ringkasan Kehadiran Anak"
      />
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
    </>
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

function getLocalDateOnly() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getLocalDayOfWeek() {
  const day = new Date().getDay();

  return day === 0 ? 7 : day;
}

function formatReadableDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getAgendaLabel(agenda: DailyAgenda) {
  if (agenda.attendance?.state === 'SUBMITTED') return 'Presensi sudah dikirim';
  if (agenda.attendance?.state === 'APPROVED') return 'Presensi disetujui';
  if (agenda.attendance?.state === 'CORRECTED') return 'Presensi sudah dikoreksi';
  if (agenda.attendance?.state === 'LOCKED') return 'Presensi dikunci';
  if (agenda.status === 'EMPTY') return 'Kelas kosong, perlu tindak lanjut';
  if (agenda.substituteTeacher) return `Guru pengganti: ${agenda.substituteTeacher.name}`;
  if (agenda.attendance) return 'Presensi sedang dikerjakan';

  return 'Belum buka presensi';
}
