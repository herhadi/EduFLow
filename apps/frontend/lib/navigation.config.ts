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
  { href: '/admin', label: 'Admin', icon: '⚙' },
  { href: '/operations', label: 'Ops', icon: '●' },
  { href: '/audit', label: 'Audit', icon: '◇' },
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
  { href: '/principal/review', label: 'Review', icon: '✓' },
  { href: '/teacher-performance', label: 'Performa', icon: '◈' },
  { href: '/principal/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/principal/profile', label: 'Profil', icon: '👤' },
];

const teacherNavigation: NavigationItem[] = [
  { href: '/teacher/dashboard', label: 'Hari Ini', icon: '⌂' },
  { href: '/teacher/schedules', label: 'Jadwal', icon: '▦' },
  { href: '/teacher/attendance', label: 'Presensi', icon: '✓' },
  { href: '/teacher/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/teacher/profile', label: 'Profil', icon: '👤' },
];

const homeroomNavigation: NavigationItem[] = [
  { href: '/teacher/dashboard', label: 'Hari Ini', icon: '⌂' },
  { href: '/teacher/schedules', label: 'Jadwal', icon: '▦' },
  { href: '/teacher/attendance', label: 'Presensi', icon: '✓' },
  { href: '/teacher/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/teacher/profile', label: 'Profil', icon: '👤' },
];

const parentNavigation: NavigationItem[] = [
  { href: '/parent/dashboard', label: 'Anak', icon: '⌂' },
  { href: '/parent/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
  { href: '/reports', label: 'Riwayat', icon: '▣' },
  { href: '/parent-portal', label: 'Info', icon: '☷' },
  { href: '/parent/profile', label: 'Profil', icon: '👤' },
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
    { href: '/tu/notifications', label: 'Inbox', icon: '✉', badge: 'notifications' },
    { href: '/tu/profile', label: 'Profil', icon: '👤' },
  ],
  bk: [
    { href: '/dashboard/bk', label: 'Home', icon: '⌂' },
    { href: '/master-data', label: 'Siswa', icon: '☷' },
    { href: '/reports', label: 'Laporan', icon: '▣' },
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
  { section: 'admin', href: '/admin/akses', label: 'Akses', roles: ['root'] },
  { section: 'admin', href: '/admin/import-data', label: 'Import' },
  { section: 'admin', href: '/admin/audit', label: 'Audit' },
  { section: 'schedules', href: '/admin/schedules', label: 'Setup Jadwal' },
  { section: 'schedules', href: '/admin/guru', label: 'Mapel Guru' },
  { section: 'schedules', href: '/admin/akademik', label: 'Kelas & Mapel' },
  { section: 'schedules', href: '/admin/akademik/kalender', label: 'Kaldik' },
  { section: 'operations', href: '/operations', label: 'Health' },
  { section: 'operations', href: '/system/notifications', label: 'Notifikasi' },
  { section: 'operations', href: '/audit', label: 'Audit' },
  { section: 'reports', href: '/reports', label: 'Export' },
  { section: 'reports', href: '/teacher-performance', label: 'Performa Guru' },
  { section: 'reports', href: '/parent-portal', label: 'Parent Portal' },
  { section: 'profile', href: '/profile', label: 'Profil' },
  { section: 'profile', href: '/notifications', label: 'Notifikasi' },
  { section: 'teacher', href: '/teacher/schedules', label: 'Jadwal Saya' },
  { section: 'teacher', href: '/teacher/attendance', label: 'Presensi' },
  { section: 'teacher', href: '/teacher/teaching-plans', label: 'Perangkat Ajar' },
  { section: 'teacher', href: '/teacher/dashboard', label: 'Hari Ini' },
  { section: 'teacher', href: '/teacher/notifications', label: 'Notifikasi' },
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
    operator_sekolah: '/admin/dashboard',
    kepala_sekolah: '/principal/dashboard',
    wali_kelas: '/teacher/dashboard',
    guru: '/teacher/dashboard',
    tu: '/dashboard/tu',
    bk: '/dashboard/bk',
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

  if (pathname.startsWith('/principal')) {
    return 'principal';
  }

  if (
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
