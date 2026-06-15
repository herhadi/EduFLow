import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

export function Container({
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn('mx-auto w-full px-1 sm:px-2 md:px-3', className)}
      {...props}
    />
  );
}
