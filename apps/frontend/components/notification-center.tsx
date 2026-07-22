'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  api,
  type NotificationLog,
} from '../lib/api';
import { getNotificationAccess } from '../lib/navigation.config';
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
  const [myNotifications, setMyNotifications] = useState<NotificationLog[]>([]);
  const [mySentNotifications, setMySentNotifications] = useState<NotificationLog[]>([]);
  const [activeTab, setActiveTab] = useState<NotificationTab>('inbox');
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [sent, setSent] = useState<NotificationLog[]>([]);
  const [failed, setFailed] = useState<NotificationLog[]>([]);

  async function loadNotifications() {
    setLoadState('loading');

    try {
      const access = getNotificationAccess(getCurrentSessionUser()?.roles ?? []);
      setPersonalInboxRole(access.mode === 'personal' ? access.audience : null);

      if (access.mode === 'personal') {
        const [response, sentResponse] = await Promise.all([
          api.getMyNotifications(),
          api.getMySentNotifications(),
        ]);
        setMyNotifications(response.data);
        setMySentNotifications(sentResponse.data);
        setLoadState('success');
        return;
      }

      const [mineResponse, sentResponse, failedResponse] =
        await Promise.all([
          api.getMyNotifications(),
          api.getSentNotifications(),
          api.getFailedNotifications(),
        ]);

      setMyNotifications(mineResponse.data);
      setSent(sentResponse.data);
      setFailed(failedResponse.data);
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
        sentItems={mySentNotifications}
      />
    );
  }

  const visibleTabs = notificationTabs;

  return (
    <section className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="surface-card min-w-0 rounded-[2rem] p-4 sm:p-5">
        <p className="px-3 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
          Kategori
        </p>
        <nav className="no-scrollbar mt-4 flex gap-2 overflow-x-auto lg:block lg:space-y-2 lg:overflow-visible">
          {visibleTabs.map((tab) => (
            <button
              className={[
                'flex shrink-0 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition lg:w-full',
                activeTab === tab.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-brand-50 text-brand-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-100 dark:hover:bg-blue-500/20 lg:bg-transparent lg:text-slate-700 lg:hover:bg-slate-100 lg:dark:bg-transparent lg:dark:text-slate-200 lg:dark:hover:bg-slate-800',
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
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100">
            Notifikasi belum bisa dimuat. Pastikan backend berjalan.
          </div>
        ) : null}

        <div className="mt-6 min-w-0">
          {activeTab === 'sent' ? <NotificationTable items={sent} /> : null}
          {activeTab === 'inbox' ? (
            <OperationalInboxTable
              items={myNotifications}
              onOpen={openOperationalNotification}
            />
          ) : null}
          {activeTab === 'failed' ? (
            <NotificationTable items={failed} />
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

    if (tab === 'failed') {
      return failed.length;
    }

    return 0;
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
          className="w-full rounded-2xl border border-blue-100 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-400/40 dark:hover:bg-blue-500/10"
          key={item.id}
          onClick={() => void onOpen(item)}
          type="button"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-brand-700">
                {item.subject ?? 'Notifikasi'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{item.message}</p>
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
