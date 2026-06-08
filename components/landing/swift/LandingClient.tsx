'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  motion, useInView, useScroll, useTransform, AnimatePresence,
} from 'framer-motion';
import {
  ArrowRight, Play, Menu, X, Check, ShieldCheck, Zap, Globe2,
  TrendingUp, LineChart, ChevronRight, Star,
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════════
   SWIFTTRADE — Landing
   Deep-navy universe · electric cyan energy · warm gold for wealth.
   Anti-slop: asymmetric layouts, mixed corner radii, custom motion,
   no symmetric feature-card grids, hand-built visuals.
   ════════════════════════════════════════════════════════════════ */

const NAVY = '#0A1428';
const CYAN = '#00E5FF';
const BLUE = '#3B82F6';
const GOLD = '#C5A05B';

/* ─── Brand mark (inline, self-contained) ─── */
function Mark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="Swifttrade">
      <defs>
        <linearGradient id="stm1" x1="6" y1="10" x2="34" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00E5FF" /><stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="stm2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F1C3A" /><stop offset="1" stopColor="#07101F" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="39" height="39" rx="11" fill="url(#stm2)" stroke="rgba(255,255,255,0.10)" />
      <path d="M9 15 L18 10 L24 14 L31 10" stroke="url(#stm1)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 24 L16 27 L23 22 L31 26" stroke="url(#stm1)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
      <circle cx="33.5" cy="9.5" r="1.7" fill={GOLD} />
    </svg>
  );
}

