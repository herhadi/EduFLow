'use client';

import { useState } from 'react';
import { type UserRole } from '../../lib/navigation.config';

export function TelegramActivationPrompt({ activeRole }: { activeRole: UserRole }) {
  const [status, setStatus] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  async function handleActivate() {
    setLinking(true);
    setStatus(null);

    try {
      const { api } = await import('../../lib/api');
      const response = await api.createTelegramLinkToken();

      if (!response.data.botUrl) {
        setStatus('Bot Telegram belum dikonfigurasi oleh admin.');
        return;
      }

      window.open(response.data.botUrl, '_blank', 'noopener,noreferrer');
      setStatus('Telegram dibuka. Klik Start di bot, lalu refresh beranda ini.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Aktivasi Telegram gagal dibuat.');
    } finally {
      setLinking(false);
    }
  }

  return (
    <section className="mb-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700 dark:text-amber-200">
            Aktivasi Telegram
          </p>
          <h2 className="mt-1 text-base font-black text-slate-900 dark:text-amber-50">
            Aktifkan Telegram agar reminder dan notifikasi penting masuk.
          </h2>
          <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-100/80">
            Peringatan ini akan hilang setelah akun Telegram berhasil terhubung.
          </p>
          {status ? (
            <p className="mt-2 text-sm font-bold text-amber-900 dark:text-amber-50">
              {status}
            </p>
          ) : null}
        </div>
        <button
          aria-label={`Aktifkan Telegram untuk ${activeRole.replaceAll('_', ' ')}`}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-amber-800 sm:w-auto"
          disabled={linking}
          onClick={() => void handleActivate()}
          type="button"
        >
          {linking ? 'Membuka Bot...' : 'Aktifkan Telegram'}
        </button>
      </div>
    </section>
  );
}
