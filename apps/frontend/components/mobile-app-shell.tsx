'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import { ThemeToggle } from './ui/theme-toggle';
import { api } from '../lib/api';
import {
  clearBrowserSession,
  getCurrentSessionUser,
  SESSION_CHANGED_EVENT,
} from '../lib/session';
import {
  getPrimaryNavigation,
  getPrimaryRole,
  getSectionFromPath,
} from '../lib/navigation.config';

export function MobileAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname === '/login';
  const [currentUser, setCurrentUser] = useState<{
    name?: string;
    username?: string | null;
    roles?: string[];
  } | null>(null);
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

    const primaryRole = getPrimaryRole(user.roles ?? []);

    async function loadNotificationBadge() {
      try {
        if (
          primaryRole === 'guru' ||
          primaryRole === 'wali_kelas' ||
          primaryRole === 'kepala_sekolah'
        ) {
          const response = await api.getMyNotifications();
          setNotificationBadgeCount(
            response.data.filter((notification) => notification.status === 'PENDING')
              .length,
          );
          return;
        }

        const [pendingResponse, failedResponse] = await Promise.all([
          api.getPendingNotifications(),
          api.getFailedNotifications(),
        ]);

        setNotificationBadgeCount(
          pendingResponse.data.length + failedResponse.data.length,
        );
      } catch {
        setNotificationBadgeCount(0);
      }
    }

    void loadNotificationBadge();
  }, [currentUser, isPublicPage]);

  if (isPublicPage) {
    return <>{children}</>;
  }

  const roles = currentUser?.roles ?? [];

  return (
    <div className="app-backdrop min-h-dvh overflow-x-hidden">
      <div className="app-frame mx-auto min-h-dvh max-w-md overflow-x-hidden md:my-3 md:min-h-[calc(100dvh-1.5rem)] md:w-[calc(100%-1.5rem)] md:max-w-none md:rounded-[2rem] xl:w-[calc(100%-2rem)]">
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

function MobileGreeting({
  currentUser,
}: {
  currentUser: { name?: string; username?: string | null; roles?: string[] } | null;
}) {
  const displayName =
    currentUser?.name ?? currentUser?.username ?? 'Pengguna EduFlow';
  const displayRole = getPrimaryRole(currentUser?.roles ?? []).replaceAll('_', ' ');
  return (
    <div className="surface-card mb-3 rounded-[1.5rem] px-4 py-3 min-[390px]:hidden">
      <p className="text-xs font-bold text-muted">Sedang login sebagai</p>
      <p className="mt-1 truncate text-sm font-black text-brand-700">
        Hai, {displayName}
      </p>
      <p className="mt-1 truncate text-[0.65rem] font-bold capitalize text-muted">
        {displayRole}
      </p>
    </div>
  );
}

function AppTopBar({
  currentUser,
}: {
  currentUser: { name?: string; username?: string | null; roles?: string[] } | null;
}) {
  async function handleLogout() {
    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken) {
      try {
        await api.logout(refreshToken);
      } catch {
        // Token tetap dibersihkan di browser agar user keluar dari perangkat ini.
      }
    }

    clearBrowserSession();
    window.location.href = '/login';
  }

  const displayName =
    currentUser?.name ?? currentUser?.username ?? 'Pengguna EduFlow';
  const displayRole = getPrimaryRole(currentUser?.roles ?? []).replaceAll('_', ' ');

  return (
    <header className="app-topbar sticky top-0 z-30 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 backdrop-blur-xl sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link className="flex items-center gap-3" href="/">
          <span className="brand-mark grid size-10 place-items-center rounded-2xl text-lg font-black text-white">
            <span>E</span>
          </span>
          <span>
            <span className="block text-base font-black leading-none text-ink">
              EduFlow
            </span>
            <span className="mt-1 block text-xs font-semibold text-muted">
              KBM Monitoring
            </span>
          </span>
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <div className="user-chip hidden min-w-0 rounded-2xl px-3 py-2 text-right min-[390px]:block">
            <p className="max-w-32 truncate text-xs font-black text-brand-700">
              Hai, {displayName}
            </p>
            <p className="max-w-32 truncate text-[0.65rem] font-bold capitalize text-muted">
              {displayRole}
            </p>
          </div>
          <ThemeToggle compact />
          <button
            className="secondary-button rounded-full px-3 py-2 text-xs font-black"
            onClick={() => void handleLogout()}
            type="button"
          >
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}

function BottomNavigation({
  notificationBadgeCount,
  pathname,
  roles,
}: {
  notificationBadgeCount: number;
  pathname: string;
  roles: string[];
}) {
  const primaryNavItems = getPrimaryNavigation(roles);
  const section = getSectionFromPath(pathname);

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:w-1/2 md:max-w-none"
    >
      <div className="bottom-nav mx-auto grid grid-cols-5 gap-1 rounded-[1.75rem] p-2 backdrop-blur-xl">
        {primaryNavItems.map((item) => {
          const active =
            pathname.startsWith(item.href) ||
            (item.href === '/admin' && section === 'admin') ||
            (item.href === '/operations' && section === 'operations') ||
            (item.href === '/reports' && section === 'reports');

          return (
            <Link
              className={cn(
                'flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[0.68rem] font-bold transition',
                active
                  ? 'nav-item-active text-white'
                  : 'text-muted hover:bg-brand-50 hover:text-brand-700',
              )}
              href={item.href}
              key={item.href}
            >
              <span className="relative text-lg leading-none">
                {item.icon}
                {item.badge === 'notifications' && notificationBadgeCount > 0 ? (
                  <span className="notification-dot absolute -top-1 -right-2 size-2.5 rounded-full bg-rose-500 ring-2" />
                ) : null}
              </span>
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
