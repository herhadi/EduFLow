type StatTone = 'danger' | 'good' | 'neutral' | 'warning';

export function ReportFilterStat({
  label,
  tone = 'neutral',
  value,
}: {
  label: string;
  tone?: StatTone;
  value: number;
}) {
  const toneClass = {
    danger: 'border-red-100 bg-red-50 text-red-700',
    good: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    neutral: 'border-slate-100 bg-slate-50 text-slate-700',
    warning: 'border-amber-100 bg-amber-50 text-amber-700',
  }[tone];

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <p className="text-xl font-black">{value}</p>
      <p className="text-[11px] font-black">{label}</p>
    </div>
  );
}

export function CompactSummaryStat({
  label,
  shortLabel,
  tone = 'neutral',
  value,
}: {
  label: string;
  shortLabel?: string;
  tone?: StatTone;
  value: number;
}) {
  const toneClass = {
    danger: 'border-red-100 bg-red-50 text-red-700',
    good: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    neutral: 'border-slate-100 bg-white text-slate-700',
    warning: 'border-amber-100 bg-amber-50 text-amber-700',
  }[tone];

  return (
    <div className={`min-w-0 rounded-2xl border px-2.5 py-2 text-center ${toneClass}`}>
      <p className="text-lg font-black leading-5 sm:text-xl">{value}</p>
      <p className="mt-1 truncate text-[10px] font-black leading-3 sm:text-[11px]">
        <span className="sm:hidden">{shortLabel ?? label}</span>
        <span className="hidden sm:inline">{label}</span>
      </p>
    </div>
  );
}

export function MiniStat({
  danger = false,
  label,
  value,
}: {
  danger?: boolean;
  label: string;
  value: number;
}) {
  return (
    <span
      className={`rounded-lg px-2 py-1 text-xs font-black ${
        danger ? 'bg-red-50 text-red-700' : 'bg-white text-slate-700'
      }`}
    >
      {label}: {value}
    </span>
  );
}
