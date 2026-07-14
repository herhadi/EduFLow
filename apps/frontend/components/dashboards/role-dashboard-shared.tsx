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
        <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
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
      className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60 transition hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-lg"
      href={href}
    >
      <h3 className="text-lg font-black text-slate-900">{label}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <span className="mt-4 inline-flex text-xs font-black text-brand-700">Buka halaman</span>
    </Link>
  );
}
