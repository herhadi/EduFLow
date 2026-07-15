import {
  getCurrentSessionUser,
} from '../../lib/session';
import {
  type UserRole,
} from '../../lib/navigation.config';

export type ShellUser = {
  name?: string;
  username?: string | null;
  roles?: string[];
} | null;

export function getRequiredRoleForPath(pathname: string): UserRole | null {
  if (pathname.startsWith('/system') || pathname.startsWith('/operations')) return 'root';
  if (pathname.startsWith('/principal')) return 'kepala_sekolah';
  if (pathname.startsWith('/homeroom')) return 'wali_kelas';
  if (pathname.startsWith('/parent')) return 'orang_tua';
  if (pathname.startsWith('/tu')) return 'tu';
  if (pathname.startsWith('/bk')) return 'bk';
  if (pathname.startsWith('/teacher')) return 'guru';
  if (pathname.startsWith('/admin')) return 'operator_sekolah';
  return null;
}

export function hasRoleNamespaceAccess(primaryRole: UserRole, requiredRole: UserRole) {
  if (primaryRole === requiredRole) return true;
  if (primaryRole === 'guru' && requiredRole === 'wali_kelas') {
    return getCurrentSessionUser()?.roles?.includes('wali_kelas') ?? false;
  }
  return false;
}

export function isBottomNavItemActive({
  href,
  pathname,
  section,
}: {
  href: string;
  pathname: string;
  section: string | null;
}) {
  if (href === '/admin' || href === '/admin/data') {
    return (
      section === 'admin' &&
      !pathname.startsWith('/admin/dashboard') &&
      !pathname.startsWith('/admin/notifications') &&
      !pathname.startsWith('/admin/profile') &&
      !pathname.startsWith('/admin/schedules')
    );
  }

  if (href === '/reports') {
    return section === 'reports';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
