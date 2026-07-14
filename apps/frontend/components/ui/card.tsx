import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

export function Card({ className, ...props }: ComponentPropsWithoutRef<'section'>) {
  return (
    <section
      className={cn(
        'rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60 sm:p-5',
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
