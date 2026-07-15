'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import {
  getCurrentSessionUser,
  SESSION_CHANGED_EVENT,
} from '../lib/session';
import {
  loadUnreadNotificationCount,
  NOTIFICATION_CHANGED_EVENT,
} from '../lib/notifications';
import {
  getDashboardPathForRole,
  getPrimaryRole,
} from '../lib/navigation.config';
import {
  AppTopBar,
  BottomNavigation,
  MobileGreeting,
} from './mobile-app-shell/mobile-shell-navigation';
import {
  getRequiredRoleForPath,
  hasRoleNamespaceAccess,
  type ShellUser,
} from './mobile-app-shell/mobile-shell-utils';

export function MobileAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname === '/login';
  const [currentUser, setCurrentUser] = useState<ShellUser>(null);
  const [notificationBadgeCount, setNotificationBadgeCount] = useState(0);

  useEffect(() => {
    function syncCurrentUser() {
      setCurrentUser(getCurrentSessionUser());
    }

    syncCurrentUser();
    window.addEventListener(SESSION_CHANGED_EVENT, syncCurrentUser);
    window.addEventListener('storage', syncCurrentUser);

    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, syncCurrentUser);
      window.removeEventListener('storage', syncCurrentUser);
    };
  }, []);

  useEffect(() => {
    const user = currentUser;

    if (isPublicPage || !user) {
      return;
    }

    async function loadNotificationBadge() {
      try {
        setNotificationBadgeCount(await loadUnreadNotificationCount());
      } catch {
        setNotificationBadgeCount(0);
      }
    }

    void loadNotificationBadge();
    window.addEventListener('focus', loadNotificationBadge);
    document.addEventListener('visibilitychange', loadNotificationBadge);
    window.addEventListener(NOTIFICATION_CHANGED_EVENT, loadNotificationBadge);
    return () => {
      window.removeEventListener('focus', loadNotificationBadge);
      document.removeEventListener('visibilitychange', loadNotificationBadge);
      window.removeEventListener(NOTIFICATION_CHANGED_EVENT, loadNotificationBadge);
    };
  }, [currentUser, isPublicPage, pathname]);

  useEffect(() => {
    if (isPublicPage || !currentUser) {
      return;
    }

    const primaryRole = getPrimaryRole(currentUser.roles ?? []);
    const requiredRole = getRequiredRoleForPath(pathname);

    if (!requiredRole || hasRoleNamespaceAccess(primaryRole, requiredRole)) {
      return;
    }

    window.alert('Akses ditolak. Anda akan diarahkan ke menu sesuai role akun.');
    window.location.href = getDashboardPathForRole(primaryRole);
  }, [currentUser, isPublicPage, pathname]);

  if (isPublicPage) {
    return <>{children}</>;
  }

  const roles = currentUser?.roles ?? [];

  return (
    <div className="app-backdrop min-h-dvh overflow-x-hidden">
      <div className="app-frame mx-auto min-h-dvh max-w-[456px] overflow-x-hidden md:my-3 md:min-h-[calc(100dvh-1.5rem)] md:w-[calc(100%-1.5rem)] md:max-w-none md:rounded-[2rem] xl:w-[calc(100%-2rem)]">
        <AppTopBar currentUser={currentUser} />

        <div className="px-3 pt-3 pb-28 sm:px-5 md:px-6">
          <MobileGreeting currentUser={currentUser} />
          <div className="mobile-app-content min-w-0">{children}</div>
        </div>

        <BottomNavigation
          notificationBadgeCount={notificationBadgeCount}
          pathname={pathname}
          roles={roles}
        />
      </div>
    </div>
  );
}
