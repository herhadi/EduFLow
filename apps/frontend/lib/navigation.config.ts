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

const rootNavigation: NavigationItem[] = [
  { href: '/admin', label: 'Admin', icon: '⚙' },
  { href: '/operations', label: 'Ops', icon: '●' },
  { href: '/audit', label: 'Audit', icon: '◇' },
  { href: '/notifications', label: 'Notif', icon: '✦', badge: 'notifications' },
  { href: '/profile', label: 'Profil', icon: '◎' },
];

const operatorNavigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Home', icon: '⌂' },
  { href: '/admin', label: 'Admin', icon: '⚙' },
  { href: '/schedules', label: 'Setup', icon: '◷' },
  { href: '/notifications', label: 'Notif', icon: '✦', badge: 'notifications' },
  { href: '/profile', label: 'Profil', icon: '◎' },
];

const principalNavigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Home', icon: '⌂' },
  { href: '/teacher-performance', label: 'Guru', icon: '◎' },
  { href: '/reports', label: 'Report', icon: '▣' },
  { href: '/notifications', label: 'Notif', icon: '✦', badge: 'notifications' },
  { href: '/profile', label: 'Profil', icon: '◎' },
];

const teacherNavigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Hari Ini', icon: '⌂' },
  { href: '/teacher/schedules', label: 'Jadwal Saya', icon: '◷' },
  { href: '/teacher/attendance', label: 'Presensi', icon: '✓' },
  { href: '/notifications', label: 'Notif', icon: '✦', badge: 'notifications' },
  { href: '/profile', label: 'Profil', icon: '◎' },
];

const parentNavigation: NavigationItem[] = [
  { href: '/parent-portal', label: 'Anak', icon: '⌂' },
  { href: '/notifications', label: 'Notif', icon: '✦', badge: 'notifications' },
  { href: '/reports', label: 'Riwayat', icon: '▣' },
  { href: '/dashboard', label: 'Info', icon: '☷' },
  { href: '/profile', label: 'Profil', icon: '◎' },
];

const roleNavigation: Record<UserRole, NavigationItem[]> = {
  root: rootNavigation,
  operator_sekolah: operatorNavigation,
  kepala_sekolah: principalNavigation,
  guru: teacherNavigation,
  wali_kelas: teacherNavigation,
  tu: [
    { href: '/admin/akademik', label: 'Data', icon: '☷' },
    { href: '/import-data', label: 'Import', icon: '⇧' },
    { href: '/reports', label: 'Report', icon: '▣' },
    { href: '/notifications', label: 'Notif', icon: '✦', badge: 'notifications' },
    { href: '/profile', label: 'Profil', icon: '◎' },
  ],
  bk: [
    { href: '/dashboard', label: 'Home', icon: '⌂' },
    { href: '/master-data', label: 'Siswa', icon: '☷' },
    { href: '/reports', label: 'Laporan', icon: '▣' },
    { href: '/notifications', label: 'Notif', icon: '✦', badge: 'notifications' },
    { href: '/profile', label: 'Profil', icon: '◎' },
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
  { section: 'teacher', href: '/dashboard', label: 'Hari Ini' },
  { section: 'teacher', href: '/notifications', label: 'Notifikasi' },
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
  return roleNavigation[getPrimaryRole(roles)];
}

export function getSectionFromPath(pathname: string) {
  if (pathname.startsWith('/admin') || pathname === '/import-data') {
    return 'admin';
  }

  if (pathname.startsWith('/schedules')) {
    return 'schedules';
  }

  if (pathname.startsWith('/teacher')) {
    return 'teacher';
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
