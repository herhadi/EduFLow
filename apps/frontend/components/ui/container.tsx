import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

export function Container({
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)}
      {...props}
    />
  );
}
