'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, type TelegramOperationsStatus } from '../lib/api';
import { formatNumber } from '../lib/format';

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
    webhookUrl: null,
    pendingUpdateCount: null,
    lastErrorMessage: null,
    lastErrorAt: null,
    maxConnections: null,
  },
  usage: {
    linkedUsers: 0,
    logs: {
      total: 0,
      sent: 0,
      pending: 0,
      failed: 0,
    },
  },
  recentLogs: [],
};

export function TelegramOperationsCenter() {
  const [status, setStatus] = useState<TelegramOperationsStatus>(emptyStatus);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [actionState, setActionState] = useState<'idle' | 'loading'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const webhookCommand = useMemo(() => {
    if (!status.config.webhookUrl) {
      return null;
    }

    return [
      'curl -X POST "https://api.telegram.org/bot<TOKEN_BOT>/setWebhook"',
      `  -d "url=${status.config.webhookUrl}"`,
      status.config.webhookSecretConfigured
        ? '  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"'
        : null,
    ].filter(Boolean).join(' \\\n');
  }, [status.config.webhookSecretConfigured, status.config.webhookUrl]);

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

  useEffect(() => {
    void loadStatus();
  }, []);

  async function handleSetWebhook() {
    setActionState('loading');
    setMessage(null);

    try {
      const response = await api.setOperationsTelegramWebhook();
      setStatus(response.data);
      setMessage(response.message ?? 'Webhook Telegram berhasil dipasang.');
      setLoadState('success');
    } catch {
      setMessage('Webhook gagal dipasang. Pastikan token bot dan URL publik sudah benar.');
    } finally {
      setActionState('idle');
    }
  }

  async function copyCommand() {
    if (!webhookCommand) return;
    await navigator.clipboard.writeText(webhookCommand).catch(() => undefined);
    setMessage('Command setWebhook disalin.');
  }

  return (
    <section className="mt-8 space-y-5">
      <div className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Setting Telegram
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Konfigurasi dibaca dari environment backend. Token tidak ditampilkan di browser.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              className="secondary-button rounded-2xl px-4 py-2.5 text-sm font-black"
              onClick={() => void loadStatus()}
              type="button"
            >
              Refresh
            </button>
            <button
              className="school-primary-button rounded-2xl px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              disabled={actionState === 'loading' || !status.config.botTokenConfigured || !status.config.webhookUrl}
              onClick={() => void handleSetWebhook()}
              type="button"
            >
              {actionState === 'loading' ? 'Memasang...' : 'Set Webhook'}
            </button>
          </div>
        </div>

        {loadState === 'error' ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            Status Telegram belum bisa dimuat.
          </p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
            {message}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatusCard
            label="Bot Token"
            status={status.config.botTokenConfigured ? 'Terpasang' : 'Belum diisi'}
            tone={status.config.botTokenConfigured ? 'success' : 'danger'}
            value={status.config.botTokenConfigured ? 'Aman di backend' : 'Isi TELEGRAM_BOT_TOKEN'}
          />
          <StatusCard
            label="Bot Username"
            status={status.config.botUsername ? `@${status.config.botUsername.replace(/^@/, '')}` : 'Belum diisi'}
            tone={status.config.botUsername ? 'success' : 'warning'}
            value="Dipakai untuk tombol aktivasi Profil"
          />
          <StatusCard
            label="Webhook Secret"
            status={status.config.webhookSecretConfigured ? 'Aktif' : 'Opsional kosong'}
            tone={status.config.webhookSecretConfigured ? 'success' : 'warning'}
            value="Melindungi endpoint webhook"
          />
          <StatusCard
            label="Telegram API"
            status={status.provider.reachable ? 'Terhubung' : 'Belum terhubung'}
            tone={status.provider.reachable ? 'success' : 'danger'}
            value={status.provider.lastErrorMessage ?? 'getWebhookInfo berhasil'}
          />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-900">Webhook EduFlow</p>
            <p className="mt-2 break-all text-sm text-slate-700">
              {status.config.webhookUrl ?? 'Belum tersedia. Isi TELEGRAM_WEBHOOK_URL atau FRONTEND_URL.'}
            </p>
            <p className="mt-4 text-sm font-black text-slate-900">Webhook Aktif di Telegram</p>
            <p className="mt-2 break-all text-sm text-slate-700">
              {status.provider.webhookUrl || 'Belum ada webhook aktif.'}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <WebhookStatusPill
                label="Status"
                tone={status.provider.webhookUrl ? 'success' : 'warning'}
                value={status.provider.webhookUrl ? 'Webhook aktif' : 'Belum aktif'}
              />
              <WebhookStatusPill
                label="Target"
                tone={status.provider.webhookUrl === status.config.webhookUrl ? 'success' : 'warning'}
                value={status.provider.webhookUrl === status.config.webhookUrl ? 'Sesuai EduFlow' : 'Perlu set ulang'}
              />
              <WebhookStatusPill
                label="Pending Update"
                tone={(status.provider.pendingUpdateCount ?? 0) > 0 ? 'warning' : 'success'}
                value={String(status.provider.pendingUpdateCount ?? 0)}
              />
              <WebhookStatusPill
                label="Error Terakhir"
                tone={status.provider.lastErrorMessage ? 'danger' : 'success'}
                value={status.provider.lastErrorMessage ?? 'Tidak ada'}
              />
            </div>
            {webhookCommand ? (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-900">Command manual</p>
                  <button
                    className="text-sm font-black text-brand-700 underline-offset-4 hover:underline"
                    onClick={() => void copyCommand()}
                    type="button"
                  >
                    Salin
                  </button>
                </div>
                <pre className="mt-2 overflow-x-auto rounded-2xl bg-slate-900 p-4 text-xs leading-6 text-slate-100">
                  {webhookCommand}
                </pre>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <MetricCard label="User Terhubung" value={status.usage.linkedUsers} />
            <MetricCard label="Log Telegram" value={status.usage.logs.total} />
            <MetricCard label="Terkirim" value={status.usage.logs.sent} />
            <MetricCard label="Gagal" value={status.usage.logs.failed} danger={status.usage.logs.failed > 0} />
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Monitoring Notifikasi Telegram
            </h2>
            <p className="mt-1 text-sm text-muted">
              Log terbaru dari `NotificationLog` dengan channel Telegram.
            </p>
          </div>
          <p className="text-sm font-bold text-muted">
            Pending update: {status.provider.pendingUpdateCount ?? '-'}
          </p>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
          <div className="hidden grid-cols-[1fr_120px_120px_140px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:grid">
            <span>Penerima</span>
            <span>Status</span>
            <span>Attempts</span>
            <span>Waktu</span>
          </div>
          {status.recentLogs.length ? (
            status.recentLogs.map((log) => (
              <div
                className="grid gap-2 border-t border-slate-100 px-4 py-3 text-sm md:grid-cols-[1fr_120px_120px_140px] md:items-center md:gap-3"
                key={log.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-900">
                    {log.recipientName ?? log.recipient}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted">
                    {log.subject ?? log.templateKey ?? 'Telegram'}
                  </p>
                  {log.lastError ? (
                    <p className="mt-1 text-xs font-bold text-rose-700">{log.lastError}</p>
                  ) : null}
                </div>
                <span className={getStatusClass(log.status)}>{log.status}</span>
                <span className="text-sm font-bold text-slate-700">{log.attempts}</span>
                <span className="text-xs font-bold text-muted">
                  {formatDate(log.sentAt ?? log.failedAt ?? log.createdAt)}
                </span>
              </div>
            ))
          ) : (
            <p className="border-t border-slate-100 px-4 py-6 text-sm font-bold text-muted">
              Belum ada log Telegram.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function StatusCard({
  label,
  status,
  tone,
  value,
}: {
  label: string;
  status: string;
  tone: 'success' | 'warning' | 'danger';
  value: string;
}) {
  const toneClass = {
    success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-100 bg-amber-50 text-amber-700',
    danger: 'border-rose-100 bg-rose-50 text-rose-700',
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.1em] opacity-80">{label}</p>
      <p className="mt-2 text-lg font-black">{status}</p>
      <p className="mt-1 text-xs font-bold opacity-80">{value}</p>
    </div>
  );
}

function WebhookStatusPill({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'success' | 'warning' | 'danger';
  value: string;
}) {
  const toneClass = {
    success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-100 bg-amber-50 text-amber-700',
    danger: 'border-rose-100 bg-rose-50 text-rose-700',
  }[tone];

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-[0.65rem] font-black uppercase tracking-[0.08em] opacity-80">
        {label}
      </p>
      <p className="mt-1 break-words text-xs font-black">{value}</p>
    </div>
  );
}

function MetricCard({ danger = false, label, value }: { danger?: boolean; label: string; value: number }) {
  return (
    <div className={danger ? 'rounded-2xl border border-rose-100 bg-rose-50 p-4 text-rose-700' : 'rounded-2xl border border-blue-100 bg-brand-50 p-4 text-brand-700'}>
      <p className="text-xs font-black uppercase tracking-[0.1em] opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-black">{formatNumber(value)}</p>
    </div>
  );
}

function getStatusClass(status: string) {
  if (status === 'SENT') {
    return 'w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700';
  }
  if (status === 'FAILED') {
    return 'w-fit rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700';
  }
  return 'w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}