/* ─── Animated background: drifting orbs + speed-line particles, mouse-reactive ─── */
function StarfieldBG() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouse = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    type P = { x: number; y: number; vx: number; len: number; sp: number; a: number };
    let parts: P[] = [];

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(46, Math.floor(w / 30));
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: 0.18 + Math.random() * 0.5, len: 14 + Math.random() * 40,
        sp: 0.18 + Math.random() * 0.6, a: 0.03 + Math.random() * 0.10,
      }));
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener('mousemove', onMove);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const mx = (mouse.current.x - 0.5) * 2; // -1..1
      for (const p of parts) {
        const speed = p.sp * (1 + Math.abs(mx) * 0.8);
        p.x += p.vx * speed * 1.4;
        if (p.x - p.len > w) { p.x = -p.len; p.y = Math.random() * h; }
        const grad = ctx.createLinearGradient(p.x - p.len, p.y, p.x, p.y);
        grad.addColorStop(0, 'rgba(0,229,255,0)');
        grad.addColorStop(1, `rgba(0,229,255,${p.a})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - p.len, p.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base navy — a single directional wash, no floating blobs */}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, #0C1730 0%, ${NAVY} 40%, #060C18 100%)` }} />
      <div className="absolute top-0 right-0 w-[60%] h-[55%] opacity-[0.10]"
        style={{ background: `radial-gradient(60% 60% at 80% 0%, ${CYAN}, transparent 70%)` }} />
      {/* faint engineered grid for texture (not a blob) */}
      <div className="absolute inset-0 opacity-[0.6]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at 50% 0%, black, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black, transparent 78%)',
        }} />
      {/* very subtle speed-line canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

/* ─── Count-up number that runs when scrolled into view ─── */
function CountUp({ to, prefix = '', suffix = '', decimals = 0 }: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0; const start = performance.now(); const dur = 1400;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref}>{prefix}{val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

/* ─── Live-feel ticker ─── */
const TICKER_SEED = [
  { s: 'EUR/USD', p: 1.0847, d: 0.12 }, { s: 'BTC', p: 67482, d: 1.84 },
  { s: 'AAPL', p: 228.31, d: 0.46 }, { s: 'GBP/USD', p: 1.2719, d: -0.08 },
  { s: 'ETH', p: 3521.4, d: 2.31 }, { s: 'NVDA', p: 132.9, d: 3.12 },
  { s: 'USD/JPY', p: 156.22, d: -0.21 }, { s: 'SOL', p: 174.6, d: 4.05 },
  { s: 'TSLA', p: 251.4, d: -1.12 }, { s: 'XAU/USD', p: 2384.1, d: 0.34 },
];
function Ticker() {
  const [rows, setRows] = useState(TICKER_SEED);
  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) => prev.map((r) => {
        const drift = (Math.random() - 0.5) * (r.p * 0.0007);
        const np = r.p + drift;
        return { ...r, p: np, d: r.d + (Math.random() - 0.5) * 0.06 };
      }));
    }, 1600);
    return () => clearInterval(id);
  }, []);
  const line = [...rows, ...rows];
  return (
    <div className="relative w-full overflow-hidden border-y border-white/[0.06] bg-[#07101F]/70">
      <div className="flex gap-8 py-2.5 whitespace-nowrap" style={{ animation: 'st-marquee 38s linear infinite', width: 'max-content' }}>
        {line.map((r, i) => {
          const up = r.d >= 0;
          return (
            <span key={i} className="inline-flex items-center gap-2 text-[12.5px]">
              <span className="text-[#94A3B8] font-medium">{r.s}</span>
              <span className="text-[#F8FAFC] tabular-nums font-semibold">
                {r.p < 10 ? r.p.toFixed(4) : r.p.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
              <span className={`tabular-nums ${up ? 'text-[#22E0A1]' : 'text-[#FF6B6B]'}`}>
                {up ? '▲' : '▼'} {Math.abs(r.d).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
      <style>{`@keyframes st-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

/* ─── Phone mockup with live preview + SwiftBridge sequence ─── */
function PhoneMock() {
  const [px, setPx] = useState(67482);
  const [eur, setEur] = useState(1.0847);
  useEffect(() => {
    const id = setInterval(() => {
      setPx((v) => v + (Math.random() - 0.48) * 40);
      setEur((v) => +(v + (Math.random() - 0.5) * 0.0009).toFixed(4));
    }, 1300);
    return () => clearInterval(id);
  }, []);

  // sparkline path
  const pts = Array.from({ length: 28 }, (_, i) => 40 - Math.sin(i / 2.4) * 14 - i * 0.5 + (i % 3) * 3);
  const spark = pts.map((y, i) => `${i === 0 ? 'M' : 'L'}${(i / 27) * 220},${y}`).join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateY: -8 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ rotateX: 3, rotateY: -4 }}
      style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
      className="relative mx-auto w-[280px] sm:w-[310px]"
    >
      {/* glow under phone */}
      <div className="absolute -inset-8 rounded-[44px] blur-3xl opacity-40" style={{ background: `radial-gradient(closest-side, ${CYAN}, transparent 70%)` }} />
      <div className="relative rounded-[40px] border border-white/[0.10] bg-gradient-to-b from-[#0F1C3A] to-[#070E1C] p-3 shadow-2xl">
        <div className="rounded-[30px] overflow-hidden bg-[#060C18] border border-white/[0.06]">
          {/* status strip */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <span className="text-[11px] text-[#94A3B8] font-medium">9:41</span>
            <div className="flex items-center gap-1.5 text-[10px] text-[#22E0A1]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22E0A1] animate-pulse" /> LIVE
            </div>
          </div>
          {/* balance */}
          <div className="px-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#5E7299]">Portfolio</div>
            <div className="font-satoshi text-[30px] font-black text-white tabular-nums leading-tight">$128,540</div>
            <div className="text-[12px] text-[#22E0A1] font-semibold">+$2,418 · +1.92% today</div>
          </div>
          {/* sparkline */}
          <div className="px-3 mt-2">
            <svg viewBox="0 0 220 56" className="w-full h-14">
              <defs>
                <linearGradient id="pmg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CYAN} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={CYAN} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${spark} L220,56 L0,56 Z`} fill="url(#pmg)" />
              <path d={spark} fill="none" stroke={CYAN} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          {/* live rows */}
          <div className="px-3 pb-3 space-y-2">
            {[
              { k: 'BTC', n: 'Bitcoin', v: `$${px.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, c: '+1.8%', up: true, col: '#F7931A' },
              { k: 'EUR/USD', n: 'Euro · Dollar', v: eur.toFixed(4), c: '+0.12%', up: true, col: BLUE },
              { k: 'NVDA', n: 'Nvidia', v: '$132.90', c: '+3.1%', up: true, col: '#22E0A1' },
            ].map((r) => (
              <div key={r.k} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
                <span className="w-8 h-8 rounded-xl grid place-items-center text-[11px] font-bold text-white" style={{ background: `${r.col}22`, border: `1px solid ${r.col}55` }}>{r.k.slice(0, 2)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] text-white font-semibold leading-tight">{r.k}</div>
                  <div className="text-[10px] text-[#5E7299] truncate">{r.n}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] text-white tabular-nums font-semibold">{r.v}</div>
                  <div className="text-[10px] text-[#22E0A1]">{r.c}</div>
                </div>
              </div>
            ))}
          </div>
          {/* SwiftBridge sequence */}
          <div className="mx-3 mb-4 rounded-2xl p-3 border border-[#00E5FF]/20" style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.10), rgba(59,130,246,0.04))' }}>
            <div className="flex items-center gap-2 mb-2">
              <Globe2 className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#00E5FF] font-semibold">SwiftBridge</span>
            </div>
            <svg viewBox="0 0 240 40" className="w-full h-9">
              <path d="M14 28 Q120 -8 226 28" fill="none" stroke="rgba(0,229,255,0.25)" strokeWidth="1.5" strokeDasharray="3 4" />
              <circle cx="14" cy="28" r="4" fill={CYAN} />
              <circle cx="226" cy="28" r="4" fill={GOLD} />
              <motion.circle r="3.5" fill="#fff"
                animate={{ offsetDistance: ['0%', '100%'] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ offsetPath: 'path("M14 28 Q120 -8 226 28")' } as any} />
            </svg>
            <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mt-1">
              <span>London</span><span className="text-[#22E0A1]">arrives in ~6s</span><span>Lagos</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════ PAGE ════════════════════════ */
export default function LandingClient() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on(); window.addEventListener('scroll', on);
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <div className="landing-body min-h-screen text-[#F8FAFC] overflow-x-hidden">
      <StarfieldBG />

      {/* ─── NAV ─── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#0A1428]/85 backdrop-blur-xl border-b border-white/[0.06]' : 'border-b border-transparent'}`}>
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="group-hover:scale-105 transition-transform"><Mark size={scrolled ? 32 : 34} /></span>
            <span className="font-satoshi font-black text-[19px] tracking-tight text-white">Swift<span className="text-[#00E5FF]">trade</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[14px] text-[#C7D2E4]">
            {[['Products', '#fx'], ['SwiftBridge', '#bridge'], ['Pricing', '#pricing'], ['Company', '#about']].map(([l, h]) => (
              <a key={l} href={h} className="relative hover:text-white transition-colors group">
                {l}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-[#00E5FF] group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/login" className="text-[14px] text-[#C7D2E4] hover:text-white transition-colors">Log in</Link>
            <Link href="/auth/signup"
              className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-semibold text-[#04121f] overflow-hidden group"
              style={{ background: `linear-gradient(90deg, ${CYAN}, ${BLUE})` }}>
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(90deg, ${BLUE}, ${CYAN})` }} />
              <span className="relative">Start trading</span>
              <ArrowRight className="relative w-3.5 h-3.5" />
            </Link>
          </div>
          <button className="md:hidden text-white" onClick={() => setMenu(true)} aria-label="Menu"><Menu className="w-6 h-6" /></button>
        </div>
      </header>

      <AnimatePresence>
        {menu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-[#0A1428]/97 backdrop-blur-xl md:hidden">
            <div className="flex items-center justify-between px-5 h-[68px]">
              <div className="flex items-center gap-2.5"><Mark /><span className="font-satoshi font-black text-[19px] text-white">Swift<span className="text-[#00E5FF]">trade</span></span></div>
              <button onClick={() => setMenu(false)} aria-label="Close"><X className="w-6 h-6 text-white" /></button>
            </div>
            <div className="px-6 pt-8 flex flex-col gap-6 text-[22px] font-satoshi font-bold">
              {[['Products', '#fx'], ['SwiftBridge', '#bridge'], ['Pricing', '#pricing'], ['Company', '#about']].map(([l, h]) => (
                <a key={l} href={h} onClick={() => setMenu(false)} className="text-[#C7D2E4]">{l}</a>
              ))}
              <Link href="/auth/login" onClick={() => setMenu(false)} className="text-[#C7D2E4]">Log in</Link>
              <Link href="/auth/signup" onClick={() => setMenu(false)} className="mt-2 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full text-[#04121f] font-bold text-[16px]" style={{ background: `linear-gradient(90deg, ${CYAN}, ${BLUE})` }}>Start trading free <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-[68px]">
        <HeroAndTicker onDemo={() => setDemo(true)} />
        <Metrics />
        <Features />
        <Bridge />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <About />
        <Careers />
        <Press />
        <Blog />
        <Legal />
        <FinalCTA />
      </main>

      <SiteFooter />

      {/* Demo modal */}
      <AnimatePresence>
        {demo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDemo(false)}
            className="fixed inset-0 z-[70] grid place-items-center bg-black/70 backdrop-blur-sm p-5">
            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl rounded-2xl border border-white/[0.10] bg-gradient-to-b from-[#0F1C3A] to-[#070E1C] p-8">
              <button onClick={() => setDemo(false)} className="absolute top-4 right-4 text-[#94A3B8] hover:text-white"><X className="w-5 h-5" /></button>
              <div className="aspect-video rounded-xl grid place-items-center border border-white/[0.06]" style={{ background: 'radial-gradient(80% 80% at 50% 0%, #122a4d, #070E1C)' }}>
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 rounded-full grid place-items-center mb-3" style={{ background: `linear-gradient(90deg, ${CYAN}, ${BLUE})` }}>
                    <Play className="w-7 h-7 text-[#04121f] ml-0.5" />
                  </div>
                  <p className="font-satoshi text-xl font-bold text-white">35-second product tour</p>
                  <p className="text-[13px] text-[#94A3B8] mt-1">FX · Stocks · Crypto · SwiftBridge</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── HERO ─── */
function HeroAndTicker({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="relative">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-10">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          {/* left text */}
          <div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.10] bg-white/[0.03] px-3.5 py-1.5 text-[12px] text-[#C7D2E4] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22E0A1]" />
              Regulated in 3 jurisdictions · 150+ countries · 4.9/5 from 200k+ traders
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }}
              className="font-satoshi font-black tracking-[-0.03em] leading-[0.95] text-[clamp(48px,9vw,92px)]">
              Trade Fast.<br />
              <span style={{ color: CYAN }}>Send Faster.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12 }}
              className="mt-6 max-w-xl text-[16px] sm:text-[18px] leading-[1.7] text-[#94A3B8]">
              Real FX rates that beat the banks. Global stocks and crypto at your fingertips.
              Swift-powered transfers that cross borders in seconds. Built for traders who move at speed.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.18 }}
              className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link href="/auth/signup"
                className="group relative inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[15px] font-bold text-[#04121f] overflow-hidden"
                style={{ background: `linear-gradient(90deg, ${CYAN}, ${BLUE})`, boxShadow: '0 8px 40px rgba(0,229,255,0.30)' }}>
                <span className="relative">Open account free</span>
                <ArrowRight className="relative w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <button onClick={onDemo}
                className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-full text-[15px] font-semibold text-white border border-white/[0.12] hover:bg-white/[0.04] transition-colors">
                <span className="grid place-items-center w-6 h-6 rounded-full border border-[#00E5FF]/40 animate-pulse"><Play className="w-3 h-3 text-[#00E5FF] ml-0.5" /></span>
                Watch 35s demo
              </button>
            </motion.div>
            {/* trust row */}
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 text-[12px] text-[#5E7299]">
              {['Visa', 'Mastercard', 'Coinbase', 'Plaid'].map((b) => (
                <span key={b} className="font-semibold tracking-wide text-[#7E92B5]">{b}</span>
              ))}
            </div>
          </div>
          {/* right phone */}
          <div className="relative">
            <PhoneMock />
          </div>
        </div>
      </div>
      <Ticker />
    </section>
  );
}

/* ─── METRICS ─── */
function Metrics() {
  const items = [
    { v: 2.8, suffix: 'M+', label: 'trades placed daily', dec: 1 },
    { v: 5.1, prefix: '$', suffix: 'B+', label: 'moved last month', dec: 1 },
    { v: 150, suffix: '+', label: 'countries supported', dec: 0 },
    { v: 4.9, suffix: '/5', label: 'rated by 200k+ users', dec: 1 },
  ];
  return (
    <section className="max-w-[1240px] mx-auto px-5 sm:px-8 py-12">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-white/[0.07] bg-white/[0.05]">
        {items.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
            className="bg-[#0B1426] px-6 py-7">
            <div className="font-satoshi text-[clamp(28px,4vw,40px)] font-black text-white leading-none">
              <CountUp to={m.v} prefix={m.prefix || ''} suffix={m.suffix || ''} decimals={m.dec} />
            </div>
            <div className="mt-2 text-[12.5px] text-[#94A3B8]">{m.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* Real photography from Unsplash (hotlinked, license-free) */
const IMG = (id: string, w = 1100) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

function ProductSection({
  id, flip, eyebrow, title, body, accent, img, alt, bullets, overlay,
}: {
  id: string; flip?: boolean; eyebrow: string; title: string; body: string;
  accent: string; img: string; alt: string; bullets: string[]; overlay?: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 max-w-[1240px] mx-auto px-5 sm:px-8 py-16 sm:py-20">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <motion.div initial={{ opacity: 0, x: flip ? 28 : -28 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}
          className={flip ? 'lg:order-2' : ''}>
          <div className="inline-flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] mb-4" style={{ color: accent }}>
            <span className="w-6 h-px" style={{ background: accent }} />{eyebrow}
          </div>
          <h2 className="font-satoshi text-[clamp(28px,3.6vw,44px)] font-bold leading-[1.04] text-white">{title}</h2>
          <p className="mt-5 text-[15.5px] leading-[1.75] text-[#9DB0CC] max-w-md">{body}</p>
          <ul className="mt-6 space-y-2.5">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-[14.5px] text-[#D6DEEC]">
                <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: accent }} />{b}
              </li>
            ))}
          </ul>
          <Link href="/auth/signup" className="mt-7 inline-flex items-center gap-1.5 text-[14px] font-semibold group" style={{ color: accent }}>
            Open an account <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7 }}
          className={`relative ${flip ? 'lg:order-1' : ''}`}>
          {/* asymmetric framed photo (mixed radii, not a uniform rounded card) */}
          <div className="relative overflow-hidden rounded-tl-[26px] rounded-br-[26px] rounded-tr-sm rounded-bl-sm border border-white/[0.10]">
            <img src={img} alt={alt} loading="lazy" className="w-full h-[320px] sm:h-[380px] object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,20,40,0.15), rgba(8,17,31,0.78))' }} />
            {overlay}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <>
      <ProductSection
        id="fx" eyebrow="Foreign exchange" accent={CYAN}
        title="Spot rates. Zero bank markup."
        body="See the real mid-market rate and trade on it. We show what the banks bury in the spread, then move your money on fast rails instead of slow correspondent chains."
        img={IMG('photo-1611974789855-9c2a0a7236a3')} alt="Currency markets in motion"
        bullets={['60+ currency pairs, majors to exotics', 'Mid-market rate, fee shown upfront', 'Limit and recurring conversions']}
        overlay={
          <div className="absolute left-4 bottom-4 right-4 rounded-xl border border-white/[0.12] bg-[#08111F]/85 backdrop-blur-sm p-3.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#9DB0CC]">EUR / USD</span>
              <span className="font-satoshi text-lg font-bold text-[#00E5FF] tabular-nums">1.0847</span>
            </div>
            <div className="mt-1 text-[11px] text-[#22E0A1]">Banks quote ~1.0612 · you keep about 2.2% more</div>
          </div>
        }
      />
      <ProductSection
        id="stocks" flip eyebrow="Stocks &amp; ETFs" accent="#22E0A1"
        title="Every market, one tap away."
        body="Over 5,000 US equities and ETFs with fractional shares and recurring buys. Clean, drawable charts and instant fills — no clutter between you and the trade."
        img={IMG('photo-1504805572947-34fad45aed93')} alt="Trader watching market screens"
        bullets={['Fractional shares from $1', 'Recurring auto-invest', 'Real-time quotes and clean charts']}
        overlay={
          <div className="absolute left-4 bottom-4 flex gap-2">
            {['AAPL', 'NVDA', 'TSLA', 'VOO'].map((s) => (
              <span key={s} className="text-[11px] px-2.5 py-1 rounded-md bg-[#08111F]/85 border border-white/[0.12] text-[#D6DEEC]">{s}</span>
            ))}
          </div>
        }
      />
      <ProductSection
        id="crypto" eyebrow="Crypto" accent="#F5A623"
        title="350+ coins, self-custody optional."
        body="Trade major coins and long-tail pairs with tight spreads. Keep funds with us for speed, or connect a self-custody wallet when you want the keys."
        img={IMG('photo-1605792657660-596af9009e82')} alt="Cryptocurrency"
        bullets={['350+ pairs, deep liquidity', 'Connect a self-custody wallet', 'On-chain withdrawals in minutes']}
        overlay={
          <div className="absolute left-4 bottom-4 right-4 rounded-xl border border-white/[0.12] bg-[#08111F]/85 backdrop-blur-sm p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg grid place-items-center text-[12px] font-bold text-white" style={{ background: '#F7931A22', border: '1px solid #F7931A55' }}>BT</span>
              <span className="text-[13px] text-[#D6DEEC]">Bitcoin</span>
            </div>
            <span className="font-satoshi text-lg font-bold text-white tabular-nums">$67,482</span>
          </div>
        }
      />
    </>
  );
}

/* ─── SWIFTBRIDGE (standout) ─── */
function Bridge() {
  return (
    <section id="bridge" className="scroll-mt-24 relative py-20 sm:py-28 border-y border-white/[0.06]" style={{ background: 'linear-gradient(180deg, rgba(0,229,255,0.04), transparent 30%, rgba(59,130,246,0.05))' }}>
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#00E5FF] mb-3">
            <Globe2 className="w-4 h-4" /> SwiftBridge
          </div>
          <h2 className="font-satoshi text-[clamp(32px,5vw,58px)] font-black leading-[1] text-white">
            Send globally like it&apos;s local.
          </h2>
          <p className="mt-4 text-[16px] leading-[1.7] text-[#94A3B8]">
            Money departs one continent, lights up a glowing Swift-powered path, and lands in seconds —
            converted at real rates with the fee shown upfront. No intermediaries, no guessing games.
          </p>
        </div>

        {/* world bridge animation */}
        <div className="relative mt-12 rounded-3xl border border-white/[0.08] bg-[#08111F]/80 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '26px 26px', maskImage: 'radial-gradient(ellipse at 50% 50%, black, transparent 75%)' }} />
          <svg viewBox="0 0 1000 340" className="relative w-full">
            <defs>
              <linearGradient id="brg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={CYAN} /><stop offset="100%" stopColor={GOLD} /></linearGradient>
            </defs>
            {/* arcs between nodes */}
            {[
              { a: [180, 150], b: [520, 110] }, { a: [520, 110], b: [820, 190] }, { a: [180, 150], b: [430, 250] },
            ].map((p, i) => {
              const mid = [(p.a[0] + p.b[0]) / 2, Math.min(p.a[1], p.b[1]) - 70];
              const d = `M${p.a[0]} ${p.a[1]} Q${mid[0]} ${mid[1]} ${p.b[0]} ${p.b[1]}`;
              return (
                <g key={i}>
                  <path d={d} fill="none" stroke="url(#brg)" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="4 5" />
                  <motion.circle r="4" fill="#fff"
                    animate={{ offsetDistance: ['0%', '100%'] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
                    style={{ offsetPath: `path("${d}")` } as any} />
                </g>
              );
            })}
            {/* city nodes */}
            {[['London', 180, 150, CYAN], ['Frankfurt', 520, 110, CYAN], ['Dubai', 820, 190, GOLD], ['Lagos', 430, 250, GOLD]].map(([n, x, y, c]: any) => (
              <g key={n}>
                <circle cx={x} cy={y} r="6" fill={c} />
                <circle cx={x} cy={y} r="12" fill="none" stroke={c} strokeOpacity="0.3" />
                <text x={x} y={y - 16} textAnchor="middle" fill="#C7D2E4" fontSize="13" fontWeight="600">{n}</text>
              </g>
            ))}
          </svg>
          <div className="grid sm:grid-cols-3 gap-px bg-white/[0.06] border-t border-white/[0.06]">
            {[['Avg. arrival', '~6 seconds'], ['Fee', 'Shown upfront'], ['Rate', 'Real mid-market']].map(([k, v]) => (
              <div key={k} className="bg-[#08111F] px-6 py-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#5E7299]">{k}</div>
                <div className="font-satoshi text-lg font-bold text-white mt-1">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS (drawing path on scroll) ─── */
function HowItWorks() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] });
  const pathLen = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const steps = [
    { t: 'Sign up in 60s', d: 'Email, a tap, done. No paperwork marathon.', i: Zap },
    { t: 'Verify & fund', d: 'Bank-grade KYC and secure deposits.', i: ShieldCheck },
    { t: 'Trade or bridge', d: 'FX, stocks, crypto — or send across borders.', i: TrendingUp },
    { t: 'Watch it grow', d: 'Clear insights and clean portfolio breakdowns.', i: LineChart },
  ];
  return (
    <section id="how" ref={ref} className="scroll-mt-24 max-w-[1240px] mx-auto px-5 sm:px-8 py-16 sm:py-24">
      <h2 className="font-satoshi text-[clamp(30px,4.5vw,52px)] font-black text-white text-center">Up and running in minutes</h2>
      <p className="text-center text-[#94A3B8] mt-3 max-w-lg mx-auto">Four steps from download to your first trade or transfer.</p>
      <div className="relative mt-14">
        {/* connecting path (desktop) */}
        <svg className="hidden lg:block absolute top-7 left-0 w-full h-8" viewBox="0 0 1000 32" preserveAspectRatio="none">
          <motion.path d="M40 16 H960" fill="none" stroke="url(#brg2)" strokeWidth="2" strokeDasharray="1" style={{ pathLength: pathLen }} />
          <defs><linearGradient id="brg2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={CYAN} /><stop offset="100%" stopColor={BLUE} /></linearGradient></defs>
        </svg>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="relative">
              <div className="w-14 h-14 rounded-2xl grid place-items-center mb-4 border border-white/[0.10]" style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.18), rgba(59,130,246,0.06))' }}>
                <s.i className="w-6 h-6 text-[#00E5FF]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-satoshi text-[13px] font-black text-[#00E5FF]">0{i + 1}</span>
                <h3 className="font-satoshi text-[18px] font-bold text-white">{s.t}</h3>
              </div>
              <p className="mt-2 text-[14px] text-[#94A3B8] leading-relaxed">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── TESTIMONIALS (horizontal snap carousel) ─── */
function Testimonials() {
  const data = [
    { q: 'Cut my FX costs by 4.8% instantly. The rate is just… the rate.', n: 'Marta K.', r: 'FX trader · Lisbon' },
    { q: 'Finally, stocks, crypto and fast sends in one place. No more app-hopping.', n: 'Omar A.', r: 'Investor · Dubai' },
    { q: 'Sent money home and it landed before I locked my phone.', n: 'Chidi N.', r: 'Engineer · Lagos' },
    { q: 'Execution feels instant and the charts stay out of my way.', n: 'Sofia R.', r: 'Day trader · Madrid' },
  ];
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
        <h2 className="font-satoshi text-[clamp(30px,4.5vw,52px)] font-black text-white max-w-lg">Built for people who move money.</h2>
      </div>
      <div className="mt-10 flex gap-5 overflow-x-auto snap-x snap-mandatory px-5 sm:px-8 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {data.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
            className="snap-start shrink-0 w-[300px] sm:w-[360px] rounded-2xl border border-white/[0.08] bg-[#0B1426] p-6 hover:border-[#00E5FF]/30 transition-colors">
            <div className="flex gap-0.5 mb-3">{Array.from({ length: 5 }).map((_, k) => <Star key={k} className="w-3.5 h-3.5 text-[#C5A05B] fill-[#C5A05B]" />)}</div>
            <p className="text-[15.5px] leading-[1.6] text-[#E2E9F4]">&ldquo;{t.q}&rdquo;</p>
            <div className="mt-5 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full grid place-items-center text-[13px] font-bold text-[#9FE9FF]" style={{ background: 'linear-gradient(135deg,#0F1C3A,#142a4d)', border: '1px solid rgba(255,255,255,0.08)' }}>{t.n.split(' ').map((x) => x[0]).join('')}</span>
              <div><div className="text-[14px] font-semibold text-white">{t.n}</div><div className="text-[12px] text-[#5E7299]">{t.r}</div></div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─── PRICING (Free / Premium / Ultra) ─── */
function Pricing() {
  const tiers = [
    { n: 'Free', p: '$0', s: 'Core trading & basic Swift sends', feats: ['FX, stocks & crypto', 'Basic Swift transfers', 'Standard charts', 'Email support'], cta: 'Start free', pop: false, tall: false },
    { n: 'Premium', p: '$12', s: 'Lower fees, advanced tools, virtual cards', feats: ['Everything in Free', 'Reduced FX & trade fees', 'Advanced charts', 'Priority execution', 'Virtual cards'], cta: 'Go Premium', pop: true, tall: true },
    { n: 'Ultra', p: '$39', s: 'Highest limits & dedicated support', feats: ['Everything in Premium', 'Highest transfer limits', 'Metal card option', 'Dedicated manager', 'Exclusive insights'], cta: 'Go Ultra', pop: false, tall: false },
  ];
  return (
    <section id="pricing" className="scroll-mt-24 max-w-[1240px] mx-auto px-5 sm:px-8 py-16 sm:py-24">
      <div className="text-center max-w-xl mx-auto">
        <h2 className="font-satoshi text-[clamp(30px,4.5vw,52px)] font-black text-white">Transparent always.</h2>
        <p className="text-[#94A3B8] mt-3">No hidden fees. Pick the speed you trade at.</p>
      </div>
      <div className="mt-12 grid lg:grid-cols-3 gap-5 items-end">
        {tiers.map((t) => (
          <motion.div key={t.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className={`relative rounded-3xl border p-7 ${t.pop ? 'border-[#C5A05B]/40 bg-gradient-to-b from-[#13213f] to-[#0A1428] lg:-mt-6 lg:pb-10' : 'border-white/[0.08] bg-[#0B1426]'}`}>
            {t.pop && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold text-[#04121f]" style={{ background: `linear-gradient(90deg, ${GOLD}, #E6C77E)` }}>MOST POPULAR</div>
            )}
            <div className="font-satoshi text-[15px] font-bold uppercase tracking-[0.12em]" style={{ color: t.pop ? GOLD : '#C7D2E4' }}>{t.n}</div>
            <div className="mt-3 flex items-end gap-1.5">
              <span className="font-satoshi text-[40px] font-black text-white leading-none">{t.p}</span>
              <span className="text-[13px] text-[#5E7299] mb-1.5">/ month</span>
            </div>
            <p className="mt-2 text-[13.5px] text-[#94A3B8]">{t.s}</p>
            <ul className="mt-6 space-y-3">
              {t.feats.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px] text-[#D6DEEC]">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: t.pop ? GOLD : CYAN }} />{f}
                </li>
              ))}
            </ul>
            <Link href="/auth/signup"
              className={`mt-7 inline-flex w-full items-center justify-center gap-1.5 py-3 rounded-full text-[14px] font-bold transition-transform active:scale-[0.98] ${t.pop ? 'text-[#04121f]' : 'text-white border border-white/[0.14] hover:bg-white/[0.05]'}`}
              style={t.pop ? { background: `linear-gradient(90deg, ${GOLD}, #E6C77E)` } : undefined}>
              {t.cta} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─── ABOUT (founded 2020) ─── */
function About() {
  return (
    <section id="about" className="scroll-mt-24 max-w-[1240px] mx-auto px-5 sm:px-8 py-16 sm:py-24 border-t border-white/[0.06]">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#00E5FF] mb-4">About Swifttrade</div>
          <h2 className="font-satoshi text-[clamp(30px,4.4vw,52px)] font-black leading-[1.02] text-white">
            Founded in 2020 to take the friction out of moving money.
          </h2>
          <p className="mt-5 text-[15.5px] leading-[1.75] text-[#9DB0CC] max-w-lg">
            We started Swifttrade after one too many transfers that cost too much and took too long.
            The plan was simple: one account for FX, stocks and crypto, with cross-border transfers
            that actually arrive while you are still looking at your phone. Today a small team across
            three offices runs that account for traders in 150+ countries.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-5 max-w-md">
            {[['2020', 'Founded'], ['150+', 'Countries'], ['200k+', 'Traders']].map(([v, k]) => (
              <div key={k}>
                <div className="font-satoshi text-2xl font-black text-white">{v}</div>
                <div className="text-[12px] text-[#5E7299] mt-0.5">{k}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="overflow-hidden rounded-tr-[26px] rounded-bl-[26px] rounded-tl-sm rounded-br-sm border border-white/[0.10]">
            <img src={IMG('photo-1486406146926-c627a92ad1ab')} alt="Swifttrade headquarters skyline" loading="lazy" className="w-full h-[360px] object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent, rgba(8,17,31,0.55))' }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── CAREERS ─── */
function Careers() {
  const roles = [
    { t: 'Senior Frontend Engineer', team: 'Product', loc: 'Remote · EU' },
    { t: 'Payments Infrastructure Lead', team: 'SwiftBridge', loc: 'London' },
    { t: 'Compliance Analyst', team: 'Risk', loc: 'Lagos' },
    { t: 'Product Designer', team: 'Design', loc: 'Remote · Global' },
  ];
  return (
    <section id="careers" className="scroll-mt-24 border-t border-white/[0.06]" style={{ background: '#08111F' }}>
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-16 sm:py-24 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
        <div className="relative order-2 lg:order-1">
          <div className="overflow-hidden rounded-tl-[26px] rounded-br-[26px] rounded-tr-sm rounded-bl-sm border border-white/[0.10]">
            <img src={IMG('photo-1497215728101-856f4ea42174')} alt="Working at Swifttrade" loading="lazy" className="w-full h-[340px] object-cover" />
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#00E5FF] mb-4">Careers</div>
          <h2 className="font-satoshi text-[clamp(28px,4vw,46px)] font-black leading-[1.04] text-white">Help us move money at light speed.</h2>
          <p className="mt-4 text-[15px] leading-[1.7] text-[#9DB0CC] max-w-md">Remote-first, async by default, and obsessed with shipping. We hire for judgement and curiosity over pedigree.</p>
          <div className="mt-7 space-y-2.5">
            {roles.map((r) => (
              <a key={r.t} href="#careers" className="group flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 hover:border-[#00E5FF]/30 hover:bg-white/[0.04] transition-colors">
                <div>
                  <div className="text-[14.5px] font-semibold text-white">{r.t}</div>
                  <div className="text-[12px] text-[#5E7299]">{r.team} · {r.loc}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#5E7299] group-hover:text-[#00E5FF] group-hover:translate-x-0.5 transition-all" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── PRESS ─── */
function Press() {
  const items = [
    { src: 'TechCrunch', title: 'Swifttrade raises to push instant cross-border transfers', date: 'Mar 2025' },
    { src: 'Reuters', title: 'Fintech challenger expands FX and crypto rails to 150 markets', date: 'Jan 2025' },
    { src: 'Bloomberg', title: 'SwiftBridge settles consumer transfers in seconds, not days', date: 'Nov 2024' },
  ];
  return (
    <section id="press" className="scroll-mt-24 max-w-[1240px] mx-auto px-5 sm:px-8 py-16 sm:py-24 border-t border-white/[0.06]">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-9">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#00E5FF] mb-3">Press</div>
          <h2 className="font-satoshi text-[clamp(28px,4vw,46px)] font-black text-white">In the news.</h2>
        </div>
        <a href="#press" className="text-[14px] text-[#9DB0CC] hover:text-white inline-flex items-center gap-1.5">Media kit <ArrowRight className="w-3.5 h-3.5" /></a>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {items.map((p) => (
          <a key={p.title} href="#press" className="group rounded-2xl border border-white/[0.08] bg-[#0B1426] p-6 hover:border-[#00E5FF]/30 transition-colors">
            <div className="font-satoshi text-[15px] font-bold text-white">{p.src}</div>
            <p className="mt-3 text-[14.5px] leading-[1.5] text-[#C7D2E4]">{p.title}</p>
            <div className="mt-5 flex items-center justify-between text-[12px] text-[#5E7299]">
              <span>{p.date}</span>
              <span className="inline-flex items-center gap-1 text-[#9DB0CC] group-hover:text-[#00E5FF] transition-colors">Read <ArrowRight className="w-3 h-3" /></span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ─── BLOG ─── */
function Blog() {
  const posts = [
    { img: IMG('photo-1611974789855-9c2a0a7236a3', 800), tag: 'FX', title: 'How banks hide markup in the exchange rate', read: '5 min' },
    { img: IMG('photo-1504805572947-34fad45aed93', 800), tag: 'Investing', title: 'Fractional shares, explained without the jargon', read: '4 min' },
    { img: IMG('photo-1605792657660-596af9009e82', 800), tag: 'Crypto', title: 'Custodial vs self-custody: which is right for you', read: '6 min' },
  ];
  return (
    <section id="blog" className="scroll-mt-24 border-t border-white/[0.06]" style={{ background: '#08111F' }}>
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-9">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#00E5FF] mb-3">Blog</div>
            <h2 className="font-satoshi text-[clamp(28px,4vw,46px)] font-black text-white">Learn the markets.</h2>
          </div>
          <a href="#blog" className="text-[14px] text-[#9DB0CC] hover:text-white inline-flex items-center gap-1.5">All articles <ArrowRight className="w-3.5 h-3.5" /></a>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {posts.map((p) => (
            <a key={p.title} href="#blog" className="group rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0B1426] hover:border-[#00E5FF]/30 transition-colors">
              <div className="relative h-44 overflow-hidden">
                <img src={p.img} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
                <span className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#08111F]/85 border border-white/[0.12] text-[#9FE9FF]">{p.tag}</span>
              </div>
              <div className="p-5">
                <h3 className="font-satoshi text-[16px] font-bold text-white leading-snug group-hover:text-[#9FE9FF] transition-colors">{p.title}</h3>
                <div className="mt-3 text-[12px] text-[#5E7299]">{p.read} read</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── LEGAL (Terms / Privacy / Regulatory / Disclosures) ─── */
function Legal() {
  const blocks = [
    {
      id: 'terms', h: 'Terms of Service',
      p: 'These terms govern your use of Swifttrade. By opening an account you agree to trade and transfer within the limits of your verified tier, to provide accurate information, and to use the platform lawfully. Market orders execute at prevailing prices and may differ from the last quote shown. We may update these terms with notice; continued use means acceptance.',
    },
    {
      id: 'privacy', h: 'Privacy Policy',
      p: 'We collect only what we need to run your account and meet our legal duties: identity details for verification, device and usage data for security, and transaction records. We do not sell your personal data. You can request access, correction or deletion of your data at any time, subject to records we are legally required to keep.',
    },
    {
      id: 'regulatory', h: 'Regulatory',
      p: 'Swifttrade operates through licensed entities and partners across the jurisdictions it serves. Money-transmission, brokerage and crypto activities are provided under the relevant local authorisations and are subject to KYC and anti-money-laundering checks. Available products and limits vary by country and by your verification tier.',
    },
    {
      id: 'disclosures', h: 'Disclosures',
      p: 'Investing carries risk, including the possible loss of principal. FX and crypto are volatile and may not be suitable for every investor. Figures shown on this page are illustrative. Crypto assets are generally not covered by deposit-protection schemes. Nothing here is investment advice; consider your circumstances and seek independent advice if unsure.',
    },
  ];
  return (
    <section id="legal" className="scroll-mt-24 max-w-[1240px] mx-auto px-5 sm:px-8 py-16 sm:py-24 border-t border-white/[0.06]">
      <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#00E5FF] mb-3">Legal</div>
      <h2 className="font-satoshi text-[clamp(28px,4vw,46px)] font-black text-white mb-9">The fine print, in plain words.</h2>
      <div className="grid md:grid-cols-2 gap-x-10 gap-y-10">
        {blocks.map((b) => (
          <div key={b.id} id={b.id} className="scroll-mt-24">
            <h3 className="font-satoshi text-[18px] font-bold text-white border-l-2 pl-3" style={{ borderColor: GOLD }}>{b.h}</h3>
            <p className="mt-3 text-[14px] leading-[1.75] text-[#9DB0CC]">{b.p}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-[12px] text-[#5E7299]">Full policy documents are available on request and at account opening.</p>
    </section>
  );
}

/* ─── FINAL CTA ─── */
function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <div className="relative rounded-[32px] border border-white/[0.08] overflow-hidden px-7 py-16 sm:py-20 text-center" style={{ background: 'radial-gradient(90% 120% at 50% -10%, #12325c, #08111F)' }}>
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] blur-[100px] opacity-30" style={{ background: `radial-gradient(closest-side, ${CYAN}, transparent 70%)` }} />
          <h2 className="relative font-satoshi text-[clamp(34px,6vw,68px)] font-black leading-[1] text-white">Ready to trade and send<br className="hidden sm:block" /> at full speed?</h2>
          <div className="relative mt-9 flex flex-wrap items-center justify-center gap-3.5">
            <Link href="/auth/signup" className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-[16px] font-bold text-[#04121f]" style={{ background: `linear-gradient(90deg, ${CYAN}, ${BLUE})`, boxShadow: '0 8px 40px rgba(0,229,255,0.30)' }}>
              Open your account — free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/signup" className="inline-flex items-center gap-2 px-6 py-4 rounded-full text-[15px] font-semibold text-white border border-white/[0.14] hover:bg-white/[0.05] transition-colors">For business</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function SiteFooter() {
  const cols = [
    { h: 'Product', l: [['FX', '#fx'], ['Stocks', '#stocks'], ['Crypto', '#crypto'], ['SwiftBridge', '#bridge'], ['Pricing', '#pricing']] },
    { h: 'Company', l: [['About', '#about'], ['Careers', '#careers'], ['Press', '#press'], ['Blog', '#blog']] },
    { h: 'Legal', l: [['Terms', '#terms'], ['Privacy', '#privacy'], ['Regulatory', '#regulatory'], ['Disclosures', '#disclosures']] },
  ];
  return (
    <footer id="company" className="border-t border-white/[0.06]" style={{ background: '#070E1C' }}>
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-14">
        <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
          <div>
            <div className="flex items-center gap-2.5"><Mark /><span className="font-satoshi font-black text-[19px] text-white">Swift<span className="text-[#00E5FF]">trade</span></span></div>
            <p className="mt-4 text-[13.5px] text-[#7E92B5] max-w-xs leading-relaxed">Markets without borders. Money at light speed. Trade FX, stocks and crypto, and send across the world in seconds.</p>
            <div className="mt-5 flex gap-2.5 max-w-xs">
              <input placeholder="Email for product updates" className="flex-1 rounded-full bg-white/[0.04] border border-white/[0.10] px-4 py-2.5 text-[13px] text-white placeholder:text-[#5E7299] outline-none focus:border-[#00E5FF]/40" />
              <button className="rounded-full px-4 text-[#04121f] font-bold text-[13px]" style={{ background: `linear-gradient(90deg, ${CYAN}, ${BLUE})` }}>Join</button>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <div className="text-[12px] uppercase tracking-[0.18em] text-[#5E7299] mb-4">{c.h}</div>
              <ul className="space-y-2.5">
                {c.l.map(([x, href]) => <li key={x}><a href={href} className="text-[14px] text-[#C7D2E4] hover:text-white transition-colors">{x}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#5E7299]">
          <p>© {new Date().getFullYear()} Swifttrade. Investing involves risk, including loss of principal.</p>
          <p>Regulated · 150+ countries · 4.9/5 from 200k+ users</p>
        </div>
      </div>
    </footer>
  );
}
