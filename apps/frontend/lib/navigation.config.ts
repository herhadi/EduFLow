export type UserRole =
  | 'root'
  | 'operator_sekolah'
  | 'kepala_sekolah'
  | 'guru'
  | 'wali_kelas'
  | 'tu'
  | 'bk'
  | 'orang_tua';

export interface NavigationItem {
  href: string;
  label: string;
  icon?: string;
  badge?: 'notifications';
  roles?: UserRole[];
}

export type NotificationAccess =
  | { mode: 'personal'; audience: 'teacher' | 'principal' | 'parent' }
  | { mode: 'operational'; canRetry: boolean };

const rootNavigation: NavigationItem[] = [
  { href: '/system/dashboard', label: 'Sistem', icon: '⌂' },
  { href: '/operations', label: 'Ops', icon: '●' },
  { href: '/system/access', label: 'Akses', icon: '⚙' },
  { href: '/system/telegram', label: 'Telegram', icon: 'telegram' },
  { href: '/system/audit', label: 'Audit', icon: '◇' },
  { href: '/system/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/system/profile', label: 'Profil', icon: '👤' },
];

const operatorNavigation: NavigationItem[] = [
  { href: '/admin/dashboard', label: 'Beranda', icon: '⌂' },
  { href: '/admin/data', label: 'Master', icon: '☷' },
  { href: '/admin/schedules', label: 'Jadwal', icon: '▦' },
  { href: '/admin/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/admin/profile', label: 'Profil', icon: '👤' },
];

const principalNavigation: NavigationItem[] = [
  { href: '/principal/dashboard', label: 'Beranda', icon: '⌂' },
  { href: '/principal/kbm', label: 'KBM', icon: '▦' },
  { href: '/principal/student-reports', label: 'Siswa', icon: '▣' },
  { href: '/principal/teacher-performance', label: 'Guru', icon: '◈' },
  { href: '/principal/review', label: 'Review', icon: '✓' },
  { href: '/principal/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/principal/profile', label: 'Profil', icon: '👤' },
];

const teacherNavigation: NavigationItem[] = [
  { href: '/teacher/dashboard', label: 'Beranda', icon: '⌂' },
  { href: '/teacher/schedules', label: 'Jadwal', icon: '▦' },
  { href: '/teacher/attendance', label: 'Presensi', icon: '✓' },
  { href: '/teacher/assessments', label: 'Nilai', icon: '▣' },
  { href: '/teacher/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/teacher/profile', label: 'Profil', icon: '👤' },
];

const homeroomNavigation: NavigationItem[] = [
  { href: '/teacher/dashboard', label: 'Beranda', icon: '⌂' },
  { href: '/teacher/schedules', label: 'Jadwal', icon: '▦' },
  { href: '/teacher/attendance', label: 'Presensi', icon: '✓' },
  { href: '/teacher/assessments', label: 'Nilai', icon: '▣' },
  { href: '/homeroom/students', label: 'Binaan', icon: '☷' },
  { href: '/teacher/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/teacher/profile', label: 'Profil', icon: '👤' },
];

const parentNavigation: NavigationItem[] = [
  { href: '/parent/dashboard', label: 'Beranda', icon: '⌂' },
  { href: '/parent/reports', label: 'Riwayat', icon: '▣' },
  { href: '/parent/permits', label: 'Izin', icon: '✓' },
  { href: '/parent/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/parent/profile', label: 'Profil', icon: '👤' },
];

