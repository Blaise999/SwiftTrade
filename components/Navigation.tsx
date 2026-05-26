'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SwiftLogo from '@/components/SwiftLogo';

const NAV = [
  { name: 'Markets',     href: '/#markets'      },
  { name: 'SwiftBridge', href: '/#bridge', badge: 'New' },
  { name: 'Tiers',       href: '/#pricing'      },
  { name: 'Why us',      href: '/#why'          },
  { name: 'Company',     href: '/#company'      },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-void/85 backdrop-blur-2xl border-b border-pearl-100/[0.04]' : 'bg-transparent'
    }`}>
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8">
        <div className="h-[68px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="group-hover:scale-105 transition-transform">
              <SwiftLogo size={36} />
            </div>
            <div className="leading-none -ml-1 hidden sm:block">
              <div className="text-[9px] text-pearl-300/60 tracking-[0.25em] uppercase mt-0.5">Hong Kong · Est. 2018</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="relative text-sm text-pearl-100/75 hover:text-pearl-50 transition-colors flex items-center gap-1.5 group"
              >
                {n.name}
                {n.badge && (
                  <span className="text-[9px] tracking-wider bg-champagne-400/15 text-champagne-300 px-1.5 py-0.5 rounded font-medium border border-champagne-400/25">
                    {n.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <Link href="/auth/login" className="text-sm text-pearl-100/70 hover:text-pearl-50 transition-colors">
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="group relative inline-flex items-center gap-1.5 px-4 py-2 bg-pearl-50 hover:bg-pearl-100 rounded-full text-void text-sm font-medium transition-all"
            >
              Open account
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mobile button */}
          <button
            className="lg:hidden p-2 text-pearl-100/80"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden border-t border-pearl-100/[0.04]"
            >
              <div className="py-4 flex flex-col gap-1">
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="px-3 py-2.5 rounded-lg text-pearl-100/80 hover:text-pearl-50 hover:bg-white/5 text-sm font-medium flex items-center gap-2"
                  >
                    {n.name}
                    {n.badge && (
                      <span className="text-[9px] tracking-wider bg-champagne-400/15 text-champagne-300 px-1.5 py-0.5 rounded font-medium border border-champagne-400/25">
                        {n.badge}
                      </span>
                    )}
                  </Link>
                ))}
                <div className="grid grid-cols-2 gap-2 mt-3 px-1">
                  <Link
                    href="/auth/login"
                    onClick={() => setOpen(false)}
                    className="text-center py-2.5 rounded-full bg-white/5 border border-pearl-100/10 text-pearl-50 text-sm font-medium"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setOpen(false)}
                    className="text-center py-2.5 rounded-full bg-pearl-50 text-void text-sm font-medium"
                  >
                    Open account
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
