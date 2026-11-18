import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';
import { X } from 'lucide-react';

type DialogProps = ComponentPropsWithoutRef<'div'> & {
  description?: string;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function Dialog({
  children,
  className,
  description,
  onClose,
  open,
  title,
  ...props
}: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex min-h-dvh items-center justify-center overflow-y-auto bg-slate-950/55 px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-[2px] sm:p-4">
      <div
        aria-modal="true"
        className={cn('my-auto max-h-[min(calc(100dvh-6.5rem),820px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-[var(--border)] dark:bg-slate-950 dark:text-slate-100 sm:max-h-[min(92dvh,820px)] sm:p-5', className)}
        role="dialog"
        {...props}
      >
        <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 pb-3 pt-4 dark:border-[var(--border)] dark:bg-slate-950 sm:-mx-5 sm:-mt-5 sm:px-5 sm:pt-5">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm font-medium leading-5 text-muted">{description}</p>
            ) : null}
          </div>
          <button
            aria-label="Tutup dialog"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-[var(--border)] dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
