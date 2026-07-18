'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * Dark / light switch.
 * The initial class is set by an inline script in app/layout.tsx before paint,
 * so this component only needs to read + flip it.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const flip = () => {
    const next = !dark;
    setDark(next);
    const root = document.documentElement;
    root.classList.toggle('dark', next);
    try {
      localStorage.setItem('st-theme', next ? 'dark' : 'light');
    } catch {}
  };

  // render a stable placeholder pre-hydration to avoid mismatch
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={mounted && !dark ? 'Switch to dark mode' : 'Switch to light mode'}
      title={mounted && !dark ? 'Dark mode' : 'Light mode'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${className}`}
      style={{ borderColor: 'var(--line)', color: 'var(--t-sub)', background: 'var(--wash)' }}
    >
      {mounted && !dark ? <Moon className="h-[17px] w-[17px]" /> : <Sun className="h-[17px] w-[17px]" />}
    </button>
  );
}
