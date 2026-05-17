'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-void flex selection:bg-champagne-400/30">
      {/* ─────────── LEFT — Editorial brand panel ─────────── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        {/* Skyline backdrop — pure CSS, no external image */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 opacity-[0.30]"
            style={{
              background:
                'radial-gradient(ellipse 90% 60% at 30% 0%, rgba(91,109,255,0.22), transparent 60%),' +
                'radial-gradient(ellipse 70% 50% at 80% 100%, rgba(245,197,66,0.10), transparent 55%),' +
                'linear-gradient(160deg, #070612 0%, #0a0918 55%, #070612 100%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-void via-void/70 to-void" />
        </div>

        {/* Aurora wash */}
        <div className="absolute top-0 inset-x-0 h-full bg-aurora bg-[length:300%_300%] animate-aurora opacity-15 mix-blend-screen pointer-events-none" />
        <div className="absolute inset-0 bg-noise opacity-[0.35] mix-blend-overlay pointer-events-none" />

        {/* Atmospheric glows */}
        <motion.div
          className="absolute top-1/3 -left-32 w-[500px] h-[500px] bg-sapphire-500/15 rounded-full blur-[150px]"
          animate={{ scale: [1, 1.05, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-20 w-[400px] h-[400px] bg-champagne-500/10 rounded-full blur-[120px]"
          animate={{ scale: [1.05, 1, 1.05], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-sapphire-400 to-sapphire-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-pearl-50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M14 7h7v7" />
              </svg>
            </div>
            <div className="leading-none">
              <div className="font-serif font-medium text-pearl-50 text-lg tracking-tight">Swift Trade</div>
              <div className="text-[9px] text-pearl-300/60 tracking-[0.25em] uppercase mt-0.5">Hong Kong · Est. 2018</div>
            </div>
          </Link>

          {/* Main content */}
          <div className="space-y-10 max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9 }}
            >
              <p className="text-[10px] uppercase tracking-[0.4em] text-champagne-300/70 font-medium mb-6">Welcome</p>
              <h1 className="font-serif font-light text-5xl xl:text-6xl text-pearl-50 leading-[0.98] tracking-tight">
                The private bank<br/>
                for <em className="italic font-medium text-champagne-300/95">global</em><br/>
                traders.
              </h1>
              <p className="mt-7 text-base text-pearl-200/70 leading-relaxed max-w-md">
                Crypto, foreign exchange, and global equities — settled through a single account, with a concierge desk to bridge any currency.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="grid grid-cols-3 gap-8 pt-10 border-t border-pearl-100/10"
            >
              <Stat v="$1.4B" l="Volume YTD" />
              <Stat v="180k+" l="Members" />
              <Stat v="80+"   l="Markets" />
            </motion.div>
          </div>

          {/* Footer note */}
          <div className="text-[11px] text-pearl-300/40">
            © {new Date().getFullYear()} Swift Trade Holdings Ltd. · SFC Type 1, 4, 9 licensed.
          </div>
        </div>
      </div>

      {/* ─────────── RIGHT — Form ─────────── */}
      <div className="flex-1 flex flex-col bg-void">
        {/* Top mobile branding */}
        <div className="lg:hidden p-6 flex items-center justify-between border-b border-pearl-100/[0.05]">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-sapphire-400 to-sapphire-700 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-pearl-50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M14 7h7v7" />
              </svg>
            </div>
            <div className="leading-none">
              <div className="font-serif font-medium text-pearl-50 text-base tracking-tight">Swift Trade</div>
              <div className="text-[9px] text-pearl-300/60 tracking-[0.25em] uppercase mt-0.5">Hong Kong</div>
            </div>
          </Link>
          <Link href="/" className="text-xs text-pearl-300/55 hover:text-pearl-100 transition-colors">
            ← Home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div>
      <div className="font-serif text-2xl xl:text-3xl text-pearl-50 font-light tracking-tight">{v}</div>
      <div className="text-[10px] text-pearl-300/55 uppercase tracking-wider mt-1.5">{l}</div>
    </div>
  );
}
