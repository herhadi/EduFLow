'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem('eduflow-theme', theme);
}

export function ThemeToggle({ compact = false, showLabel = true }: { compact?: boolean; showLabel?: boolean }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const currentTheme = document.documentElement.dataset.theme === 'dark'
      ? 'dark'
      : 'light';
    setTheme(currentTheme);
  }, []);

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      aria-label={`Aktifkan mode ${nextTheme === 'dark' ? 'gelap' : 'terang'}`}
      className="theme-toggle"
      onClick={() => {
        applyTheme(nextTheme);
        setTheme(nextTheme);
      }}
      title={`Mode ${nextTheme === 'dark' ? 'gelap' : 'terang'}`}
      type="button"
    >
      <span aria-hidden="true" className="theme-toggle__icon">
        {theme === 'dark' ? '☀' : '☾'}
      </span>
      {!compact && showLabel ? (
        <span className="text-xs font-extrabold">
          Tema {theme === 'dark' ? 'Terang' : 'Gelap'}
        </span>
      ) : null}
    </button>
  );
}
