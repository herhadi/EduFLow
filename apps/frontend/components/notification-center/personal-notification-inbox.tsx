'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type NotificationLog } from '../../lib/api';
import { dispatchNotificationChanged } from '../../lib/notifications';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { LoadingState } from '../ui/loading';
import { SurfaceCard } from '../ui/card';
import {
  formatNotificationDateTime,
  getInboxLabelTone,
  getInboxTone,
  getPersonalNotificationLabel,
  notificationTabs,
  type NotificationTab,
  type PersonalInboxRole,
} from './notification-center-utils';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

type PersonalNotificationInboxProps = {
  items: NotificationLog[];
  loadState: LoadState;
  onRefresh: () => Promise<void>;
  role: PersonalInboxRole;
  sentItems: NotificationLog[];
};

export function PersonalNotificationInbox({
  items,
  loadState,
  onRefresh,
  role,
  sentItems,
}: PersonalNotificationInboxProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<NotificationTab>('inbox');
  const isPrincipal = role === 'principal';
  const isParent = role === 'parent';

  async function openNotification(item: NotificationLog) {
    if (!item.readAt) {
      await api.markMyNotificationAsRead(item.id);
      dispatchNotificationChanged();
    }
    if (item.actionUrl) router.push(item.actionUrl);
    else await onRefresh();
  }

  return (
    <section className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="surface-card min-w-0 rounded-[2rem] p-4 sm:p-5">
        <p className="px-3 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
          Kategori
        </p>
        <nav className="no-scrollbar mt-4 flex gap-2 overflow-x-auto lg:block lg:space-y-2 lg:overflow-visible">
          {notificationTabs.map((tab) => (
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
              <span className="text-xs opacity-80">
                {getTabCount(tab.id)}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <SurfaceCard className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              {isPrincipal ? 'Inbox Kepala Sekolah' : isParent ? 'Inbox Orang Tua' : 'Inbox Guru'}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
              {activeTab === 'inbox' ? 'Pemberitahuan Saya' : notificationTabs.find((tab) => tab.id === activeTab)?.label}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {activeTab === 'inbox'
                ? isPrincipal
                  ? 'Approval perangkat ajar dan nilai, kelas kosong, keterlambatan submit, serta ringkasan sekolah.'
                  : isParent
                    ? 'Ringkasan presensi dan pengumuman akademik untuk anak Anda.'
                    : 'Reminder kelas, koreksi presensi, revisi perangkat ajar, dan status penilaian.'
                : activeTab === 'sent'
                  ? 'Riwayat notifikasi yang muncul dari aksi Anda, lengkap dengan status sudah dibaca penerima atau belum.'
                  : 'Notifikasi personal yang gagal dikirim atau belum terselesaikan.'}
            </p>
          </div>
          <Button
            onClick={() => void onRefresh()}
            size="sm"
            variant="outline"
          >
            Refresh
          </Button>
        </div>

        {loadState === 'error' ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100">
            Notifikasi pribadi belum bisa dimuat.
          </div>
        ) : null}

        {loadState === 'loading' ? (
          <LoadingState label="Memuat notifikasi pribadi..." />
        ) : null}

        {activeTab === 'inbox' && loadState === 'success' && !items.length ? (
          <EmptyState
            className="mt-6 rounded-[2rem] bg-white shadow-sm dark:bg-slate-950"
            title={
              isPrincipal
                ? 'Belum ada notifikasi yang membutuhkan perhatian Kepala Sekolah.'
                : isParent
                  ? 'Belum ada notifikasi untuk akun orang tua ini.'
                  : 'Belum ada notifikasi untuk akun guru ini.'
            }
            description={
              isPrincipal || isParent
                ? undefined
                : 'Reminder hanya muncul jika kontak guru sudah lengkap dan job terkait sudah dibuat.'
            }
          />
        ) : null}

        {activeTab === 'inbox' ? (
          <div className="mt-6 grid gap-3">
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
                  <p className={`mt-3 text-xs font-black ${getInboxLabelTone(item.templateKey)}`}>
                    {isPrincipal ? 'Buka Review' : 'Buka Detail'} →
                  </p>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}

        {activeTab === 'sent' ? (
          <SentNotificationList items={sentItems.filter((item) => item.status === 'SENT')} />
        ) : null}

        {activeTab === 'failed' ? (
          <SentNotificationList emptyTitle="Belum ada notifikasi personal yang gagal." items={sentItems.filter((item) => item.status === 'FAILED')} />
        ) : null}
      </SurfaceCard>
    </section>
  );

  function getTabCount(tab: NotificationTab) {
    if (tab === 'inbox') return items.filter((notification) => !notification.readAt).length;
    if (tab === 'sent') return sentItems.filter((notification) => notification.status === 'SENT').length;
    return sentItems.filter((notification) => notification.status === 'FAILED').length;
  }
}

function SentNotificationList({
  emptyTitle = 'Belum ada notifikasi personal terkirim.',
  items,
}: {
  emptyTitle?: string;
  items: NotificationLog[];
}) {
  if (!items.length) {
    return (
      <EmptyState
        className="mt-6 rounded-[2rem] bg-white shadow-sm dark:bg-slate-950"
        title={emptyTitle}
      />
    );
  }

  return (
    <div className="mt-6 grid gap-3">
      {items.map((item) => (
        <article
          className="rounded-[1.75rem] border border-blue-100 bg-white p-4 text-left shadow-sm dark:border-slate-700 dark:bg-slate-950"
          key={item.id}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-brand-700 dark:text-blue-100">
                {item.subject ?? 'Notifikasi terkirim'}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted">
                Ke: {item.recipientName ?? item.recipient}
              </p>
            </div>
            <span className={[
              'rounded-full px-3 py-1 text-xs font-black',
              item.readAt
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100',
            ].join(' ')}>
              {item.readAt ? 'Dibaca' : 'Belum dibaca'}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
            {item.message}
          </p>
          <p className="mt-3 text-xs font-semibold text-muted">
            {formatNotificationDateTime(item.sentAt ?? item.failedAt ?? item.createdAt)}
          </p>
        </article>
      ))}
    </div>
  );
}
