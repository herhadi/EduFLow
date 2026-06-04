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
          className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-bold text-brand-700 shadow-sm shadow-blue-100 hover:text-brand-600"
          href="/"
        >
          ← Kembali ke dashboard
        </Link>
      ) : null}

      <div className={showBackLink ? 'mt-5' : undefined}>
        <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
          {eyebrow}
        </p>
        <h1 className="my-2 text-3xl font-black tracking-tight sm:text-5xl">
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
