'use client';

import Link from 'next/link';
import { useState } from 'react';

type QuickAction = {
  href: string;
  label: string;
};

export function SchoolQuickActions({ actions }: { actions: QuickAction[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div aria-label="Akses cepat" className="school-floating-actions">
      <div
        className={
          open
            ? 'school-floating-menu school-floating-menu-open'
            : 'school-floating-menu'
        }
      >
        {actions.map((item) => (
          <Link
            className="school-floating-action"
            href={item.href}
            key={item.label}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <button
        aria-expanded={open}
        aria-label={open ? 'Tutup akses cepat' : 'Buka akses cepat'}
        className="school-floating-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? '↓' : '↑'}
      </button>
    </div>
  );
}
