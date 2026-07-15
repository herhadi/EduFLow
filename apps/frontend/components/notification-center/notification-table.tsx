import { type NotificationLog } from '../../lib/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { Table, TableShell } from '../ui/table';
import { formatNotificationDateTime } from './notification-center-utils';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

type NotificationTableProps = {
  actionState?: LoadState;
  items: NotificationLog[];
  onRetry?: (notification: NotificationLog) => Promise<void>;
};

export function NotificationTable({
  actionState,
  items,
  onRetry,
}: NotificationTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState title="Belum ada data notifikasi." />
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
                {formatNotificationDateTime(item.sentAt ?? item.failedAt ?? item.createdAt)}
              </p>
              {onRetry ? (
                <Button
                  disabled={actionState === 'loading'}
                  onClick={() => void onRetry(item)}
                  size="sm"
                >
                  Retry
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <TableShell className="hidden md:block">
        <Table className="min-w-[760px]">
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
                  {formatNotificationDateTime(item.sentAt ?? item.failedAt ?? item.createdAt)}
                </td>
                {onRetry ? (
                  <td className="px-4 py-4">
                    <Button
                      disabled={actionState === 'loading'}
                      onClick={() => void onRetry(item)}
                      size="sm"
                    >
                      Retry
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </Table>
      </TableShell>
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

  return <Badge className={className} tone="muted">{label}</Badge>;
}
