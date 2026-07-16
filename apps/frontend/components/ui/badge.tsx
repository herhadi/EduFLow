import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

const toneClass = {
  default: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  brand: 'border-blue-100 bg-blue-50 text-brand-700 dark:border-blue-400/20 dark:bg-blue-500/15 dark:text-blue-100',
  danger: 'border-red-100 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-100',
  muted: 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
  success: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-100',
  warning: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
} as const;

type BadgeProps = ComponentPropsWithoutRef<'span'> & {
  tone?: keyof typeof toneClass;
};

export function Badge({ className, tone = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs font-black leading-4',
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}
