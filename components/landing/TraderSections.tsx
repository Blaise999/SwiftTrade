'use client';

import { useEffect, useRef, useState } from 'react';
import { AmbientMotion } from './AmbientMotion';
import Link from 'next/link';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { TrendingUp, TrendingDown, Gauge, ArrowRight, Circle, Globe } from 'lucide-react';

const num = (v: any) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const fmtPx = (p: number) =>
  p >= 1 ? p.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : p >= 0.01 ? p.toFixed(4) : p.toPrecision(3);

/* logo CDNs — real images, no assets needed */
const coinLogo = (s: string) =>
  `https://assets.coincap.io/assets/icons/${s.toLowerCase()}@2x.png`;
const stockLogo = (s: string) =>
  `https://images.financialmodelingprep.com/symbol/${s.toUpperCase()}.png`;

/* ─────────────── INFINITE MARQUEE TICKER ─────────────── */
export function MarqueeTicker() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    const load = () => fetch('/api/movers', { cache: 'no-store' })
      .then((r) => r.json()).then((j) => setRows(Array.isArray(j?.all) ? j.all : [])).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);
  if (!rows.length) return null;
  const loop = [...rows, ...rows];   // duplicate for seamless wrap

  return (
    <div className="relative overflow-hidden border-y border-[color:var(--line)] py-3">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-[color:var(--bg)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-[color:var(--bg)] to-transparent" />
      <div className="flex gap-8 animate-[swift-marquee_38s_linear_infinite] motion-reduce:animate-none whitespace-nowrap">
        {loop.map((r, i) => {
          const up = r.change >= 0;
          return (
            <div key={`${r.symbol}-${i}`} className="inline-flex items-center gap-2 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.kind === 'crypto' ? coinLogo(r.symbol) : stockLogo(r.symbol)}
                alt="" width={18} height={18} loading="lazy"
                className="rounded-full opacity-90"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
              />
              <span className="text-[12.5px] font-bold text-[color:var(--t-hi)]">{r.symbol}</span>
              <span className="text-[12.5px] tabular-nums text-[color:var(--t-sub)]">${fmtPx(r.price)}</span>
              <span className="text-[11.5px] font-semibold tabular-nums"
                style={{ color: up ? 'var(--profit)' : 'var(--loss)' }}>
                {up ? '+' : ''}{num(r.change).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────── FEAR & GREED + MARKET STATUS ─────────────── */
export function MarketMood() {
  const [pulse, setPulse] = useState<any>(null);
  useEffect(() => {
    fetch('/api/pulse', { cache: 'no-store' }).then((r) => r.json()).then(setPulse).catch(() => {});
  }, []);

  const fg = pulse?.fearGreed;
  const val = num(fg?.value);
  const angle = -90 + (val / 100) * 180;   // -90..+90
  const tone = val >= 75 ? 'var(--profit)' : val >= 55 ? '#8FBF5A' : val >= 45 ? 'var(--gold)' : val >= 25 ? '#E08B4A' : 'var(--loss)';

  return (
    <section className="relative py-20 sm:py-24 overflow-hidden">
      <AmbientMotion variant="rays" tone="gold" opacity={0.34} />
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-3">
          {/* gauge */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.45 }}
            className="lg:col-span-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-7"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[color:var(--t-sub)]">
              <Gauge className="w-3.5 h-3.5" /> Crypto Fear &amp; Greed
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-8">
              <svg viewBox="0 0 200 110" className="w-[220px] shrink-0">
                {[...Array(5)].map((_, i) => {
                  const colors = ['var(--loss)', '#E08B4A', 'var(--gold)', '#8FBF5A', 'var(--profit)'];
                  const a0 = Math.PI - (i / 5) * Math.PI;
                  const a1 = Math.PI - ((i + 1) / 5) * Math.PI;
                  const R = 88, r = 66;
                  const p = (a: number, rad: number) => `${100 + Math.cos(a) * rad} ${100 - Math.sin(a) * rad}`;
                  return (
                    <path key={i}
                      d={`M ${p(a0, R)} A ${R} ${R} 0 0 1 ${p(a1, R)} L ${p(a1, r)} A ${r} ${r} 0 0 0 ${p(a0, r)} Z`}
                      fill={colors[i]} opacity={0.85} />
                  );
                })}
                <motion.line
                  x1="100" y1="100" x2="100" y2="30"
                  stroke="var(--t-hi)" strokeWidth="3" strokeLinecap="round"
                  initial={{ rotate: -90 }}
                  whileInView={{ rotate: angle }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  style={{ originX: '100px', originY: '100px' } as any}
                />
                <circle cx="100" cy="100" r="6" fill="var(--t-hi)" />
              </svg>

              <div>
                <div className="text-[46px] font-bold leading-none tabular-nums" style={{ color: tone }}>
                  {fg ? val : '—'}
                </div>
                <div className="mt-1 text-[16px] font-semibold text-[color:var(--t-hi)]">
                  {fg?.label || 'Loading…'}
                </div>
                <p className="mt-3 text-[12.5px] text-[color:var(--t-sub)] max-w-xs leading-relaxed">
                  A crowd-sentiment reading, not a signal. Extreme fear and extreme greed
                  both tend to be where people make their worst decisions.
                </p>
              </div>
            </div>
          </motion.div>

          {/* market status + corridors teaser */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.45, delay: 0.08 }}
            className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-7 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <Circle className={`w-2.5 h-2.5 ${pulse?.marketStatus?.open ? 'fill-[color:var(--profit)] text-[color:var(--profit)] animate-pulse motion-reduce:animate-none' : 'fill-[color:var(--t-sub)] text-[color:var(--t-sub)]'}`} />
                <span className="text-[13px] font-semibold text-[color:var(--t-hi)]">
                  {pulse?.marketStatus?.label || 'Checking…'}
                </span>
              </div>
              <p className="mt-3 text-[12.5px] text-[color:var(--t-sub)] leading-relaxed">
                Crypto never closes. FX runs 24/5. US equities keep banker&apos;s hours —
                we show you which is which so you&apos;re never guessing.
              </p>
            </div>
            <div className="mt-6 space-y-2">
              {[['Crypto', '24/7'], ['FX', '24/5'], ['US stocks', '9:30–16:00 ET']].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-[12px]">
                  <span className="text-[color:var(--t-sub)]">{k}</span>
                  <span className="text-[color:var(--t-hi)] font-semibold tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── BRIDGE LIVE RATE BOARD ─────────────── */
export function BridgeRates() {
  const [rates, setRates] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/pulse', { cache: 'no-store' })
      .then((r) => r.json()).then((j) => setRates(Array.isArray(j?.rates) ? j.rates : [])).catch(() => {});
  }, []);

  const FLAG: Record<string, string> = {
    HKD: 'hk', NGN: 'ng', PHP: 'ph', INR: 'in', GBP: 'gb',
    EUR: 'eu', JPY: 'jp', SGD: 'sg', ZAR: 'za', KES: 'ke',
  };

  return (
    <section className="relative py-20 sm:py-24 overflow-hidden">
      <AmbientMotion variant="flow" tone="violet" opacity={0.40} />
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4 mb-7 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--t-sub)] mb-3">
              <Globe className="w-3.5 h-3.5 text-[#7C5CFC]" /> Bridge corridors
            </div>
            <h2 className="text-[30px] sm:text-[40px] font-bold tracking-tight text-[color:var(--t-hi)] leading-[1.05]">
              Live rates, no markup theatre.
            </h2>
          </div>
          <Link href="/dashboard/bridge" prefetch={false}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--t-hi)] hover:opacity-80">
            Open SwiftBridge <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* horizontal snap rail on mobile, grid on desktop */}
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:grid sm:grid-cols-3 lg:grid-cols-5">
          {(rates.length ? rates : Array.from({ length: 5 }).map(() => null)).map((r: any, i: number) => (
            <motion.div key={r?.code || i}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: Math.min(0.35, i * 0.05) }}
              className="snap-start shrink-0 w-[46vw] sm:w-auto rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-4"
            >
              {r ? (
                <>
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://flagcdn.com/w40/${FLAG[r.code] || 'us'}.png`} alt=""
                      width={22} height={16} loading="lazy" className="rounded-[3px]" />
                    <span className="text-[12.5px] font-bold text-[color:var(--t-hi)]">USD → {r.code}</span>
                  </div>
                  <div className="mt-3 text-[20px] font-bold tabular-nums text-[color:var(--t-hi)]">
                    {r.rate.toLocaleString('en-US', { maximumFractionDigits: r.rate > 100 ? 0 : 4 })}
                  </div>
                  <div className="text-[11px] text-[color:var(--t-sub)] mt-0.5">per 1 USD</div>
                </>
              ) : (
                <div className="h-[86px] animate-pulse motion-reduce:animate-none rounded bg-white/[0.04]" />
              )}
            </motion.div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-[color:var(--t-sub)] opacity-70">
          Indicative mid-market rates, refreshed every few minutes. Your final rate is locked when you submit a bridge request.
        </p>
      </div>
    </section>
  );
}

/* ─────────────── PARALLAX PULL-QUOTE ─────────────── */
export function ParallaxQuote() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const o = useTransform(scrollYProgress, [0, 0.35, 0.65, 1], [0, 1, 1, 0]);

  return (
    <section ref={ref} className="relative py-28 overflow-hidden">
      <AmbientMotion variant="noise" tone="mixed" opacity={0.30} />
      <motion.div style={{ y, opacity: o }} className="mx-auto w-full max-w-4xl px-6 text-center">
        <p className="text-[26px] sm:text-[38px] font-bold tracking-tight text-[color:var(--t-hi)] leading-[1.15]">
          Most apps make you pick a market,{' '}
          <span className="text-[color:var(--t-sub)]">then pick a second app for the other one.</span>{' '}
          We thought that was daft.
        </p>
      </motion.div>
    </section>
  );
}
