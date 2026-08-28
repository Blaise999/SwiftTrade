'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Zap, ShieldCheck, Globe, Layers,
  Smartphone, Bell, Wallet, ArrowRight, Clock, Sparkles,
} from 'lucide-react';

/* ───────────────────────── LIVE HEATMAP ───────────────────────── */
export function LiveHeatmap() {
  const [rows, setRows] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    const load = () => fetch('/api/movers', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setRows(Array.isArray(j?.all) ? j.all : []))
      .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const fmt = (p: number) =>
    p >= 1 ? p.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : p >= 0.01 ? p.toFixed(4) : p.toPrecision(3);

  return (
    <section ref={ref} className="relative py-20 sm:py-24 overflow-hidden">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4 mb-7 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--t-sub)] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--profit)] animate-pulse motion-reduce:animate-none" />
              Live prices
            </div>
            <h2 className="text-[30px] sm:text-[40px] font-bold tracking-tight text-[color:var(--t-hi)] leading-[1.05]">
              Everything moving,<br className="hidden sm:block" /> right now.
            </h2>
          </div>
          <p className="text-[13px] text-[color:var(--t-sub)] max-w-xs">
            Real quotes from the same feeds that power the app. Refreshes every minute.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-white/[0.04] animate-pulse motion-reduce:animate-none" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {rows.slice(0, 20).map((r, i) => {
              const up = r.change >= 0;
              const mag = Math.min(1, Math.abs(r.change) / 8);
              return (
                <motion.div
                  key={`${r.kind}-${r.symbol}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.35, delay: Math.min(0.4, i * 0.025) }}
                  className="relative rounded-xl border p-3 overflow-hidden"
                  style={{
                    borderColor: 'var(--line)',
                    background: `color-mix(in srgb, ${up ? 'var(--profit)' : 'var(--loss)'} ${6 + mag * 16}%, var(--card))`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-bold text-[color:var(--t-hi)]">{r.symbol}</span>
                    <span className="text-[9px] uppercase tracking-wider text-[color:var(--t-sub)] opacity-60">
                      {r.kind === 'crypto' ? 'C' : 'S'}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[15px] font-bold tabular-nums text-[color:var(--t-hi)]">
                    ${fmt(r.price)}
                  </div>
                  <div className={`mt-0.5 flex items-center gap-0.5 text-[11.5px] font-semibold tabular-nums`}
                    style={{ color: up ? 'var(--profit)' : 'var(--loss)' }}>
                    {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {up ? '+' : ''}{Number(r.change).toFixed(2)}%
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── ANIMATED COUNTERS ───────────────────────── */
function Counter({ to, prefix = '', suffix = '', decimals = 0 }: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setV(to); return; }
    let raf = 0; const start = performance.now(); const dur = 1400;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref} className="tabular-nums">{prefix}{v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

export function StatBand() {
  const stats = [
    { v: 5000, suffix: '+', label: 'US stocks & ETFs', sub: 'Fractional from $1' },
    { v: 350, suffix: '+', label: 'Crypto pairs', sub: 'Majors to micro-caps' },
    { v: 50, suffix: '+', label: 'FX pairs', sub: 'Majors, minors, exotics' },
    { v: 8, suffix: 's', label: 'Bridge settlement', sub: 'USD to HKD, typical' },
  ];
  return (
    <section className="relative py-16 border-y border-[color:var(--line)]">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-9">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <div className="text-[32px] sm:text-[40px] font-bold text-[color:var(--t-hi)] leading-none tracking-tight">
                <Counter to={s.v} suffix={s.suffix} />
              </div>
              <div className="mt-2 text-[13px] font-semibold text-[color:var(--t-hi)]">{s.label}</div>
              <div className="text-[11.5px] text-[color:var(--t-sub)] mt-0.5">{s.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── BENTO FEATURE GRID ───────────────────────── */
export function BentoGrid() {
  const card = 'relative overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-6 hover:border-[color:var(--line-strong)] transition-colors';
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      {/* MOTION SLOT C — /public/motion/bento-ambient.webp (960x420, <=120KB) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] motion-reduce:hidden"
        style={{
          backgroundImage: 'url(/motion/bento-ambient.webp)', backgroundSize: 'cover', backgroundPosition: 'center',
          maskImage: 'radial-gradient(ellipse at 30% 50%, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 30% 50%, black 30%, transparent 70%)',
        }} />
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2 className="text-[30px] sm:text-[42px] font-bold tracking-tight text-[color:var(--t-hi)] leading-[1.05] mb-3">
          Built for how people<br className="hidden sm:block" /> actually trade.
        </h2>
        <p className="text-[15px] text-[color:var(--t-sub)] max-w-xl mb-10">
          One account, three markets, and the tools you&apos;d otherwise need three apps for.
        </p>

        <div className="grid gap-3 md:grid-cols-6 auto-rows-[minmax(150px,auto)]">
          {/* wide */}
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.45 }} className={`${card} md:col-span-4 md:row-span-2`}>
            <ShieldCheck className="w-6 h-6 text-[color:var(--profit)]" />
            <h3 className="mt-4 text-[20px] font-bold text-[color:var(--t-hi)]">Shield any position</h3>
            <p className="mt-2 text-[13.5px] text-[color:var(--t-sub)] leading-relaxed max-w-md">
              Lock a holding&apos;s value with one tap when you don&apos;t like where things are heading.
              Flat 1% premium, shown before you confirm. Unlock whenever you want back in.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Stocks', 'Crypto', 'One tap', 'Reversible'].map((t) => (
                <span key={t} className="text-[11px] px-2.5 py-1 rounded-full border border-[color:var(--line)] text-[color:var(--t-sub)]">{t}</span>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.05 }} className={`${card} md:col-span-2`}>
            <Zap className="w-5 h-5 text-[color:var(--gold)]" />
            <h3 className="mt-3 text-[16px] font-bold text-[color:var(--t-hi)]">Instant fills</h3>
            <p className="mt-1.5 text-[12.5px] text-[color:var(--t-sub)]">Your balance and position update the moment you tap. No spinner roulette.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }} className={`${card} md:col-span-2`}>
            <Wallet className="w-5 h-5 text-[color:var(--profit)]" />
            <h3 className="mt-3 text-[16px] font-bold text-[color:var(--t-hi)]">Fractional from $1</h3>
            <p className="mt-1.5 text-[12.5px] text-[color:var(--t-sub)]">Own a slice of anything. No round-lot minimums, no gatekeeping.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.15 }} className={`${card} md:col-span-3`}>
            <Globe className="w-5 h-5 text-[#7C5CFC]" />
            <h3 className="mt-3 text-[16px] font-bold text-[color:var(--t-hi)]">SwiftBridge</h3>
            <p className="mt-1.5 text-[12.5px] text-[color:var(--t-sub)]">
              Move money across the Pacific in seconds, not days. Local currency in, crypto or USD out.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.2 }} className={`${card} md:col-span-3`}>
            <Bell className="w-5 h-5 text-[color:var(--gold)]" />
            <h3 className="mt-3 text-[16px] font-bold text-[color:var(--t-hi)]">Every move, logged</h3>
            <p className="mt-1.5 text-[12.5px] text-[color:var(--t-sub)]">
              Buy, sell, shield, bridge — each one hits your history, your notifications, and your inbox.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── FX CORRIDOR ───────────────────────── */
export function Corridor() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  return (
    <section ref={ref} className="relative py-20 sm:py-24 overflow-hidden">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-7 sm:p-10 relative overflow-hidden">
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-8">
            <Node label="New York" sub="USD" />
            {/* animated path */}
            <div className="flex-1 w-full relative h-16">
              <svg viewBox="0 0 400 60" className="w-full h-full" preserveAspectRatio="none">
                <path d="M 10 30 Q 200 -6 390 30" fill="none" stroke="var(--line-strong)" strokeWidth="1.5" strokeDasharray="4 5" />
                <motion.circle
                  r="5" fill="var(--profit)"
                  initial={{ offsetDistance: '0%' }}
                  animate={inView ? { offsetDistance: '100%' } : {}}
                  transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.4 }}
                  style={{ offsetPath: 'path("M 10 30 Q 200 -6 390 30")' } as any}
                />
              </svg>
              <div className="absolute inset-x-0 -bottom-1 text-center">
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-[color:color-mix(in_srgb,var(--profit)_12%,transparent)] text-[color:var(--profit)] font-semibold inline-flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> ~8 seconds
                </span>
              </div>
            </div>
            <Node label="Hong Kong" sub="HKD" />
          </div>
          <p className="mt-8 text-center text-[13px] text-[color:var(--t-sub)] max-w-lg mx-auto">
            SwiftBridge routes your transfer through verified local rails — no wire fees,
            no three-day float, no explaining yourself to a bank.
          </p>
        </div>
      </div>
    </section>
  );
}

function Node({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="text-center shrink-0">
      <div className="w-14 h-14 rounded-2xl border border-[color:var(--line-strong)] grid place-items-center mx-auto">
        <Globe className="w-5 h-5 text-[color:var(--t-sub)]" />
      </div>
      <div className="mt-2.5 text-[13.5px] font-bold text-[color:var(--t-hi)]">{label}</div>
      <div className="text-[11px] text-[color:var(--t-sub)]">{sub}</div>
    </div>
  );
}

/* ───────────────────────── MOBILE STRIP ───────────────────────── */
export function MobileStrip() {
  const items = [
    { icon: Smartphone, t: 'Trade anywhere', d: 'Full account on your phone, same speed as desktop.' },
    { icon: Layers, t: 'Three markets, one balance', d: 'No shuffling money between apps or wallets.' },
    { icon: Sparkles, t: 'No account minimum', d: 'Start with a dollar. Seriously.' },
  ];
  return (
    <section className="py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.div key={it.t}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.07 }}
                className="rounded-2xl border border-[color:var(--line)] p-5">
                <Icon className="w-5 h-5 text-[color:var(--profit)]" />
                <h3 className="mt-3 text-[15px] font-bold text-[color:var(--t-hi)]">{it.t}</h3>
                <p className="mt-1 text-[12.5px] text-[color:var(--t-sub)]">{it.d}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
