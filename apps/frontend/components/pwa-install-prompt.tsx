'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const dismissedKey = 'eduflow-pwa-install-dismissed';
const snoozedUntilKey = 'eduflow-pwa-install-snoozed-until';
const snoozeMs = 60 * 60 * 1000;

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

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
    <div className="fixed right-3 bottom-[7.25rem] left-3 z-[115] mx-auto max-w-md rounded-3xl border border-blue-100 bg-white p-3 shadow-xl dark:border-blue-400/20 dark:bg-slate-950 sm:right-5 sm:left-auto sm:w-96 md:bottom-5">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-600 text-sm font-black text-white">
          EF
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-900 dark:text-slate-100">Install EduFlow</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-muted">
            Buka lebih cepat dari layar utama dan terasa seperti aplikasi.
          </p>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => void install()} size="sm">Install</Button>
            <Button onClick={dismiss} size="sm" variant="ghost">Nanti</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
