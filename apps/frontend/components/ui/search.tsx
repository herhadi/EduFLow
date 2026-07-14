import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

type SearchInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'> & {
  onClear?: () => void;
};

export function SearchInput({
  className,
  onClear,
  value,
  ...props
}: SearchInputProps) {
  const hasValue = typeof value === 'string' && value.length > 0;

  return (
    <div className={cn('relative min-w-0', className)}>
      <input
        className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-semibold outline-none focus:border-brand-600"
        type="search"
        value={value}
        {...props}
      />
      {onClear && hasValue ? (
        <button
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-xl px-2 py-1 text-xs font-black text-muted hover:bg-slate-50 hover:text-slate-800"
          onClick={onClear}
          type="button"
        >
          Hapus
        </button>
      ) : null}
    </div>
  );
}
