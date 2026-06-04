'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type NotificationLog,
} from '../lib/api';

type LoadState = 'idle' | 'loading' | 'success' | 'error';
type NotificationTab = 'sent' | 'pending' | 'failed' | 'retry';

const tabs: Array<{ id: NotificationTab; label: string; description: string }> = [
  {
    id: 'sent',
    label: 'Terkirim',
    description: 'Riwayat notifikasi yang berhasil dikirim.',
  },
  {
    id: 'pending',
    label: 'Pending',
    description: 'Notifikasi yang sedang menunggu diproses worker.',
  },
  {
    id: 'failed',
    label: 'Gagal',
    description: 'Notifikasi gagal yang perlu dicek operator.',
  },
  {
    id: 'retry',
    label: 'Retry',
    description: 'Kirim ulang notifikasi gagal ke queue.',
  },
];

export function NotificationCenter() {
  const [activeTab, setActiveTab] = useState<NotificationTab>('sent');
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [actionState, setActionState] = useState<LoadState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState<NotificationLog[]>([]);
  const [pending, setPending] = useState<NotificationLog[]>([]);
  const [failed, setFailed] = useState<NotificationLog[]>([]);
  const [retry, setRetry] = useState<NotificationLog[]>([]);

  async function loadNotifications() {
    setLoadState('loading');

    try {
      const [sentResponse, pendingResponse, failedResponse, retryResponse] =
        await Promise.all([
          api.getSentNotifications(),
          api.getPendingNotifications(),
          api.getFailedNotifications(),
          api.getRetryNotifications(),
        ]);

      setSent(sentResponse.data);
      setPending(pendingResponse.data);
      setFailed(failedResponse.data);
      setRetry(retryResponse.data);
      setLoadState('success');
    } catch {
      setLoadState('error');
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  const activeDescription = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.description,
    [activeTab],
  );

  async function handleRetry(notification: NotificationLog) {
    setActionState('loading');
    setMessage(null);

    try {
      const response = await api.retryNotification(notification.id);
      setMessage(response.message ?? 'Retry berhasil dikirim ke queue.');
      await loadNotifications();
      setActiveTab('pending');
      setActionState('success');
    } catch {
      setMessage('Retry gagal. Pastikan backend dan Redis berjalan.');
      setActionState('error');
    }
  }

  return (
    <section className="mt-10 grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="px-3 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
          Notifikasi
        </p>
        <nav className="mt-4 space-y-2">
          {tabs.map((tab) => (
            <button
              className={[
                'flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold transition',
                activeTab === tab.id
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100',
              ].join(' ')}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <span>{tab.label}</span>
              <span className="text-xs opacity-80">{getTabCount(tab.id)}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {tabs.find((tab) => tab.id === activeTab)?.label}
            </h2>
            <p className="mt-1 text-sm text-muted">{activeDescription}</p>
          </div>
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => void loadNotifications()}
            type="button"
          >
            Refresh
          </button>
        </div>

        {loadState === 'error' ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Notifikasi belum bisa dimuat. Pastikan backend berjalan.
          </div>
        ) : null}

        {message ? (
          <p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            {message}
          </p>
        ) : null}

        <div className="mt-6">
          {activeTab === 'sent' ? <NotificationTable items={sent} /> : null}
          {activeTab === 'pending' ? <NotificationTable items={pending} /> : null}
          {activeTab === 'failed' ? (
            <NotificationTable items={failed} />
          ) : null}
          {activeTab === 'retry' ? (
            <NotificationTable
              actionState={actionState}
              items={retry}
              onRetry={handleRetry}
            />
          ) : null}
        </div>
      </div>
    </section>
  );

  function getTabCount(tab: NotificationTab) {
    if (tab === 'sent') {
      return sent.length;
    }

    if (tab === 'pending') {
      return pending.length;
    }

    if (tab === 'failed') {
      return failed.length;
    }

    return retry.length;
  }
}

function NotificationTable({
  actionState,
  items,
  onRetry,
}: {
  actionState?: LoadState;
  items: NotificationLog[];
  onRetry?: (notification: NotificationLog) => Promise<void>;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted">
        Belum ada data notifikasi.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold tracking-[0.08em] text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Kanal</th>
              <th className="px-4 py-3">Penerima</th>
              <th className="px-4 py-3">Pesan</th>
              <th className="px-4 py-3">Attempt</th>
              <th className="px-4 py-3">Waktu</th>
              {onRetry ? <th className="px-4 py-3">Aksi</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-4">
                  <StatusPill label={item.channel} status={item.status} />
                </td>
                <td className="px-4 py-4 text-slate-700">
                  <strong>{item.recipientName ?? '-'}</strong>
                  <p className="text-xs text-muted">{item.recipient}</p>
                </td>
                <td className="max-w-[320px] px-4 py-4 text-slate-700">
                  <p>{item.message}</p>
                  {item.lastError ? (
                    <p className="mt-1 text-xs text-red-600">{item.lastError}</p>
                  ) : null}
                </td>
                <td className="px-4 py-4 text-slate-700">{item.attempts}</td>
                <td className="px-4 py-4 text-slate-700">
                  {formatDateTime(item.sentAt ?? item.failedAt ?? item.createdAt)}
                </td>
                {onRetry ? (
                  <td className="px-4 py-4">
                    <button
                      className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={actionState === 'loading'}
                      onClick={() => void onRetry(item)}
                      type="button"
                    >
                      Retry
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ label, status }: { label: string; status: string }) {
  const className =
    status === 'FAILED'
      ? 'bg-red-50 text-red-700'
      : status === 'PENDING'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-brand-50 text-brand-700';

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-bold ${className}`}>
      {label}
    </span>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
