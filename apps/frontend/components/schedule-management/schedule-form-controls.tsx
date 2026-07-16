import { useRef } from 'react';
import { formatDateDisplay } from './schedule-management-utils';

export function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold text-slate-700 dark:text-[var(--text-soft)]">
      <span className="min-w-0 truncate">{label}</span>
      <select
        className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-brand-600 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]"
        onChange={(event) => onChange(event.target.value)}
        required
        value={value}
      >
        <option value="">Pilih {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function InputField({
  label,
  onChange,
  required = true,
  type = 'text',
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: 'date' | 'time' | 'text';
  value: string;
}) {
  const isDate = type === 'date';
  const inputRef = useRef<HTMLInputElement>(null);

  function openDatePicker() {
    const input = inputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!input) return;

    if (input.showPicker) {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold text-slate-700 dark:text-[var(--text-soft)]">
      <span className="min-w-0 truncate">{label}</span>
      {isDate ? (
        <span
          className="date-picker-control grid min-w-0 grid-cols-[minmax(0,1fr)_2rem] items-center gap-1 rounded-xl py-1 pl-3 pr-1"
          onClick={openDatePicker}
        >
          <span aria-hidden="true" className="date-picker-control__value truncate text-sm font-normal">
            {value ? formatDateDisplay(value) : 'Pilih tanggal'}
          </span>
          <input
            className="date-picker-control__input"
            onChange={(event) => onChange(event.target.value)}
            ref={inputRef}
            required={required}
            type={type}
            value={value}
          />
          <button
            aria-label={`Pilih ${label.toLowerCase()}`}
            className="date-picker-control__button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openDatePicker();
            }}
            type="button"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </span>
      ) : (
        <input
          className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-brand-600 dark:border-[var(--border)] dark:bg-[var(--surface-soft)] dark:text-[var(--text)]"
          onChange={(event) => onChange(event.target.value)}
          required={required}
          type={type}
          value={value}
        />
      )}
    </label>
  );
}

export function DateControl({
  description,
  label,
  onChange,
  value,
}: {
  description: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <InputField label={label} onChange={onChange} type="date" value={value} />
      <p className="mt-1.5 min-h-8 text-[11px] font-semibold leading-4 text-slate-600 dark:text-[var(--text-soft)]">
        {description}
      </p>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <rect height="18" rx="2" width="18" x="3" y="4" />
    </svg>
  );
}
