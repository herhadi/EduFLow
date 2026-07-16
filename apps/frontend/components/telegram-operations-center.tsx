'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, type TelegramOperationsStatus } from '../lib/api';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

const emptyStatus: TelegramOperationsStatus = {
  config: {
    botTokenConfigured: false,
    botUsername: null,
    botUrlConfigured: false,
    webhookSecretConfigured: false,
    webhookUrl: null,
  },
  provider: {
    reachable: false,
    info: null,
    webhookUrl: null,
    hasCustomCertificate: null,
    pendingUpdateCount: null,
    lastErrorMessage: null,
    lastErrorAt: null,
    maxConnections: null,
    ipAddress: null,
  },
  usage: {
    linkedUsers: 0,
    logs: { total: 0, sent: 0, pending: 0, failed: 0 },
  },
  recentLogs: [],
};

export function TelegramOperationsCenter() {
  const [status, setStatus] = useState<TelegramOperationsStatus>(emptyStatus);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [actionState, setActionState] = useState<'idle' | 'loading'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const webhookInfoJson = useMemo(() => {
    const info = status.provider.info ?? {
      url: status.provider.webhookUrl,
      pending_update_count: status.provider.pendingUpdateCount,
      max_connections: status.provider.maxConnections,
      ip_address: status.provider.ipAddress,
      last_error_message: status.provider.lastErrorMessage,
    };

    return JSON.stringify(info, null, 2);
  }, [status.provider]);

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus() {
    setLoadState('loading');
    setMessage(null);

    try {
      const response = await api.getOperationsTelegram();
      setStatus(response.data);
      setLoadState('success');
    } catch {
      setLoadState('error');
    }
  }

  async function runWebhookAction(action: 'set' | 'delete') {
    setActionState('loading');
    setMessage(null);

    try {
      const response = action === 'set'
        ? await api.setOperationsTelegramWebhook()
        : await api.deleteOperationsTelegramWebhook();
      setStatus(response.data);
      setMessage(response.message ?? (action === 'set' ? 'Webhook dipasang.' : 'Webhook dihapus.'));
      setLoadState('success');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Aksi webhook gagal.');
    } finally {
      setActionState('idle');
    }
  }

  return (
    <section className="mt-8 w-full min-w-0 max-w-full overflow-hidden rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-balance text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Manajemen Telegram Webhook
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Khusus root: cek, set, dan hapus webhook Telegram bot.
          </p>
        </div>
        <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
          <button className="secondary-button min-w-0 rounded-2xl px-4 py-2.5 text-sm font-black" onClick={() => void loadStatus()} type="button">
            Refresh Status
          </button>
          <button
            className="school-primary-button min-w-0 rounded-2xl px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={actionState === 'loading' || !status.config.botTokenConfigured || !status.config.webhookUrl}
            onClick={() => void runWebhookAction('set')}
            type="button"
          >
            {actionState === 'loading' ? 'Memproses...' : 'Set Webhook'}
          </button>
          <button
            className="min-w-0 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-black text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={actionState === 'loading' || !status.config.botTokenConfigured}
            onClick={() => void runWebhookAction('delete')}
            type="button"
          >
            Hapus Webhook
          </button>
        </div>
      </div>

      {loadState === 'error' ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          Status Telegram belum bisa dimuat.
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">{message}</p>
      ) : null}

      <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-900">Variabel Backend</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p className="break-words"><strong>Wajib:</strong> TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_URL</p>
            <p className="break-words"><strong>Opsional:</strong> TELEGRAM_WEBHOOK_SECRET, TELEGRAM_BOT_USERNAME</p>
          </div>
          <div className="mt-4 grid gap-2">
            <InfoRow label="TELEGRAM_WEBHOOK_URL" value={status.config.webhookUrl ? 'Ada' : 'Kosong'} />
            <InfoRow label="Secret webhook" value={status.config.webhookSecretConfigured ? 'Ada' : 'Kosong'} />
            <InfoRow label="Bot username env" value={status.config.botUsername ? 'Ada' : 'Kosong'} />
            <InfoRow label="Bot token" value={status.config.botTokenConfigured ? 'Ada' : 'Kosong'} />
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-900">Webhook URL</p>
          <p className="mt-2 break-all text-sm font-bold text-slate-700">
            {status.config.webhookUrl ?? 'Belum tersedia'}
          </p>
          {status.provider.lastErrorMessage ? (
            <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-bold text-rose-700">
              {status.provider.lastErrorMessage}
            </p>
          ) : null}
          <pre className="mt-4 max-h-[24rem] w-full max-w-full overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
            {webhookInfoJson}
          </pre>
        </div>
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1 rounded-xl bg-white px-3 py-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:items-center">
      <span className="min-w-0 break-words text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <span className="min-w-0 break-all text-sm font-bold text-slate-800">{value}</span>
    </div>
  );
}