const roleNavigation: Record<UserRole, NavigationItem[]> = {
  root: rootNavigation,
  operator_sekolah: operatorNavigation,
  kepala_sekolah: principalNavigation,
  guru: teacherNavigation,
  wali_kelas: homeroomNavigation,
  tu: [
    { href: '/tu/dashboard', label: 'Home', icon: '⌂' },
    { href: '/tu/data', label: 'Data', icon: '☷' },
    { href: '/tu/import-data', label: 'Import', icon: '⇧' },
    { href: '/tu/reports', label: 'Report', icon: '▣' },
    { href: '/tu/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
    { href: '/tu/profile', label: 'Profil', icon: '👤' },
  ],
  bk: [
    { href: '/bk/dashboard', label: 'Home', icon: '⌂' },
    { href: '/bk/students', label: 'Siswa', icon: '☷' },
    { href: '/bk/reports', label: 'Laporan', icon: '▣' },
    { href: '/bk/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
    { href: '/bk/profile', label: 'Profil', icon: '👤' },
  ],
  orang_tua: parentNavigation,
};

export const sectionSubNavigation: Array<NavigationItem & { section: string }> = [
  { section: 'admin', href: '/admin/dashboard', label: 'Dashboard' },
  { section: 'admin', href: '/admin/data', label: 'Master' },
  { section: 'admin', href: '/admin/guru', label: 'Guru' },
  { section: 'admin', href: '/admin/akademik', label: 'Akademik' },
  { section: 'admin', href: '/admin/schedules', label: 'Jadwal' },
  { section: 'admin', href: '/admin/import-data', label: 'Import' },
  { section: 'admin', href: '/admin/audit', label: 'Audit' },
  { section: 'admin', href: '/admin/leave-requests', label: 'Izin/Sakit' },
  { section: 'schedules', href: '/admin/schedules', label: 'Setup Jadwal' },
  { section: 'schedules', href: '/admin/guru', label: 'Mapel Guru' },
  { section: 'schedules', href: '/admin/akademik', label: 'Kelas & Mapel' },
  { section: 'schedules', href: '/admin/akademik/kalender', label: 'Kaldik' },
  { section: 'operations', href: '/system/dashboard', label: 'Sistem' },
  { section: 'operations', href: '/operations', label: 'Health' },
  { section: 'operations', href: '/system/access', label: 'Akses' },
  { section: 'operations', href: '/system/telegram', label: 'Telegram' },
  { section: 'operations', href: '/system/notifications', label: 'Notifikasi' },
  { section: 'operations', href: '/system/audit', label: 'Audit' },
  { section: 'reports', href: '/reports', label: 'Export' },
  { section: 'reports', href: '/teacher-performance', label: 'Performa Guru' },
  { section: 'reports', href: '/parent-portal', label: 'Parent Portal' },
  { section: 'profile', href: '/profile', label: 'Profil' },
  { section: 'profile', href: '/notifications', label: 'Notifikasi' },
  { section: 'teacher', href: '/teacher/schedules', label: 'Jadwal Saya' },
  { section: 'teacher', href: '/teacher/attendance', label: 'Presensi' },
  { section: 'teacher', href: '/teacher/assessments', label: 'Penilaian' },
  { section: 'teacher', href: '/teacher/teaching-plans', label: 'Perangkat Ajar' },
  { section: 'teacher', href: '/teacher/dashboard', label: 'Hari Ini' },
  { section: 'teacher', href: '/teacher/notifications', label: 'Notifikasi' },
  { section: 'homeroom', href: '/homeroom/dashboard', label: 'Hari Ini' },
  { section: 'homeroom', href: '/homeroom/schedules', label: 'Jadwal Saya' },
  { section: 'homeroom', href: '/homeroom/attendance', label: 'Presensi' },
  { section: 'homeroom', href: '/homeroom/students', label: 'Kelas Binaan' },
  { section: 'homeroom', href: '/homeroom/leave-requests', label: 'Izin/Sakit' },
  { section: 'homeroom', href: '/homeroom/notifications', label: 'Notifikasi' },
  { section: 'principal', href: '/principal/dashboard', label: 'Dashboard' },
  { section: 'principal', href: '/principal/kbm', label: 'KBM Hari Ini' },
  { section: 'principal', href: '/principal/student-reports', label: 'Siswa' },
  { section: 'principal', href: '/principal/teacher-performance', label: 'Guru' },
  { section: 'principal', href: '/principal/review', label: 'Review Dokumen' },
  { section: 'principal', href: '/principal/exports', label: 'Export' },
  { section: 'principal', href: '/principal/audit', label: 'Jejak Aktivitas' },
  { section: 'parent', href: '/parent/dashboard', label: 'Anak' },
  { section: 'parent', href: '/parent/reports', label: 'Riwayat' },
  { section: 'parent', href: '/parent/permits', label: 'Izin' },
  { section: 'parent', href: '/parent/notifications', label: 'Notifikasi' },
  { section: 'tu', href: '/tu/dashboard', label: 'Home' },
  { section: 'tu', href: '/tu/data', label: 'Data' },
  { section: 'tu', href: '/tu/import-data', label: 'Import' },
  { section: 'tu', href: '/tu/reports', label: 'Report' },
  { section: 'tu', href: '/tu/notifications', label: 'Notifikasi' },
  { section: 'bk', href: '/bk/dashboard', label: 'Home' },
  { section: 'bk', href: '/bk/students', label: 'Siswa' },
  { section: 'bk', href: '/bk/reports', label: 'Laporan' },
  { section: 'bk', href: '/bk/notifications', label: 'Notifikasi' },
];

const rolePriority: UserRole[] = [
  'root',
  'operator_sekolah',
  'kepala_sekolah',
  'guru',
  'wali_kelas',
  'tu',
  'bk',
  'orang_tua',
];

export function getPrimaryRole(roles: string[] = []): UserRole {
  return rolePriority.find((role) => roles.includes(role)) ?? 'guru';
}

export function getPrimaryNavigation(roles: string[] = []) {
  if (roles.includes('wali_kelas') && roles.includes('guru')) {
    return homeroomNavigation;
  }

  return roleNavigation[getPrimaryRole(roles)];
}

export function getNotificationAccess(roles: string[] = []): NotificationAccess {
  switch (getPrimaryRole(roles)) {
    case 'guru':
    case 'wali_kelas':
      return { mode: 'personal', audience: 'teacher' };
    case 'kepala_sekolah':
      return { mode: 'personal', audience: 'principal' };
    case 'orang_tua':
      return { mode: 'personal', audience: 'parent' };
    case 'root':
    case 'operator_sekolah':
      return { mode: 'operational', canRetry: true };
    case 'tu':
    case 'bk':
      return { mode: 'operational', canRetry: false };
  }
}

export function getDashboardPathForRole(role: UserRole) {
  const paths: Record<UserRole, string> = {
    root: '/system/dashboard',
    operator_sekolah: '/admin/dashboard',
    kepala_sekolah: '/principal/dashboard',
    wali_kelas: '/teacher/dashboard',
    guru: '/teacher/dashboard',
    tu: '/tu/dashboard',
    bk: '/bk/dashboard',
    orang_tua: '/parent/dashboard',
  };

  return paths[role];
}

export function getDashboardPathForRoles(roles: string[] = []) {
  return getDashboardPathForRole(getPrimaryRole(roles));
}

export function getSectionFromPath(pathname: string) {
  if (pathname.startsWith('/schedules') || pathname.startsWith('/admin/schedules')) {
    return 'schedules';
  }

  if (pathname.startsWith('/admin') || pathname === '/import-data') {
    return 'admin';
  }

  if (pathname.startsWith('/teacher/')) {
    return 'teacher';
  }

  if (pathname.startsWith('/homeroom')) {
    return 'homeroom';
  }

  if (pathname.startsWith('/principal')) {
    return 'principal';
  }

  if (pathname.startsWith('/parent')) {
    return 'parent';
  }

  if (pathname.startsWith('/tu')) {
    return 'tu';
  }

  if (pathname.startsWith('/bk')) {
    return 'bk';
  }

  if (
    pathname.startsWith('/system') ||
    pathname.startsWith('/operations') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/system/notifications')
  ) {
    return 'operations';
  }

  if (
    pathname.startsWith('/reports') ||
    pathname.startsWith('/teacher-performance') ||
    pathname.startsWith('/parent-portal')
  ) {
    return 'reports';
  }

  if (
    pathname.startsWith('/profile') ||
    pathname.endsWith('/profile') ||
    pathname.endsWith('/notifications')
  ) {
    return 'profile';
  }

  return null;
}

export function getSubNavigation(pathname: string, roles: string[] = []) {
  const section = getSectionFromPath(pathname);

  if (!section) {
    return [];
  }

  const primaryRole = getPrimaryRole(roles);

  return sectionSubNavigation.filter(
    (item) => item.section === section && (!item.roles?.length || item.roles.includes(primaryRole)),
  );
}
