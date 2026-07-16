import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

export function FormField({
  children,
  className,
  label,
  hint,
  ...props
}: ComponentPropsWithoutRef<'label'> & {
  hint?: string;
  label: string;
}) {
  return (
    <label className={cn('grid gap-2 text-xs font-black text-slate-700 dark:text-slate-200', className)} {...props}>
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-semibold text-muted">{hint}</span> : null}
    </label>
  );
}

export const fieldClass =
  'min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
