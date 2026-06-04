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
    <header className="max-w-3xl">
      {showBackLink ? (
        <Link
          className="text-sm font-semibold text-brand-700 hover:text-brand-600"
          href="/"
        >
          ← Kembali ke dashboard
        </Link>
      ) : null}

      <div className={showBackLink ? 'mt-8' : undefined}>
        <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
          {eyebrow}
        </p>
        <h1 className="my-2 text-4xl font-bold tracking-tight sm:text-6xl">
          {title}
        </h1>
        <p className="text-base leading-7 text-slate-600 sm:text-lg">{description}</p>
        {action ? <div className="mt-6 flex flex-wrap gap-3">{action}</div> : null}
      </div>
    </header>
  );
}
