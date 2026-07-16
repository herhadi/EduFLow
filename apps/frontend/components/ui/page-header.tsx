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
    <header className="page-hero relative w-full overflow-hidden rounded-2xl border border-blue-100/70 p-4 shadow-sm backdrop-blur-xl dark:border-slate-700 sm:p-5">
      {showBackLink ? (
        <Link
          className="secondary-button relative inline-flex rounded-full px-3 py-1.5 text-xs font-bold"
          href="/dashboard"
        >
          ← Kembali ke dashboard
        </Link>
      ) : null}

      <div className={showBackLink ? 'mt-3' : undefined}>
        <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
          {eyebrow}
        </p>
        <h1 className="relative my-1.5 text-xl font-black sm:text-3xl">
          {title}
        </h1>
        <p className="text-sm leading-5 text-slate-600 dark:text-slate-300 sm:text-[0.95rem]">
          {description}
        </p>
        {action ? <div className="mt-4 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </header>
  );
}
