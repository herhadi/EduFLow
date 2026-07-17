import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import {
  getPrimaryNavigation,
  getPrimaryRole,
  getSectionFromPath,
  type NavigationItem,
} from '../../lib/navigation.config';
import { clearBrowserSession } from '../../lib/session';
import { NotificationBadge } from '../ui/notification-badge';
import { ThemeToggle } from '../ui/theme-toggle';
import {
  isBottomNavItemActive,
  type ShellUser,
} from './mobile-shell-utils';

export function MobileGreeting({
  currentUser,
}: {
  currentUser: ShellUser;
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

export function AppTopBar({
  currentUser,
}: {
  currentUser: ShellUser;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }

    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

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
    <header className="app-topbar top-0 z-30 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 backdrop-blur-xl sm:sticky sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link className="flex items-center gap-3" href="/">
          <span className="grid size-10 place-items-center overflow-hidden rounded-2xl border border-blue-100 bg-white p-1">
            <img
              alt="Logo sekolah"
              className="h-full w-full object-contain"
              src="/logo_sekolah.webp"
            />
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
            <p className="max-w-48 truncate text-xs font-black text-brand-700">
              Hai, {displayName}
            </p>
            <p className="max-w-32 truncate text-[0.65rem] font-bold capitalize text-muted">
              {displayRole}
            </p>
          </div>
          <div className="hidden sm:block"><ThemeToggle compact /></div>
          <button
            className="hidden rounded-full bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700 sm:block"
            onClick={() => void handleLogout()}
            type="button"
          >
            Keluar
          </button>
          <div className="relative sm:hidden" ref={menuRef}>
            <button
              aria-expanded={menuOpen}
              aria-label="Buka menu pengguna"
              className="secondary-button grid min-h-0 size-8 place-items-center rounded-full p-0 text-base font-black"
              onClick={() => setMenuOpen((current) => !current)}
              type="button"
            >
              ⋮
            </button>
            {menuOpen ? (
              <div className="surface-card absolute top-10 right-0 z-50 grid w-24 grid-cols-[2rem_1fr] items-center gap-1 rounded-xl p-1.5 shadow-xl">
                <div className="grid place-items-center">
                  <ThemeToggle compact showLabel={false} />
                </div>
                <button
                  className="h-8 rounded-lg bg-red-600 px-2 text-center text-xs font-black text-white transition hover:bg-red-700"
                  onClick={() => void handleLogout()}
                  type="button"
                >
                  Keluar
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

export function BottomNavigation({
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
  const [openMoreHref, setOpenMoreHref] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpenMoreHref(null);
  }, [pathname]);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenMoreHref(null);
      }
    }

    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[456px] px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:w-1/2 md:max-w-none"
    >
      <div
        ref={navRef}
        className="bottom-nav mx-auto grid gap-1 rounded-[1.75rem] p-2 backdrop-blur-xl"
        style={{ gridTemplateColumns: `repeat(${primaryNavItems.length}, minmax(0, 1fr))` }}
      >
        {primaryNavItems.map((item) => {
          const active = isBottomNavItemActive({
            href: item.href,
            pathname,
            section,
            children: item.children,
          });
          const open = openMoreHref === item.href;

          return (
            <div className="relative" key={item.href}>
              {item.children?.length ? (
                <>
                  <button
                    aria-expanded={open}
                    className={cn(
                      'flex w-full flex-col items-center justify-center rounded-2xl px-2 py-2 text-[0.68rem] font-bold transition',
                      active || open
                        ? 'nav-item-active text-white'
                        : 'text-muted hover:bg-brand-50 hover:text-brand-700',
                    )}
                    onClick={() => setOpenMoreHref((current) => current === item.href ? null : item.href)}
                    type="button"
                  >
                    <BottomNavContent
                      item={item}
                      notificationBadgeCount={notificationBadgeCount}
                    />
                  </button>
                  {open ? (
                    <MoreNavigationMenu
                      items={item.children}
                      notificationBadgeCount={notificationBadgeCount}
                      pathname={pathname}
                      section={section}
                    />
                  ) : null}
                </>
              ) : (
                <Link
                  className={cn(
                    'flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[0.68rem] font-bold transition',
                    active
                      ? 'nav-item-active text-white'
                      : 'text-muted hover:bg-brand-50 hover:text-brand-700',
                  )}
                  href={item.href}
                >
                  <BottomNavContent
                    item={item}
                    notificationBadgeCount={notificationBadgeCount}
                  />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function BottomNavContent({
  item,
  notificationBadgeCount,
}: {
  item: NavigationItem;
  notificationBadgeCount: number;
}) {
  return (
    <>
      <span className="relative grid size-5 place-items-center text-lg leading-none">
        <NavigationIcon icon={item.icon} />
        {item.badge === 'notifications' ? <NotificationBadge count={notificationBadgeCount} /> : null}
      </span>
      <span className="mt-1">{item.label}</span>
    </>
  );
}

function MoreNavigationMenu({
  items,
  notificationBadgeCount,
  pathname,
  section,
}: {
  items: NavigationItem[];
  notificationBadgeCount: number;
  pathname: string;
  section: string | null;
}) {
  return (
    <div className="surface-card absolute right-0 bottom-[calc(100%+0.75rem)] z-50 w-48 rounded-[1.25rem] p-2 shadow-xl">
      <div className="grid gap-1">
        {items.map((child) => {
          const active = isBottomNavItemActive({
            href: child.href,
            pathname,
            section,
            children: child.children,
          });

          return (
            <Link
              className={cn(
                'flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold transition',
                active
                  ? 'bg-brand-600 text-white'
                  : 'text-ink hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-white/10 dark:hover:text-white',
              )}
              href={child.href}
              key={child.href}
            >
              <span className="relative grid size-5 shrink-0 place-items-center text-base leading-none">
                <NavigationIcon icon={child.icon} />
                {child.badge === 'notifications' ? <NotificationBadge count={notificationBadgeCount} /> : null}
              </span>
              <span className="truncate">{child.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NavigationIcon({ icon }: { icon?: string }) {
  if (icon === 'telegram') {
    return (
      <svg
        aria-hidden="true"
        className="size-4"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M20.5 4.5 3.8 11.2c-.9.4-.9 1.6.1 1.9l4.2 1.3 1.6 5c.3.9 1.5 1.1 2 .3l2.4-3.1 4.5 3.3c.8.6 1.9.1 2.1-.9l2-13c.2-1-.8-1.8-1.7-1.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="m8.2 14.4 8.4-6.1-6.9 8.2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return <>{icon}</>;
}
