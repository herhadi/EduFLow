import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

type LoadingStateProps = ComponentPropsWithoutRef<'div'> & {
  label?: string;
};

export function LoadingState({
  className,
  label = 'Memuat data...',
  ...props
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-black text-brand-700 dark:border-blue-400/20 dark:bg-blue-500/15 dark:text-blue-100',
        className,
      )}
      {...props}
    >
      <span className="size-3 animate-pulse rounded-full bg-brand-600" />
      {label}
    </div>
  );
}
