'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  api,
  type NotificationLog,
} from '../lib/api';
import { getNotificationAccess, type NotificationAccess } from '../lib/navigation.config';
import { getCurrentSessionUser } from '../lib/session';
import { NOTIFICATION_CHANGED_EVENT } from './mobile-app-shell';

type LoadState = 'idle' | 'loading' | 'success' | 'error';
type NotificationTab = 'inbox' | 'sent' | 'pending' | 'failed' | 'retry';

const tabs: Array<{ id: NotificationTab; label: string; description: string }> = [
  {
    id: 'inbox',
    label: 'Inbox',
    description: 'Notifikasi pribadi untuk akun yang sedang login.',
  },
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
  const router = useRouter();
  const [personalInboxRole, setPersonalInboxRole] = useState<
    'teacher' | 'principal' | 'parent' | null
  >(null);
  const [notificationAccess, setNotificationAccess] = useState<NotificationAccess | null>(null);
  const [myNotifications, setMyNotifications] = useState<NotificationLog[]>([]);
  const [activeTab, setActiveTab] = useState<NotificationTab>('inbox');
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
      const access = getNotificationAccess(getCurrentSessionUser()?.roles ?? []);
      setNotificationAccess(access);
      setPersonalInboxRole(access.mode === 'personal' ? access.audience : null);

      if (access.mode === 'personal') {
        const response = await api.getMyNotifications();
        setMyNotifications(response.data);
        setLoadState('success');
        return;
      }

      const [mineResponse, sentResponse, pendingResponse, failedResponse, retryResponse] =
        await Promise.all([
          api.getMyNotifications(),
          api.getSentNotifications(),
          api.getPendingNotifications(),
          api.getFailedNotifications(),
          access.canRetry ? api.getRetryNotifications() : Promise.resolve({ data: [] }),
        ]);

      setMyNotifications(mineResponse.data);
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

  if (personalInboxRole) {
    return (
      <PersonalNotificationInbox
        items={myNotifications}
        loadState={loadState}
        onRefresh={loadNotifications}
        role={personalInboxRole}
      />
    );
  }

  const visibleTabs = notificationAccess?.mode === 'operational' && !notificationAccess.canRetry
    ? tabs.filter((tab) => tab.id !== 'retry')
    : tabs;

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
    <section className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="min-w-0 rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60">
        <p className="px-3 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
          Notifikasi
        </p>
        <nav className="no-scrollbar mt-4 flex gap-2 overflow-x-auto lg:block lg:space-y-2 lg:overflow-visible">
          {visibleTabs.map((tab) => (
            <button
              className={[
                'flex shrink-0 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition lg:w-full',
                activeTab === tab.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-brand-50 text-brand-700 hover:bg-blue-100 lg:bg-transparent lg:text-slate-700 lg:hover:bg-slate-100',
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

      <div className="min-w-0 rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {visibleTabs.find((tab) => tab.id === activeTab)?.label}
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

        <div className="mt-6 min-w-0">
          {activeTab === 'sent' ? <NotificationTable items={sent} /> : null}
          {activeTab === 'inbox' ? (
            <OperationalInboxTable
              items={myNotifications}
              onOpen={openOperationalNotification}
            />
          ) : null}
          {activeTab === 'pending' ? <NotificationTable items={pending} /> : null}
          {activeTab === 'failed' ? (
            <NotificationTable items={failed} />
          ) : null}
          {activeTab === 'retry' && notificationAccess?.mode === 'operational' && notificationAccess.canRetry ? (
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
    if (tab === 'inbox') {
      return myNotifications.filter((notification) => !notification.readAt).length;
    }

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

  async function openOperationalNotification(item: NotificationLog) {
    if (!item.readAt) {
      await api.markMyNotificationAsRead(item.id);
      window.dispatchEvent(new Event(NOTIFICATION_CHANGED_EVENT));
      await loadNotifications();
    }

    if (item.actionUrl) router.push(item.actionUrl);
  }
}

function PersonalNotificationInbox({
  items,
  loadState,
  onRefresh,
  role,
}: {
  items: NotificationLog[];
  loadState: LoadState;
  onRefresh: () => Promise<void>;
  role: 'teacher' | 'principal' | 'parent';
}) {
  const router = useRouter();
  const isPrincipal = role === 'principal';
  const isParent = role === 'parent';

  async function openNotification(item: NotificationLog) {
    if (!item.readAt) {
      await api.markMyNotificationAsRead(item.id);
      window.dispatchEvent(new Event(NOTIFICATION_CHANGED_EVENT));
    }
    if (item.actionUrl) router.push(item.actionUrl);
    else await onRefresh();
  }

  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              {isPrincipal ? 'Inbox Kepala Sekolah' : isParent ? 'Inbox Orang Tua' : 'Inbox Guru'}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              Pemberitahuan Saya
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {isPrincipal
                ? 'Approval perangkat ajar dan nilai, kelas kosong, keterlambatan submit, serta ringkasan sekolah.'
                : isParent
                  ? 'Ringkasan presensi dan pengumuman akademik untuk anak Anda.'
                : 'Reminder kelas, koreksi presensi, revisi perangkat ajar, dan status penilaian.'}
            </p>
          </div>
          <button
            className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-brand-700"
            onClick={() => void onRefresh()}
            type="button"
          >
            Refresh
          </button>
        </div>
      </div>

      {loadState === 'error' ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          Notifikasi pribadi belum bisa dimuat.
        </div>
      ) : null}

      {loadState === 'loading' ? (
        <p className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-brand-700">
          Memuat notifikasi pribadi...
        </p>
      ) : null}

      {loadState === 'success' && !items.length ? (
        <div className="rounded-[2rem] border border-blue-100 bg-white p-5 text-sm leading-6 text-muted shadow-sm shadow-blue-100/60">
          {isPrincipal
            ? 'Belum ada notifikasi yang membutuhkan perhatian Kepala Sekolah.'
            : isParent
              ? 'Belum ada notifikasi untuk akun orang tua ini.'
            : 'Belum ada notifikasi untuk akun guru ini. Reminder hanya muncul jika kontak guru sudah lengkap dan job terkait sudah dibuat.'}
        </div>
      ) : null}

      <div className="grid gap-3">
        {items.map((item) => (
          <button
            className={`w-full rounded-[1.75rem] border p-4 text-left shadow-sm transition ${getInboxTone(item.templateKey)}`}
            key={item.id}
            onClick={() => void openNotification(item)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-black ${getInboxLabelTone(item.templateKey)}`}>
                  {getPersonalNotificationLabel(item.templateKey, role)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{item.message}</p>
              </div>
              {!item.readAt ? (
                <span className="size-2.5 shrink-0 rounded-full bg-rose-500" />
              ) : null}
            </div>
            <p className="mt-3 text-xs font-semibold text-muted">
              {formatDateTime(item.sentAt ?? item.failedAt ?? item.createdAt)}
            </p>
            {item.actionUrl ? <p className={`mt-3 text-xs font-black ${getInboxLabelTone(item.templateKey)}`}>{isPrincipal ? 'Buka Review' : 'Buka Detail'} →</p> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function OperationalInboxTable({
  items,
  onOpen,
}: {
  items: NotificationLog[];
  onOpen: (notification: NotificationLog) => Promise<void>;
}) {
  if (!items.length) {
    return (
      <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted">
        Tidak ada notifikasi pribadi untuk akun ini.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <button
          className="w-full rounded-2xl border border-blue-100 bg-white p-4 text-left shadow-sm shadow-blue-100/60 transition hover:border-brand-300 hover:bg-brand-50/40"
          key={item.id}
          onClick={() => void onOpen(item)}
          type="button"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-brand-700">
                {item.subject ?? 'Notifikasi'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{item.message}</p>
            </div>
            {!item.readAt ? (
              <span className="size-2.5 shrink-0 rounded-full bg-rose-500" />
            ) : null}
          </div>
          <p className="mt-3 text-xs font-semibold text-muted">
            {formatDateTime(item.sentAt ?? item.failedAt ?? item.createdAt)}
          </p>
          {item.actionUrl ? (
            <p className="mt-3 text-xs font-black text-brand-700">Buka Detail →</p>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function getInboxTone(templateKey?: string | null) {
  if (templateKey === 'teaching-plan.revision-requested') return 'border-amber-200 bg-amber-50 shadow-amber-100/60 hover:border-amber-300 dark:border-amber-800 dark:bg-amber-950/35';
  if (templateKey === 'teaching-plan.approved') return 'border-emerald-200 bg-emerald-50 shadow-emerald-100/60 hover:border-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/35';
  return 'border-blue-100 bg-white shadow-blue-100/60 hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-800 dark:bg-slate-950';
}

function getInboxLabelTone(templateKey?: string | null) {
  if (templateKey === 'teaching-plan.revision-requested') return 'text-amber-700 dark:text-amber-300';
  if (templateKey === 'teaching-plan.approved') return 'text-emerald-700 dark:text-emerald-300';
  return 'text-brand-700';
}

function getPersonalNotificationLabel(
  templateKey: string | null | undefined,
  role: 'teacher' | 'principal' | 'parent',
) {
  if (role === 'principal') {
    if (templateKey?.startsWith('teaching-plan.')) return 'Review Perangkat Ajar';
    if (templateKey?.startsWith('student-grade.')) return 'Approval Nilai';
    if (templateKey?.startsWith('attendance.class.empty')) return 'Kelas Kosong';
    if (templateKey?.startsWith('attendance.teacher.not-submitted')) return 'Belum Submit';
    if (templateKey?.startsWith('attendance.correction.')) return 'Koreksi Penting';
    if (templateKey?.startsWith('teacher.substitute.')) return 'Guru Pengganti';
    if (templateKey?.startsWith('school.summary.')) return 'Ringkasan Sekolah';
    if (templateKey?.startsWith('academic.announcement.')) return 'Pengumuman Akademik';
    return 'Informasi Kepala Sekolah';
  }

  if (role === 'parent') {
    if (templateKey?.startsWith('attendance.summary.')) return 'Ringkasan Presensi';
    if (templateKey?.startsWith('academic.announcement.')) return 'Pengumuman Sekolah';
    return 'Informasi Anak';
  }

  if (templateKey?.startsWith('teacher.reminder.')) {
    return 'Reminder Kelas';
  }

  if (templateKey?.startsWith('attendance.correction.')) {
    return 'Koreksi Presensi';
  }

  if (templateKey?.startsWith('teaching-plan.')) {
    return 'Perangkat Ajar';
  }

  if (templateKey?.startsWith('student-grade.')) {
    return 'Penilaian';
  }

  return 'Informasi Guru';
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
    <>
      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <article
            className="rounded-2xl border border-blue-100 bg-slate-50 p-4"
            key={item.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <StatusPill label={item.channel} status={item.status} />
                <h3 className="mt-3 truncate text-sm font-bold text-slate-800">
                  {item.recipientName ?? item.recipient}
                </h3>
                <p className="mt-1 text-xs text-muted">{item.recipient}</p>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-muted">
                {item.attempts}x
              </span>
            </div>

            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700">
              {item.message}
            </p>
            {item.lastError ? (
              <p className="mt-2 text-xs leading-5 text-red-600">
                {item.lastError}
              </p>
            ) : null}
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-muted">
                {formatDateTime(item.sentAt ?? item.failedAt ?? item.createdAt)}
              </p>
              {onRetry ? (
                <button
                  className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={actionState === 'loading'}
                  onClick={() => void onRetry(item)}
                  type="button"
                >
                  Retry
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
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
    </>
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
