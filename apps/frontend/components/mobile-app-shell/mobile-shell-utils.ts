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

export function hasRoleNamespaceAccess(
  primaryRole: UserRole,
  requiredRole: UserRole,
) {
  const assignedRoles = getCurrentSessionUser()?.roles ?? [primaryRole];

  // Root is the technical super-role and already has access to every namespace.
  if (assignedRoles.includes('root')) return true;

  // Super Admin Sekolah may enter technical system pages, but this does not
  // grant it the Root role or Root-only role assignment capability.
  if (requiredRole === 'root') return assignedRoles.includes('admin');

  // Namespace access is granted by any assigned role, not only the primary one.
  if (assignedRoles.includes(requiredRole)) return true;

  // Wali kelas uses the teacher workspace and receives its additional pages.
  if (requiredRole === 'guru' && assignedRoles.includes('wali_kelas')) return true;
  if (requiredRole === 'wali_kelas' && assignedRoles.includes('guru') && assignedRoles.includes('wali_kelas')) return true;

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
