'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, ChevronRight, Globe, ShieldCheck, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';

const TICKER = [
  { sym: 'BTC',     px: 67_420.32, chg: +2.42 },
  { sym: 'ETH',     px: 3_512.18,  chg: +1.84 },
  { sym: 'EUR/USD', px: 1.08315,   chg: +0.12 },
  { sym: 'XAU/USD', px: 2328.05,   chg: +0.45 },
  { sym: 'AAPL',    px: 189.45,    chg: +1.13 },
  { sym: 'NVDA',    px: 943.21,    chg: +2.87 },
];

export default function HeroSection() {
  const { t } = useT();
  const [ticks, setTicks] = useState(TICKER);

  // Subtle ticking so it doesn't look static during recordings
  useEffect(() => {
    const id = setInterval(() => {
      setTicks(prev => prev.map(t => ({
        ...t,
        px: t.px + (Math.random() - 0.5) * t.px * 0.0008,
        chg: t.chg + (Math.random() - 0.5) * 0.04,
      })));
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden bg-void min-h-[100vh] flex items-center">
      {/* CSS skyline backdrop — no external image dependency */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 opacity-[0.30]"
          style={{
            background:
              'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(91,109,255,0.22), transparent 60%),' +
              'radial-gradient(ellipse 70% 50% at 80% 100%, rgba(245,197,66,0.10), transparent 55%),' +
              'linear-gradient(180deg, #070612 0%, #0a0918 50%, #070612 100%)',
          }}
        />
        {/* Skyline silhouette */}
        <svg
          className="absolute bottom-0 inset-x-0 w-full h-[38vh] opacity-[0.22]"
          viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden
        >
          <g fill="#5b6dff">
            <rect x="40"  y="180" width="46" height="140" />
            <rect x="96"  y="120" width="38" height="200" />
            <rect x="150" y="210" width="54" height="110" />
            <rect x="220" y="90"  width="40" height="230" />
            <rect x="276" y="160" width="50" height="160" />
            <rect x="340" y="60"  width="34" height="260" />
            <rect x="388" y="200" width="58" height="120" />
            <rect x="462" y="130" width="42" height="190" />
            <rect x="520" y="40"  width="30" height="280" />
            <rect x="566" y="170" width="56" height="150" />
            <rect x="638" y="110" width="40" height="210" />
            <rect x="692" y="190" width="52" height="130" />
            <rect x="760" y="70"  width="36" height="250" />
            <rect x="812" y="150" width="48" height="170" />
            <rect x="876" y="100" width="38" height="220" />
            <rect x="930" y="210" width="56" height="110" />
            <rect x="1002" y="80" width="32" height="240" />
            <rect x="1050" y="170" width="54" height="150" />
            <rect x="1120" y="120" width="40" height="200" />
            <rect x="1176" y="200" width="50" height="120" />
            <rect x="1242" y="60"  width="34" height="260" />
            <rect x="1292" y="160" width="52" height="160" />
            <rect x="1360" y="190" width="44" height="130" />
          </g>
        </svg>
        <div className="absolute inset-0 bg-gradient-to-b from-void/60 via-void/85 to-void" />
      </div>

      {/* Aurora */}
      <div className="absolute top-0 inset-x-0 h-[70vh] bg-aurora bg-[length:300%_300%] animate-aurora opacity-30 mix-blend-screen pointer-events-none" />
      <div className="absolute inset-0 bg-noise opacity-[0.35] mix-blend-overlay pointer-events-none" />
      <div className="absolute top-[10%] left-[10%] w-[700px] h-[700px] bg-sapphire-500/20 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[5%] right-[10%] w-[600px] h-[600px] bg-champagne-500/12 blur-[160px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 sm:px-8 w-full py-20">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-10"
        >
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-profit/10 border border-profit/25">
            <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-profit font-medium">{t('hero.live')}</span>
          </span>
          <span className="text-[10px] uppercase tracking-[0.3em] text-pearl-300/65 font-medium">
            {t('hero.eyebrow')}
          </span>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-y-14 lg:gap-x-12 items-center">
          {/* LEFT — Headline + CTAs */}
          <div className="lg:col-span-7">
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-serif font-light leading-[0.92] tracking-tight text-pearl-50"
              style={{ fontSize: 'clamp(2.75rem, 7vw, 6.25rem)' }}
            >
              {t('hero.headlineA')}<br />
              <em className="font-medium italic text-champagne-300/95">{t('hero.headlineB')}</em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="mt-8 text-base md:text-lg text-pearl-200/85 max-w-[560px] leading-[1.6]"
            >
              {t('hero.sub')}
            </motion.p>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11.5px] text-pearl-300/75"
            >
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-profit/80" />
                Insured custody · 95% cold storage
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-sapphire-300/85" />
                Sub-50ms execution
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-champagne-300/85" />
                80+ countries
              </span>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <Link
                href="/auth/signup"
                prefetch={false}
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-pearl-50 hover:bg-pearl-100 text-void font-medium rounded-full transition-all shadow-2xl shadow-sapphire-500/20 hover:shadow-sapphire-500/40"
              >
                {t('hero.cta.primary')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/markets"
                prefetch={false}
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-pearl-100/[0.18] hover:border-pearl-100/[0.30] hover:bg-pearl-50/[0.03] text-pearl-100 font-medium rounded-full transition-all"
              >
                {t('hero.cta.secondary')}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>

            {/* Inline stats strip */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-[640px]"
            >
              {[
                { k: t('hero.stat.volume'),  v: '$184B' },
                { k: t('hero.stat.members'), v: '420,000+' },
                { k: t('hero.stat.exec'),    v: '<50 ms' },
                { k: t('hero.stat.uptime'),  v: '99.99%' },
              ].map(s => (
                <div key={s.k} className="border-t border-pearl-100/[0.10] pt-3">
                  <div className="font-serif text-2xl md:text-3xl text-pearl-50 font-light tracking-tight">{s.v}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-pearl-300/55 mt-1">{s.k}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* RIGHT — Live markets card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="lg:col-span-5"
          >
            <div className="relative">
              {/* Tilted card glow */}
              <div className="absolute -inset-4 bg-gradient-to-br from-sapphire-500/30 via-transparent to-champagne-400/20 blur-3xl opacity-60 pointer-events-none" />

              <div className="relative rounded-2xl border border-pearl-100/[0.10] bg-gradient-to-br from-charcoal/95 via-obsidian/95 to-void/95 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/50">
                {/* Mini header */}
                <div className="px-5 py-3.5 border-b border-pearl-100/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-profit" />
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-pearl-300/75 font-medium">{t('hero.live')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-pearl-300/30" />
                    <div className="w-2 h-2 rounded-full bg-pearl-300/30" />
                    <div className="w-2 h-2 rounded-full bg-pearl-300/30" />
                  </div>
                </div>

                {/* Ticker rows */}
                <div className="divide-y divide-pearl-100/[0.04]">
                  {ticks.map((tk, i) => (
                    <div key={i} className="px-5 py-3.5 flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-medium text-pearl-50">{tk.sym}</div>
                        <div className="text-[10px] text-pearl-300/55 mt-0.5">
                          {tk.sym.startsWith('BTC') ? 'Bitcoin' :
                           tk.sym.startsWith('ETH') ? 'Ethereum' :
                           tk.sym.startsWith('EUR') ? 'Euro / USD' :
                           tk.sym.startsWith('XAU') ? 'Gold spot' :
                           tk.sym.startsWith('AAPL') ? 'Apple Inc.' :
                           tk.sym.startsWith('NVDA') ? 'NVIDIA Corp.' : tk.sym}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono tabular-nums text-[13.5px] text-pearl-50">
                          {tk.sym.includes('/') && tk.px < 100 ? tk.px.toFixed(5) :
                           tk.px.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className={`text-[10.5px] font-mono mt-0.5 flex items-center justify-end gap-0.5 ${tk.chg >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {tk.chg >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                          {tk.chg >= 0 ? '+' : ''}{tk.chg.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-5 py-3.5 border-t border-pearl-100/[0.06] flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-pearl-300/65">3 asset classes</span>
                  <Link href="/markets" prefetch={false} className="text-[11.5px] text-sapphire-300 hover:text-sapphire-200 flex items-center gap-1">
                    All markets <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-2 text-pearl-300/45">
        <div className="text-[9px] uppercase tracking-[0.4em]">Scroll</div>
        <div className="w-px h-8 bg-gradient-to-b from-pearl-300/40 to-transparent" />
      </div>
    </section>
  );
}
