import { type FailedJob, type HealthStatus } from '../../lib/api';
import { formatNumber } from '../../lib/format';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

export function HealthCard({
  detail,
  label,
  status,
  tone,
  value,
}: {
  detail?: string;
  label: string;
  status: HealthStatus;
  tone?: 'danger' | 'success' | 'warning';
  value?: string | number;
}) {
  const cardTone = tone ?? (status === 'Healthy' ? 'success' : 'danger');

  return (
    <Card className="rounded-2xl p-4 shadow-none sm:p-4" tone={cardTone}>
      <p className="text-sm font-semibold text-slate-600 dark:text-[var(--text-soft)]">{label}</p>
      <strong className="mt-2 block text-lg">{value ?? status}</strong>
      <p className="mt-1 text-xs font-semibold opacity-80">{detail ?? status}</p>
    </Card>
  );
}

export function StatusPill({ status }: { status: HealthStatus }) {
  return (
    <Badge tone={status === 'Healthy' ? 'success' : 'danger'}>{status}</Badge>
  );
}

export function QueueCount({
  danger,
  label,
  value,
}: {
  danger?: boolean;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-[var(--border)] dark:bg-[var(--surface-solid)]">
      <p className="text-xs text-muted">{label}</p>
      <strong
        className={
          danger && value > 0
            ? 'text-red-700 dark:text-red-200'
            : 'text-slate-900 dark:text-[var(--text)]'
        }
      >
        {formatNumber(value)}
      </strong>
    </div>
  );
}

export function MetricCard({
  label,
  tone = 'neutral',
  value,
}: {
  label: string;
  tone?: 'danger' | 'info' | 'neutral' | 'warning';
  value: string | number;
}) {
  const toneClass = {
    danger: 'border-red-100 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-200',
    info: 'border-sky-100 bg-sky-50 text-sky-950 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-50',
    neutral: 'border-slate-100 bg-slate-50 text-slate-900 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]',
    warning: 'border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
  }[tone];

  return (
    <article className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold opacity-75">{label}</p>
      <strong className="mt-2 block text-lg">{value}</strong>
    </article>
  );
}

export function PayloadDialog({
  job,
  onClose,
}: {
  job: FailedJob;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-4 sm:place-items-center">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h3 className="text-xl font-bold">Payload Job</h3>
            <p className="text-sm text-muted">
              {job.queueLabel} · {job.name}
            </p>
          </div>
          <Button
            onClick={onClose}
            size="sm"
            variant="outline"
          >
            Tutup
          </Button>
        </div>
        <pre className="max-h-[60vh] overflow-auto bg-slate-950 p-5 text-xs leading-6 text-blue-50">
          {JSON.stringify(job.payload, null, 2)}
        </pre>
      </div>
    </div>
  );
}
