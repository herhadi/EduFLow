import { type FailedJob, type HealthStatus } from '../../lib/api';
import { formatNumber } from '../../lib/format';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export function HealthCard({ label, status }: { label: string; status: HealthStatus }) {
  const isHealthy = status === 'Healthy';

  return (
    <article
      className={`rounded-2xl border p-4 ${
        isHealthy
          ? 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/15 dark:text-blue-200'
          : 'border-red-100 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-200'
      }`}
    >
      <p className="text-sm font-semibold text-slate-600 dark:text-[var(--text-soft)]">{label}</p>
      <strong className="mt-2 block text-lg">{status}</strong>
    </article>
  );
}

export function StatusPill({ status }: { status: HealthStatus }) {
  return (
    <Badge tone={status === 'Healthy' ? 'brand' : 'danger'}>{status}</Badge>
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
