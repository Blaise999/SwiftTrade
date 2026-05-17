'use client';

import { useEffect, useRef, useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { LOCALES, useT } from '@/lib/i18n';

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const current = LOCALES.find(l => l.code === locale) ?? LOCALES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-pearl-100/[0.08] bg-pearl-50/[0.03] hover:bg-pearl-50/[0.06] transition-colors ${
          compact ? 'px-2 py-1.5 text-[11px]' : 'px-3 py-2 text-[12px]'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        type="button"
      >
        <Globe className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span className="font-medium text-pearl-100">{current.native}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-pearl-100/[0.08] bg-obsidian/95 backdrop-blur-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-pearl-100/[0.05] text-[9px] uppercase tracking-[0.25em] text-pearl-300/55 font-medium">
            Language
          </div>
          <ul role="listbox" className="py-1 max-h-72 overflow-y-auto">
            {LOCALES.map(l => (
              <li key={l.code}>
                <button
                  onClick={() => { setLocale(l.code); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[12.5px] hover:bg-pearl-50/[0.04] transition-colors ${
                    l.code === locale ? 'text-pearl-50' : 'text-pearl-200'
                  }`}
                  type="button"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{l.flag}</span>
                    <span className="font-medium">{l.native}</span>
                  </span>
                  {l.code === locale && <Check className="w-3.5 h-3.5 text-sapphire-300" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
