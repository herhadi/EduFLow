import { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

type EmptyStateProps = ComponentPropsWithoutRef<'div'> & {
  action?: ReactNode;
  description?: string;
  title: string;
};

export function EmptyState({
  action,
  className,
  description,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
      {...props}
    >
      <p className="font-black text-slate-800 dark:text-slate-100">{title}</p>
      {description ? <p className="mt-1 font-semibold text-muted">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
