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
}

export type NotificationAccess =
  | { mode: 'personal'; audience: 'teacher' | 'principal' | 'parent' }
  | { mode: 'operational'; canRetry: boolean };

const rootNavigation: NavigationItem[] = [
  { href: '/admin', label: 'Admin', icon: '⚙' },
  { href: '/operations', label: 'Ops', icon: '●' },
  { href: '/audit', label: 'Audit', icon: '◇' },
  { href: '/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/profile', label: 'Profil', icon: '👤' },
];

const operatorNavigation: NavigationItem[] = [
  { href: '/dashboard/admin', label: 'Beranda', icon: '⌂' },
  { href: '/admin', label: 'Data', icon: '☷' },
  { href: '/schedules', label: 'Jadwal', icon: '▦' },
  { href: '/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/profile', label: 'Profil', icon: '👤' },
];

const principalNavigation: NavigationItem[] = [
  { href: '/dashboard/kepala-sekolah', label: 'Beranda', icon: '⌂' },
  { href: '/principal/review', label: 'Review', icon: '✓' },
  { href: '/teacher-performance', label: 'Performa', icon: '◈' },
  { href: '/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/profile', label: 'Profil', icon: '👤' },
];

const teacherNavigation: NavigationItem[] = [
  { href: '/dashboard/guru', label: 'Hari Ini', icon: '⌂' },
  { href: '/teacher/schedules', label: 'Jadwal', icon: '▦' },
  { href: '/teacher/attendance', label: 'Presensi', icon: '✓' },
  { href: '/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/profile', label: 'Profil', icon: '👤' },
];

const homeroomNavigation: NavigationItem[] = [
  { href: '/dashboard/wali-kelas', label: 'Hari Ini', icon: '⌂' },
  { href: '/teacher/schedules', label: 'Jadwal', icon: '▦' },
  { href: '/teacher/attendance', label: 'Presensi', icon: '✓' },
  { href: '/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/profile', label: 'Profil', icon: '👤' },
];

const parentNavigation: NavigationItem[] = [
  { href: '/dashboard/orang-tua', label: 'Anak', icon: '⌂' },
  { href: '/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/reports', label: 'Riwayat', icon: '▣' },
  { href: '/parent-portal', label: 'Info', icon: '☷' },
  { href: '/profile', label: 'Profil', icon: '👤' },
];

const roleNavigation: Record<UserRole, NavigationItem[]> = {
  root: rootNavigation,
  operator_sekolah: operatorNavigation,
  kepala_sekolah: principalNavigation,
  guru: teacherNavigation,
  wali_kelas: homeroomNavigation,
  tu: [
    { href: '/admin/akademik', label: 'Data', icon: '☷' },
    { href: '/import-data', label: 'Import', icon: '⇧' },
    { href: '/reports', label: 'Report', icon: '▣' },
    { href: '/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
    { href: '/profile', label: 'Profil', icon: '👤' },
  ],
  bk: [
    { href: '/dashboard/bk', label: 'Home', icon: '⌂' },
    { href: '/master-data', label: 'Siswa', icon: '☷' },
    { href: '/reports', label: 'Laporan', icon: '▣' },
    { href: '/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
    { href: '/profile', label: 'Profil', icon: '👤' },
  ],
  orang_tua: parentNavigation,
};

export const sectionSubNavigation: Array<NavigationItem & { section: string }> = [
  { section: 'admin', href: '/admin/guru', label: 'Guru' },
  { section: 'admin', href: '/admin/akademik', label: 'Akademik' },
  { section: 'admin', href: '/admin/akses', label: 'Akses' },
  { section: 'admin', href: '/import-data', label: 'Import' },
  { section: 'admin', href: '/audit', label: 'Audit' },
  { section: 'schedules', href: '/schedules', label: 'Setup Jadwal' },
  { section: 'schedules', href: '/admin/guru', label: 'Mapel Guru' },
  { section: 'schedules', href: '/admin/akademik', label: 'Kelas & Mapel' },
  { section: 'schedules', href: '/admin/akademik/kalender', label: 'Kaldik' },
  { section: 'operations', href: '/operations', label: 'Health' },
  { section: 'operations', href: '/notifications', label: 'Notifikasi' },
  { section: 'operations', href: '/audit', label: 'Audit' },
  { section: 'reports', href: '/reports', label: 'Export' },
  { section: 'reports', href: '/teacher-performance', label: 'Performa Guru' },
  { section: 'reports', href: '/parent-portal', label: 'Parent Portal' },
  { section: 'profile', href: '/profile', label: 'Profil' },
  { section: 'profile', href: '/notifications', label: 'Notifikasi' },
  { section: 'teacher', href: '/teacher/schedules', label: 'Jadwal Saya' },
  { section: 'teacher', href: '/teacher/attendance', label: 'Presensi' },
  { section: 'teacher', href: '/teacher/teaching-plans', label: 'Perangkat Ajar' },
  { section: 'teacher', href: '/dashboard/guru', label: 'Hari Ini' },
  { section: 'teacher', href: '/notifications', label: 'Notifikasi' },
  { section: 'principal', href: '/principal/review', label: 'Persetujuan' },
  { section: 'principal', href: '/teacher-performance', label: 'Performa Guru' },
  { section: 'principal', href: '/reports', label: 'Laporan Sekolah' },
];

const rolePriority: UserRole[] = [
  'root',
  'operator_sekolah',
  'kepala_sekolah',
  'wali_kelas',
  'guru',
  'tu',
  'bk',
  'orang_tua',
];

export function getPrimaryRole(roles: string[] = []): UserRole {
  return rolePriority.find((role) => roles.includes(role)) ?? 'guru';
}

export function getPrimaryNavigation(roles: string[] = []) {
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
    root: '/dashboard',
    operator_sekolah: '/dashboard/admin',
    kepala_sekolah: '/dashboard/kepala-sekolah',
    wali_kelas: '/dashboard/wali-kelas',
    guru: '/dashboard/guru',
    tu: '/dashboard/tu',
    bk: '/dashboard/bk',
    orang_tua: '/dashboard/orang-tua',
  };

  return paths[role];
}

export function getDashboardPathForRoles(roles: string[] = []) {
  return getDashboardPathForRole(getPrimaryRole(roles));
}

export function getSectionFromPath(pathname: string) {
  if (pathname.startsWith('/admin') || pathname === '/import-data') {
    return 'admin';
  }

  if (pathname.startsWith('/schedules')) {
    return 'schedules';
  }

  if (pathname.startsWith('/teacher/')) {
    return 'teacher';
  }

  if (pathname.startsWith('/principal')) {
    return 'principal';
  }

  if (pathname.startsWith('/operations') || pathname.startsWith('/notifications')) {
    return 'operations';
  }

  if (
    pathname.startsWith('/reports') ||
    pathname.startsWith('/teacher-performance') ||
    pathname.startsWith('/parent-portal')
  ) {
    return 'reports';
  }

  if (pathname.startsWith('/profile')) {
    return 'profile';
  }

  return null;
}

export function getSubNavigation(pathname: string) {
  const section = getSectionFromPath(pathname);

  if (!section) {
    return [];
  }

  return sectionSubNavigation.filter((item) => item.section === section);
}
