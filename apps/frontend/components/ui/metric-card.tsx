import { formatNumber } from '../../lib/format';
import { cn } from '../../lib/cn';

const toneClass = {
  default: 'border-slate-200 bg-white text-brand-700',
  good: 'border-blue-100 bg-blue-50 text-blue-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
  danger: 'border-red-100 bg-red-50 text-red-700',
} as const;

export function MetricCard({
  description,
  label,
  tone = 'default',
  value,
}: {
  description?: string;
  label: string;
  tone?: keyof typeof toneClass;
  value: number;
}) {
  return (
    <article
      className={cn(
        'rounded-3xl border p-4 shadow-sm shadow-slate-100 sm:p-5',
        toneClass[tone],
      )}
    >
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <strong className="mt-2 block text-3xl font-bold tracking-tight sm:text-4xl">
        {formatNumber(value)}
      </strong>
      {description ? (
        <span className="mt-2 block text-xs leading-5 text-slate-500">{description}</span>
      ) : null}
    </article>
  );
}
