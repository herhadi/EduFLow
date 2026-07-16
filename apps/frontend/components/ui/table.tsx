import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

export function TableShell({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn('w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950', className)}
      {...props}
    />
  );
}

export function Table({ className, ...props }: ComponentPropsWithoutRef<'table'>) {
  return (
    <table
      className={cn('w-full min-w-full border-collapse text-left text-sm', className)}
      {...props}
    />
  );
}
