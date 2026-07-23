'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import { Button } from './ui/button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const dismissedKey = 'eduflow-pwa-install-dismissed';
const snoozedUntilKey = 'eduflow-pwa-install-snoozed-until';
const snoozeMs = 60 * 60 * 1000;

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const hasBottomNav = pathname !== '/' && pathname !== '/login';

  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();

      if (localStorage.getItem(dismissedKey) === '1') {
        return;
      }

      const snoozedUntil = Number(localStorage.getItem(snoozedUntilKey) ?? 0);

      if (snoozedUntil > Date.now()) {
        return;
      }

      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  async function install() {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === 'accepted') {
      setVisible(false);
      setInstallEvent(null);
    }
  }

  function dismiss() {
    localStorage.setItem(snoozedUntilKey, String(Date.now() + snoozeMs));
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed right-3 left-3 z-[115] mx-auto max-w-md rounded-2xl border border-blue-100 bg-white p-2.5 shadow-lg dark:border-blue-400/20 dark:bg-slate-950 sm:right-5 sm:left-auto sm:w-[28rem]',
        hasBottomNav
          ? 'bottom-[calc(4.95rem+env(safe-area-inset-bottom))] md:bottom-5'
          : 'bottom-[calc(0.75rem+env(safe-area-inset-bottom))]',
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-slate-900 dark:text-slate-100">Install EduFlow</p>
          <p className="truncate text-xs font-semibold text-muted">
            Buka lebih cepat dari layar utama.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button className="border border-slate-400 bg-slate-300 px-2.5 py-1.5 text-slate-900 shadow-sm hover:border-slate-500 hover:bg-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" onClick={dismiss} size="sm" variant="ghost">Nanti</Button>
          <Button className="px-2.5 py-1.5" onClick={() => void install()} size="sm">Install</Button>
        </div>
      </div>
    </div>
  );
}
