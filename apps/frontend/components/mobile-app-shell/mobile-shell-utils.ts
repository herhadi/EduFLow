import {
  getCurrentSessionUser,
} from '../../lib/session';
import {
  type NavigationItem,
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
  if (pathname.startsWith('/opsek')) return 'operator_sekolah';
  if (pathname.startsWith('/admin')) return 'admin';
  return null;
}

export function hasRoleNamespaceAccess(primaryRole: UserRole, requiredRole: UserRole) {
  if (primaryRole === requiredRole) return true;
  if (primaryRole === 'admin' && requiredRole === 'root') return true;
  if (primaryRole === 'guru' && requiredRole === 'wali_kelas') {
    return getCurrentSessionUser()?.roles?.includes('wali_kelas') ?? false;
  }
  return false;
}

export function isBottomNavItemActive({
  children,
  href,
  pathname,
  section,
}: {
  children?: NavigationItem[];
  href: string;
  pathname: string;
  section: string | null;
}) {
  if (children?.some((child) => isBottomNavItemActive({
    children: child.children,
    href: child.href,
    pathname,
    section,
  }))) {
    return true;
  }

  if (href === '/opsek' || href === '/opsek/data') {
    return (
      section === 'opsek' &&
      !pathname.startsWith('/opsek/notifications') &&
      !pathname.startsWith('/opsek/profile') &&
      !pathname.startsWith('/opsek/schedules')
    );
  }

  if (href === '/reports') {
    return section === 'reports';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
