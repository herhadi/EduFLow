'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  api,
  type NotificationLog,
} from '../lib/api';
import { getNotificationAccess, type NotificationAccess } from '../lib/navigation.config';
import { dispatchNotificationChanged } from '../lib/notifications';
import { getCurrentSessionUser } from '../lib/session';
import {
  formatNotificationDateTime,
  notificationTabs,
  type NotificationTab,
} from './notification-center/notification-center-utils';
import { NotificationTable } from './notification-center/notification-table';
import { PersonalNotificationInbox } from './notification-center/personal-notification-inbox';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { EmptyState } from './ui/empty-state';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

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
    () => notificationTabs.find((tab) => tab.id === activeTab)?.description,
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
    ? notificationTabs.filter((tab) => tab.id !== 'retry')
    : notificationTabs;

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
      <aside className="min-w-0 rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm">
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

      <Card className="min-w-0 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {visibleTabs.find((tab) => tab.id === activeTab)?.label}
            </h2>
            <p className="mt-1 text-sm text-muted">{activeDescription}</p>
          </div>
          <Button
            onClick={() => void loadNotifications()}
            size="sm"
            variant="outline"
          >
            Refresh
          </Button>
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
      </Card>
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
      dispatchNotificationChanged();
      await loadNotifications();
    }

    if (item.actionUrl) router.push(item.actionUrl);
  }
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
      <EmptyState title="Tidak ada notifikasi pribadi untuk akun ini." />
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <button
          className="w-full rounded-2xl border border-blue-100 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:bg-brand-50/40"
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
            {formatNotificationDateTime(item.sentAt ?? item.failedAt ?? item.createdAt)}
          </p>
          {item.actionUrl ? (
            <p className="mt-3 text-xs font-black text-brand-700">Buka Detail →</p>
          ) : null}
        </button>
      ))}
    </div>
  );
}
