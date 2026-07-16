import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

const cardToneClass = {
  default: 'border-blue-100 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
  danger: 'border-red-100 bg-red-50 text-red-800 dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-100',
  success: 'border-emerald-100 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-100',
  warning: 'border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-100',
} as const;

type CardProps = ComponentPropsWithoutRef<'section'> & {
  tone?: keyof typeof cardToneClass;
};

export function Card({ className, tone = 'default', ...props }: CardProps) {
  return (
    <section
      className={cn(
        'rounded-[2rem] border p-4 shadow-sm sm:p-5',
        cardToneClass[tone],
        className,
      )}
      {...props}
    />
  );
}

export function SurfaceCard({ className, ...props }: ComponentPropsWithoutRef<'section'>) {
  const classes = cn('surface-card rounded-[2rem] p-4 sm:p-5', className);

  return (
    <section
      className={classes}
      {...props}
    />
  );
}

type SurfaceFormCardProps = ComponentPropsWithoutRef<'form'>;

export function SurfaceFormCard({ className, ...props }: SurfaceFormCardProps) {
  return (
    <form
      className={cn('surface-card rounded-[2rem] p-4 sm:p-5', className)}
      {...props}
    />
  );
}
