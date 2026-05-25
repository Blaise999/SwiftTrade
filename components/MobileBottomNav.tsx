'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, TrendingUp, Activity, Wallet, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Mobile bottom navigation — Robinhood/Trading-212 style.
 * Only renders on screens narrower than `lg` (desktop keeps the sidebar).
 *
 * The "Menu" item triggers the existing mobile drawer (the dashboard
 * layout listens for the custom event `swift:openMobileMenu`).
 */
const ITEMS = [
  { label: 'Home',      href: '/dashboard',           icon: Home,       match: (p: string) => p === '/dashboard' },
  { label: 'Markets',   href: '/markets',             icon: Activity,   match: (p: string) => p.startsWith('/markets') },
  { label: 'Invest',    href: '/dashboard/invest',    icon: TrendingUp, match: (p: string) => p.startsWith('/dashboard/invest') || p.startsWith('/dashboard/trade') },
  { label: 'Wallet',    href: '/dashboard/wallet',    icon: Wallet,     match: (p: string) => p.startsWith('/dashboard/wallet') },
];

export default function MobileBottomNav() {
  const pathname = usePathname() || '';
  const [visible, setVisible] = useState(true);
  const [lastY, setLastY] = useState(0);

  // Hide on scroll-down, show on scroll-up. Subtle Robinhood-style behavior.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (y < 40) setVisible(true);
        else if (y > lastY + 6) setVisible(false);
        else if (y < lastY - 6) setVisible(true);
        setLastY(y);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [lastY]);

  // Hide entirely on landing / marketing / auth pages
  if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/markets')) return null;

  return (
    <nav
      aria-label="Primary"
      className={`lg:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-3 mb-2 rounded-2xl border border-white/[0.08] bg-[#101216]/95 backdrop-blur-xl shadow-2xl shadow-black/60">
        <div className="grid grid-cols-4 px-2 py-1.5">
          {ITEMS.map(item => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-colors ${
                  active ? 'text-white' : 'text-[#71717A] hover:text-[#A1A1AA]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${active ? 'text-[#16C784]' : ''}`}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className={`text-[10px] font-medium ${active ? 'text-white' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
