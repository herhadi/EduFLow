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
  GripVertical,
  Mail,
  MoreHorizontal,
  Presentation,
  ShieldCheck,
  School,
  Upload,
  UserCog,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { api } from '../../lib/api';
import { getRoleGreetingLabels } from '../dashboards/dashboard-types';
import { cn } from '../../lib/cn';
import {
  getPrimaryNavigation,
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
  const displayRole = getRoleGreetingLabels(currentUser?.roles ?? []).join(', ');

  return (
    <div className="surface-card mb-3 rounded-[1.5rem] px-4 py-3 min-[390px]:hidden">
      <p className="text-xs font-bold text-muted">Sedang login sebagai</p>
      <p className="mt-1 truncate text-sm font-black text-brand-700">
        Hai, {displayName}
      </p>
      <p className="mt-1 truncate text-[0.65rem] font-bold text-muted">
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
  const displayRole = getRoleGreetingLabels(currentUser?.roles ?? []).join(', ');

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
            <p className="max-w-48 truncate text-[0.65rem] font-bold text-slate-700 dark:text-slate-300">
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
  const defaults = getPrimaryNavigation(roles);
  const defaultPrimary = defaults.filter((item) => !item.children?.length);
  const defaultMore = defaults.flatMap((item) => item.children ?? []);
  const allAllowed = [...defaultPrimary, ...defaultMore];
  const [layout, setLayout] = useState<{ primary: NavigationItem[]; more: NavigationItem[] }>({
    primary: defaultPrimary,
    more: defaultMore,
  });
  const [openMoreHref, setOpenMoreHref] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draggedHref, setDraggedHref] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const navRef = useRef<HTMLDivElement>(null);
  const section = getSectionFromPath(pathname);

  useEffect(() => {
    // The shell can mount before the session user and role list are hydrated.
    // Rebuild the baseline menu whenever roles change, even when no custom
    // preference has been saved for this account.
    setLayout({ primary: defaultPrimary, more: defaultMore });
    let active = true;
    api.getMyNavigation().then(({ data }) => {
      if (!active || !data) return;
      const byHref = new Map(allAllowed.map((item) => [item.href, item]));
      const savedPrimary = data.primary.map((href) => byHref.get(href)).filter((item): item is NavigationItem => Boolean(item));
      const pinnedHome = defaultPrimary[0];
      const primary = (pinnedHome
        ? [pinnedHome, ...savedPrimary.filter((item) => item.href !== pinnedHome.href)]
        : savedPrimary).slice(0, 4);
      const primaryHrefs = new Set(primary.map((item) => item.href));
      const savedMore = data.more.map((href) => byHref.get(href)).filter((item): item is NavigationItem => item !== undefined && !primaryHrefs.has(item.href));
      const used = new Set([...primaryHrefs, ...savedMore.map((item) => item.href)]);
      const more = [...savedMore, ...allAllowed.filter((item) => !used.has(item.href) && !primaryHrefs.has(item.href))];
      if (primary.length) setLayout({ primary, more });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [roles.join('|')]);

  useEffect(() => {
    setOpenMoreHref(null);
  }, [pathname]);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!navRef.current?.contains(event.target as Node)) setOpenMoreHref(null);
    }
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  const visibleItems: NavigationItem[] = [
    ...layout.primary,
    ...(layout.more.length ? [{ href: '/more', label: 'Lainnya', icon: 'more', children: layout.more }] : []),
  ];

  function moveItem(href: string, destination: 'primary' | 'more', targetHref?: string) {
    setLayout((current) => {
      const item = [...current.primary, ...current.more].find((entry) => entry.href === href);
      if (!item || current.primary[0]?.href === href || (targetHref && targetHref === current.primary[0]?.href)) return current;
      let primary = current.primary.filter((entry) => entry.href !== href);
      let more = current.more.filter((entry) => entry.href !== href);
      if (destination === 'primary') {
        const movingFromMore = !current.primary.some((entry) => entry.href === href);
        if (movingFromMore && primary.length >= 4) {
          const displaced = primary.pop();
          if (displaced) more.unshift(displaced);
        }
        const targetIndex = targetHref ? primary.findIndex((entry) => entry.href === targetHref) : -1;
        primary.splice(targetIndex >= 0 ? targetIndex : primary.length, 0, item);
      } else {
        const targetIndex = targetHref ? more.findIndex((entry) => entry.href === targetHref) : -1;
        more.splice(targetIndex >= 0 ? targetIndex : more.length, 0, item);
      }
      return { primary, more };
    });
  }

  function reorderItem(href: string, direction: -1 | 1, zone: 'primary' | 'more') {
    setLayout((current) => {
      const list = [...current[zone]];
      const index = list.findIndex((entry) => entry.href === href);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= list.length || (zone === 'primary' && (index === 0 || nextIndex === 0))) return current;
      [list[index], list[nextIndex]] = [list[nextIndex], list[index]];
      return { ...current, [zone]: list };
    });
  }

  async function saveLayout() {
    setSaving(true);
    setSaveError('');
    try {
      await api.updateMyNavigation({
        primary: layout.primary.map((item) => item.href),
        more: layout.more.map((item) => item.href),
      });
      setEditing(false);
      setOpenMoreHref(null);
    } catch {
      setSaveError('Susunan belum tersimpan. Periksa koneksi lalu coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <nav aria-label="Navigasi utama" className="mobile-bottom-nav md:w-1/2">
      <div ref={navRef} className="mobile-bottom-nav-inner" style={{ gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))` }}>
        {visibleItems.map((item, index) => {
          const active = isBottomNavItemActive({ href: item.href, pathname, section, children: item.children });
          const open = openMoreHref === item.href;
          const toneClass = getBottomNavToneClass(index);
          return (
            <div className="relative" key={item.href}>
              {item.children?.length ? (
                <>
                  <button aria-expanded={open} className={cn('mobile-bottom-nav-item', toneClass, (active || open) && 'mobile-bottom-nav-item-active')}
                    onClick={() => setOpenMoreHref((current) => current === item.href ? null : item.href)} type="button">
                    <BottomNavContent item={item} notificationBadgeCount={notificationBadgeCount} />
                  </button>
                  {open ? <MoreNavigationMenu items={item.children} notificationBadgeCount={notificationBadgeCount} pathname={pathname} section={section} toneClass={toneClass} onCustomize={() => { setEditing(true); setOpenMoreHref(null); }} /> : null}
                </>
              ) : (
                <Link className={cn('mobile-bottom-nav-item', toneClass, active && 'mobile-bottom-nav-item-active')} href={item.href}>
                  <BottomNavContent item={item} notificationBadgeCount={notificationBadgeCount} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
      {editing ? (
        <div className="pointer-events-auto fixed inset-0 z-[500] flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="mobile-nav-editor-title">
          <section className="surface-card max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-2xl p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><h2 id="mobile-nav-editor-title" className="text-base font-black text-ink">Atur Navigasi</h2><p className="text-xs text-muted">Gunakan tombol untuk mengubah urutan dan memindahkan menu.</p></div>
              <button className="secondary-button rounded-lg px-3 py-2 text-sm" onClick={() => setEditing(false)} type="button">Tutup</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(['primary', 'more'] as const).map((zone) => (
                <div key={zone} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggedHref) moveItem(draggedHref, zone); setDraggedHref(null); }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                  <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold text-ink">{zone === 'primary' ? 'Menu Utama' : 'Lainnya'}</h3><span className="text-xs text-muted">{zone === 'primary' ? `${layout.primary.length}/4` : layout.more.length}</span></div>
                  <div className="grid gap-2">
                    {(zone === 'primary' ? layout.primary : layout.more).map((entry, index) => (
                      <div key={entry.href} draggable={!(zone === 'primary' && index === 0)} onDragStart={(event) => { event.dataTransfer.setData('text/plain', entry.href); event.dataTransfer.effectAllowed = 'move'; setDraggedHref(entry.href); }}
                        onDragEnd={() => setDraggedHref(null)} onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggedHref) moveItem(draggedHref, zone, entry.href); setDraggedHref(null); }}
                        className={cn('flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-sm text-ink', draggedHref === entry.href && 'opacity-40')}>
                        <span className="cursor-grab text-muted" aria-hidden="true"><GripVertical className="size-4" /></span><span className="min-w-0 flex-1 truncate font-semibold">{entry.label}</span>
                        {!(zone === 'primary' && index === 0) ? (
                          <div className="flex items-center gap-1">
                            <button aria-label={`Pindahkan ${entry.label} ke atas`} className="secondary-button rounded-md px-1.5 py-1 text-[10px]" disabled={index === 0} onClick={() => reorderItem(entry.href, -1, zone)} type="button">Naik</button>
                            <button aria-label={`Pindahkan ${entry.label} ke bawah`} className="secondary-button rounded-md px-1.5 py-1 text-[10px]" disabled={index === (zone === 'primary' ? layout.primary.length : layout.more.length) - 1} onClick={() => reorderItem(entry.href, 1, zone)} type="button">Turun</button>
                            <button className="secondary-button rounded-md px-2 py-1 text-xs" onClick={() => moveItem(entry.href, zone === 'primary' ? 'more' : 'primary')} type="button">
                              {zone === 'primary' ? 'Lainnya' : 'Utama'}
                            </button>
                          </div>
                        ) : <span className="text-[10px] text-muted">Tetap</span>}
                      </div>
                    ))}
                    {zone === 'primary' && layout.primary.length === 0 ? <p className="text-xs text-muted">Tarik menu ke sini.</p> : null}
                    {zone === 'more' && layout.more.length === 0 ? <p className="text-xs text-muted">Tarik menu ke sini.</p> : null}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">Menu pertama dikunci sebagai Beranda atau halaman utama role. Maksimal empat menu utama. Jika slot penuh, menu terakhir otomatis dipindah ke Lainnya saat Anda memilih menu pengganti.</p>
            {saveError ? <p className="mt-2 text-sm font-semibold text-red-600">{saveError}</p> : null}
            <div className="mt-4 flex justify-end gap-2"><button className="secondary-button rounded-lg px-4 py-2 text-sm" onClick={() => setEditing(false)} type="button">Batal</button><button className="primary-button rounded-lg px-4 py-2 text-sm" disabled={saving || layout.primary.length === 0} onClick={() => void saveLayout()} type="button">{saving ? 'Menyimpan...' : 'Simpan'}</button></div>
          </section>
        </div>
      ) : null}
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
  onCustomize,
}: {
  items: NavigationItem[];
  notificationBadgeCount: number;
  pathname: string;
  section: string | null;
  toneClass: string;
  onCustomize: () => void;
}) {
  return (
    <div className="mobile-bottom-nav-menu">
      <button className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-left text-xs font-bold text-ink hover:bg-[var(--surface)]" onClick={onCustomize} type="button">Atur Navigasi</button>
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
  school: School,
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
