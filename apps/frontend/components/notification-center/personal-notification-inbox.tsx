'use client';

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
  type PersonalInboxRole,
} from './notification-center-utils';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

type PersonalNotificationInboxProps = {
  items: NotificationLog[];
  loadState: LoadState;
  onRefresh: () => Promise<void>;
  role: PersonalInboxRole;
};

export function PersonalNotificationInbox({
  items,
  loadState,
  onRefresh,
  role,
}: PersonalNotificationInboxProps) {
  const router = useRouter();
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
    <section className="mt-6 space-y-4">
      <SurfaceCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-brand-600 uppercase">
              {isPrincipal ? 'Inbox Kepala Sekolah' : isParent ? 'Inbox Orang Tua' : 'Inbox Guru'}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
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
          <Button
            onClick={() => void onRefresh()}
            size="sm"
            variant="outline"
          >
            Refresh
          </Button>
        </div>
      </SurfaceCard>

      {loadState === 'error' ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100">
          Notifikasi pribadi belum bisa dimuat.
        </div>
      ) : null}

      {loadState === 'loading' ? (
        <LoadingState label="Memuat notifikasi pribadi..." />
      ) : null}

      {loadState === 'success' && !items.length ? (
        <EmptyState
          className="rounded-[2rem] bg-white shadow-sm dark:bg-slate-950"
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
    </section>
  );
}
