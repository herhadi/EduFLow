import Link from 'next/link';
import { type ReactNode } from 'react';

export function PageHeader({
  action,
  backHref = '/dashboard',
  description,
  eyebrow,
  showBackLink = true,
  title,
}: {
  action?: ReactNode;
  backHref?: string;
  description: string;
  eyebrow: string;
  showBackLink?: boolean;
  title: string;
}) {
  return (
    <header className="page-hero relative w-full overflow-hidden rounded-2xl border border-blue-100/70 p-4 shadow-sm backdrop-blur-xl dark:border-slate-700 sm:p-5">
      {showBackLink ? (
        <div className="mb-3 flex justify-end">
          <Link
            className="secondary-button relative inline-flex rounded-full px-3 py-1.5 text-xs font-bold"
            href={backHref}
          >
            ← Kembali ke dashboard
          </Link>
        </div>
      ) : null}

      <div>
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
