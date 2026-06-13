'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { cn } from '../lib/cn';
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
  getSubNavigation,
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
    <div className="min-h-dvh overflow-x-hidden bg-[radial-gradient(circle_at_top,_#dbeafe_0,_#eff6ff_28%,_#f8fafc_70%)]">
      <div className="mx-auto min-h-dvh max-w-md overflow-x-hidden bg-blue-50/30 shadow-2xl shadow-blue-950/5 md:max-w-5xl">
        <AppTopBar currentUser={currentUser} />

        <div className="px-3 pt-3 pb-28 sm:px-5 md:px-6">
          <MobileGreeting currentUser={currentUser} />
          <SectionSubMenu pathname={pathname} />
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
    <div className="mb-3 rounded-[1.5rem] border border-blue-100 bg-white/80 px-4 py-3 shadow-sm shadow-blue-100/60 min-[390px]:hidden">
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
    <header className="sticky top-0 z-30 border-b border-blue-100/70 bg-white/85 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 shadow-sm shadow-blue-100/60 backdrop-blur-xl sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link className="flex items-center gap-3" href="/">
          <span className="grid size-10 place-items-center rounded-2xl bg-brand-600 text-lg font-black text-white shadow-lg shadow-blue-200">
            E
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
          <div className="hidden min-w-0 rounded-2xl bg-brand-50 px-3 py-2 text-right min-[390px]:block">
            <p className="max-w-32 truncate text-xs font-black text-brand-700">
              Hai, {displayName}
            </p>
            <p className="max-w-32 truncate text-[0.65rem] font-bold capitalize text-muted">
              {displayRole}
            </p>
          </div>
          <button
            className="rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-black text-brand-700 shadow-sm transition hover:bg-brand-50"
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

function SectionSubMenu({ pathname }: { pathname: string }) {
  const subNavigation = getSubNavigation(pathname);

  if (!subNavigation.length) {
    return null;
  }

  return (
    <nav
      aria-label="Sub menu"
      className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:-mx-5 sm:px-5 md:-mx-6 md:px-6"
    >
      {subNavigation.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-xs font-bold shadow-sm transition',
              active
                ? 'border-brand-600 bg-brand-600 text-white shadow-blue-200'
                : 'border-blue-100 bg-white text-brand-700 hover:bg-brand-50',
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
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
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:max-w-5xl"
    >
      <div className="mx-auto grid grid-cols-5 gap-1 rounded-[1.75rem] border border-blue-100 bg-white/90 p-2 shadow-2xl shadow-blue-950/15 backdrop-blur-xl">
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
                  ? 'bg-brand-600 text-white shadow-lg shadow-blue-200'
                  : 'text-muted hover:bg-brand-50 hover:text-brand-700',
              )}
              href={item.href}
              key={item.href}
            >
              <span className="relative text-lg leading-none">
                {item.icon}
                {item.badge === 'notifications' && notificationBadgeCount > 0 ? (
                  <span className="absolute -top-1 -right-2 size-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
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
