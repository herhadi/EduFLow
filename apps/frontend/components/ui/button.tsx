import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

const variantClass = {
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-500',
  ghost: 'border border-transparent bg-transparent text-slate-700 hover:bg-slate-50 disabled:text-slate-400 dark:text-slate-200 dark:hover:bg-slate-800 dark:disabled:text-slate-600',
  outline: 'border border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:text-brand-700 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-400/50 dark:hover:text-blue-100 dark:disabled:bg-slate-900 dark:disabled:text-slate-600',
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-500',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500',
  warning: 'bg-amber-500 text-white hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-500',
} as const;

const sizeClass = {
  sm: 'rounded-xl px-3 py-2 text-xs',
  md: 'rounded-2xl px-4 py-3 text-sm',
  lg: 'rounded-2xl px-5 py-3.5 text-sm',
} as const;

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  size?: keyof typeof sizeClass;
  variant?: keyof typeof variantClass;
};

export function Button({
  className,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-w-0 items-center justify-center gap-2 font-black transition disabled:cursor-not-allowed',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
