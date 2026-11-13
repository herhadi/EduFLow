import Link from 'next/link';
import { type ReactNode } from 'react';
import { PageHeader } from '../ui/page-header';

export function RoleHero({ description, eyebrow, title }: { description: string; eyebrow: string; title: string }) {
  return <PageHeader description={description} eyebrow={eyebrow} showBackLink={false} title={title} />;
}

export function RoleSection({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section className="mt-7">
      <div className="mb-4">
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-[var(--text)]">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  );
}

export function RoleActionCard({
  description,
  href,
  label,
}: {
  description: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      className="group rounded-[1.75rem] border border-blue-200 bg-gradient-to-br from-white to-blue-50/80 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-blue-400/20 dark:from-[var(--surface-solid)] dark:to-blue-950/30 dark:hover:border-blue-300/50 dark:hover:shadow-blue-950/30 dark:focus-visible:ring-offset-[var(--surface-solid)]"
      href={href}
    >
      <h3 className="text-lg font-black text-slate-900 dark:text-[var(--text)]">{label}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-blue-700 transition group-hover:gap-3 dark:text-blue-300">Buka halaman <span aria-hidden="true">↗</span></span>
    </Link>
  );
}
