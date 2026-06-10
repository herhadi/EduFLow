'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

const primaryNavItems = [
  { href: '/dashboard', label: 'Home', icon: '⌂' },
  { href: '/schedules', label: 'Jadwal', icon: '◷' },
  { href: '/notifications', label: 'Notif', icon: '✦' },
  { href: '/operations', label: 'Ops', icon: '●' },
  { href: '/reports', label: 'Report', icon: '▣' },
];

const quickMenuItems = [
  { href: '/admin', label: 'Admin' },
  { href: '/master-data', label: 'Master Data' },
  { href: '/import-data', label: 'Import' },
  { href: '/audit', label: 'Audit' },
  { href: '/parent-portal', label: 'Parent' },
  { href: '/teacher-performance', label: 'Guru' },
];

export function MobileAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname === '/login';

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[radial-gradient(circle_at_top,_#dbeafe_0,_#eff6ff_28%,_#f8fafc_70%)]">
      <div className="mx-auto min-h-dvh max-w-md overflow-x-hidden bg-blue-50/30 shadow-2xl shadow-blue-950/5 md:max-w-5xl">
        <AppTopBar />

        <div className="px-3 pt-3 pb-28 sm:px-5 md:px-6">
          <QuickMenu pathname={pathname} />
          <div className="mobile-app-content min-w-0">{children}</div>
        </div>

        <BottomNavigation pathname={pathname} />
      </div>
    </div>
  );
}

function AppTopBar() {
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
        <div className="flex items-center gap-2">
          <div className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 min-[380px]:block">
            Online
          </div>
          <Link
            className="rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-black text-brand-700 shadow-sm transition hover:bg-brand-50"
            href="/login"
          >
            Keluar
          </Link>
        </div>
      </div>
    </header>
  );
}

function QuickMenu({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Menu cepat"
      className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:-mx-5 sm:px-5 md:-mx-6 md:px-6"
    >
      {quickMenuItems.map((item) => {
        const active = pathname === item.href;

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

function BottomNavigation({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:max-w-5xl"
    >
      <div className="mx-auto grid grid-cols-5 gap-1 rounded-[1.75rem] border border-blue-100 bg-white/90 p-2 shadow-2xl shadow-blue-950/15 backdrop-blur-xl">
        {primaryNavItems.map((item) => {
          const active = pathname.startsWith(item.href);

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
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
