import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  Database,
  Download,
  FileCheck2,
  FileText,
  History,
  Home,
  Mail,
  MoreHorizontal,
  Presentation,
  ShieldCheck,
  Upload,
  UserCog,
  UserRound,
  UsersRound,
} from 'lucide-react';
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
    <header className="app-topbar px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 backdrop-blur-xl sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link className="flex items-center gap-3" href="/">
          <span className="grid size-10 place-items-center overflow-hidden rounded-2xl border border-blue-100 bg-white p-1">
            <Image
              alt="Logo sekolah"
              className="h-full w-full object-contain"
              height={32}
              priority
              sizes="32px"
              src="/logo_sekolah.webp"
              width={32}
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
            <p className="max-w-32 truncate text-[0.65rem] font-bold capitalize text-slate-700 dark:text-slate-300">
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
          <div className="relative isolate sm:hidden" ref={menuRef}>
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
              <div className="surface-card absolute right-0 top-[calc(100%+0.5rem)] z-[220] grid w-20 gap-2.5 rounded-xl p-1.5 shadow-xl">
                <div className="grid h-8 place-items-center rounded-lg border border-blue-100 bg-white/70 dark:border-[var(--border)] dark:bg-[var(--surface-soft)]">
                  <ThemeToggle compact showLabel={false} />
                </div>
                <button
                  className="h-8 w-full rounded-lg bg-red-600 px-2 text-center text-xs font-black text-white transition hover:bg-red-700"
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
      className="mobile-bottom-nav md:w-1/2"
    >
      <div
        ref={navRef}
        className="mobile-bottom-nav-inner"
        style={{ gridTemplateColumns: `repeat(${primaryNavItems.length}, minmax(0, 1fr))` }}
      >
        {primaryNavItems.map((item, index) => {
          const active = isBottomNavItemActive({
            href: item.href,
            pathname,
            section,
            children: item.children,
          });
          const open = openMoreHref === item.href;
          const toneClass = getBottomNavToneClass(index);

          return (
            <div className="relative" key={item.href}>
              {item.children?.length ? (
                <>
                  <button
                    aria-expanded={open}
                    className={cn(
                      'mobile-bottom-nav-item',
                      toneClass,
                      (active || open) && 'mobile-bottom-nav-item-active',
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
                      toneClass={toneClass}
                    />
                  ) : null}
                </>
              ) : (
                <Link
                  className={cn(
                    'mobile-bottom-nav-item',
                    toneClass,
                    active && 'mobile-bottom-nav-item-active',
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
      <span className="mobile-bottom-nav-icon">
        <NavigationIcon icon={item.icon} />
        {item.badge === 'notifications' ? <NotificationBadge count={notificationBadgeCount} /> : null}
      </span>
      <span className="mobile-bottom-nav-label">{item.label}</span>
    </>
  );
}

function MoreNavigationMenu({
  items,
  notificationBadgeCount,
  pathname,
  section,
  toneClass,
}: {
  items: NavigationItem[];
  notificationBadgeCount: number;
  pathname: string;
  section: string | null;
  toneClass: string;
}) {
  return (
    <div className="mobile-bottom-nav-menu">
      <div className="grid gap-1">
        {items.map((child, index) => {
          const active = isBottomNavItemActive({
            href: child.href,
            pathname,
            section,
            children: child.children,
          });
          const itemToneClass = getBottomNavToneClass(index);

          return (
            <Link
              className={cn(
                'mobile-bottom-nav-menu-item',
                itemToneClass,
                active && 'mobile-bottom-nav-menu-item-active',
              )}
              href={child.href}
              key={child.href}
            >
              <span className="mobile-bottom-nav-menu-icon">
                <NavigationIcon icon={child.icon} />
                {child.badge === 'notifications' ? <NotificationBadge count={notificationBadgeCount} /> : null}
              </span>
              <span className="min-w-0 truncate">{child.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function getBottomNavToneClass(index: number) {
  const tones = [
    'mobile-bottom-nav-tone-blue',
    'mobile-bottom-nav-tone-emerald',
    'mobile-bottom-nav-tone-cyan',
    'mobile-bottom-nav-tone-amber',
    'mobile-bottom-nav-tone-violet',
  ];

  return tones[index % tones.length];
}

function NavigationIcon({ icon }: { icon?: string }) {
  const Icon = icon ? navigationIcons[icon] : null;

  if (Icon) {
    return <Icon aria-hidden="true" className="size-4" strokeWidth={2.4} />;
  }

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

const navigationIcons: Record<string, typeof Home> = {
  access: UserCog,
  activity: Activity,
  attendance: CheckSquare,
  audit: ShieldCheck,
  'clipboard-check': ClipboardCheck,
  database: Database,
  document: FileText,
  download: Download,
  grades: BarChart3,
  history: History,
  home: Home,
  kbm: BookOpen,
  message: Mail,
  more: MoreHorizontal,
  permit: FileCheck2,
  profile: UserRound,
  report: BarChart3,
  review: ClipboardCheck,
  schedule: CalendarDays,
  students: UsersRound,
  teacher: Presentation,
  upload: Upload,
};
