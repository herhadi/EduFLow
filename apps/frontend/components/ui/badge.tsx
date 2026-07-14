import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

const toneClass = {
  default: 'border-slate-200 bg-slate-50 text-slate-700',
  brand: 'border-blue-100 bg-blue-50 text-brand-700',
  danger: 'border-red-100 bg-red-50 text-red-700',
  muted: 'border-slate-200 bg-white text-slate-600',
  success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
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
