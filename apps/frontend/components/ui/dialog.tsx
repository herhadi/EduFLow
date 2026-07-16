import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';
import { Button } from './button';

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
    <div className="fixed inset-0 z-50 grid min-h-dvh place-items-center bg-slate-950/40 p-4">
      <div
        aria-modal="true"
        className={cn('w-full max-w-lg rounded-[2rem] bg-white p-5 shadow-2xl dark:bg-slate-950 dark:text-slate-100', className)}
        role="dialog"
        {...props}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm font-semibold text-muted">{description}</p>
            ) : null}
          </div>
          <Button aria-label="Tutup dialog" onClick={onClose} size="sm" variant="outline">
            Tutup
          </Button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
