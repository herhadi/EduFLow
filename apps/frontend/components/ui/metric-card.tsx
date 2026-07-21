import { formatNumber } from '../../lib/format';
import { cn } from '../../lib/cn';

const toneClass = {
  default: 'border-slate-200 bg-white text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-100',
  good: 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/15 dark:text-blue-100',
  warning: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
  danger: 'border-red-100 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-100',
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
        'group relative overflow-hidden rounded-2xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-4',
        toneClass[tone],
      )}
    >
      <p className="relative min-h-8 text-xs font-semibold leading-4 text-slate-600 dark:text-slate-200 sm:text-sm">{label}</p>
      <strong className="relative mt-1.5 block text-2xl font-black sm:text-3xl">
        {formatNumber(value)}
      </strong>
      {description ? (
        <span className="mt-1.5 block text-xs leading-4 text-slate-500 dark:text-slate-300">{description}</span>
      ) : null}
    </article>
  );
}
