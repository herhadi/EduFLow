import Link from 'next/link';
import { type ReactNode } from 'react';

export function PageHeader({
  action,
  description,
  eyebrow,
  showBackLink = true,
  title,
}: {
  action?: ReactNode;
  description: string;
  eyebrow: string;
  showBackLink?: boolean;
  title: string;
}) {
  return (
    <header className="page-hero relative w-full overflow-hidden rounded-[2rem] border border-blue-100/70 p-5 shadow-sm shadow-blue-100/60 backdrop-blur-xl sm:p-7">
      <span className="pointer-events-none absolute -top-20 -right-16 size-48 rounded-full bg-blue-400/10 blur-3xl" />
      {showBackLink ? (
        <Link
          className="secondary-button relative inline-flex rounded-full px-3 py-2 text-xs font-bold"
          href="/dashboard"
        >
          ← Kembali ke dashboard
        </Link>
      ) : null}

      <div className={showBackLink ? 'mt-5' : undefined}>
        <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
          {eyebrow}
        </p>
        <h1 className="relative my-2 text-2xl font-black tracking-[-0.035em] sm:text-4xl">
          {title}
        </h1>
        <p className="text-sm leading-6 text-slate-600 sm:text-base">
          {description}
        </p>
        {action ? <div className="mt-6 flex flex-wrap gap-3">{action}</div> : null}
      </div>
    </header>
  );
}
