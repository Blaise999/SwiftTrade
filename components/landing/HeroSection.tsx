'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Shield, Globe } from 'lucide-react';
import { useEffect, useState } from 'react';

const ORBS = [
  { label: 'USD', x: '8%',  y: '22%', delay: 0,    color: '#22D3EE' },
  { label: 'HKD', x: '88%', y: '18%', delay: 0.4,  color: '#E7C66A' },
  { label: 'BTC', x: '92%', y: '70%', delay: 0.8,  color: '#F7931A' },
  { label: 'NGN', x: '4%',  y: '72%', delay: 1.2,  color: '#00E88F' },
  { label: 'EUR', x: '80%', y: '42%', delay: 1.6,  color: '#5B7CFF' },
];

export default function HeroSection() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24">
      {/* ── Atmospheric backdrop ── */}
      <div className="absolute inset-0 -z-10">
        {/* Deep gradient base */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(91,124,255,0.20), transparent 65%),' +
              'radial-gradient(ellipse 60% 50% at 12% 70%, rgba(0,232,143,0.10), transparent 60%),' +
              'radial-gradient(ellipse 60% 50% at 90% 80%, rgba(231,198,106,0.08), transparent 60%),' +
              'linear-gradient(180deg, #050713 0%, #080D1C 50%, #050713 100%)',
          }}
        />
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 80%)',
          }}
        />
      </div>

      {/* ── Floating currency orbs ── */}
      <div className="absolute inset-0 -z-10 pointer-events-none hidden md:block">
        {ORBS.map(orb => (
          <motion.div
            key={orb.label}
            className="absolute"
            style={{ left: orb.x, top: orb.y }}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: [0, 1, 1, 0.8],
              y: [20, 0, -8, 0],
            }}
            transition={{
              duration: 4,
              delay: orb.delay,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${orb.color}30, ${orb.color}08)`,
                border: `1px solid ${orb.color}30`,
                boxShadow: `0 0 32px ${orb.color}20`,
              }}
            >
              <span className="text-[11px] font-semibold tracking-wider text-white">{orb.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* ── LEFT — Copy ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-7"
          >
            {/* Eyebrow chip */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.10] bg-white/[0.03] backdrop-blur-md mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E88F] animate-pulse" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
                Live · Hong Kong · 24/7
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[44px] sm:text-[56px] lg:text-[72px] leading-[0.96] font-bold tracking-tight text-white">
              Trade global markets
              <br />
              <span className="bg-gradient-to-r from-[#00E88F] via-[#22D3EE] to-[#5B7CFF] bg-clip-text text-transparent">
                without borders.
              </span>
            </h1>

            <p className="mt-6 text-[16px] sm:text-[18px] leading-relaxed text-[#94A3B8] max-w-2xl">
              Fund locally in your currency. Trade crypto, forex and stocks
              globally. Move money across markets from one Swift Trade account
              — engineered in Hong Kong since 2018.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/auth/signup"
                className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[15px] font-semibold text-[#050713] transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #00E88F 0%, #22D3EE 50%, #5B7CFF 100%)',
                  boxShadow: '0 10px 32px -8px rgba(34,211,238,0.5)',
                }}
              >
                Open account
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[15px] font-medium text-white border border-white/[0.12] hover:bg-white/[0.04] backdrop-blur-md transition-colors"
              >
                Sign in
              </Link>
            </div>

            {/* Trust strip */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2 text-[#94A3B8]">
                <Shield className="w-4 h-4 text-[#E7C66A]" />
                <span className="text-[12px]">Audited custody</span>
              </div>
              <div className="flex items-center gap-2 text-[#94A3B8]">
                <Globe className="w-4 h-4 text-[#22D3EE]" />
                <span className="text-[12px]">12+ currencies</span>
              </div>
              <div className="flex items-center gap-2 text-[#94A3B8]">
                <TrendingUp className="w-4 h-4 text-[#00E88F]" />
                <span className="text-[12px]">$2.4B+ volume</span>
              </div>
            </div>
          </motion.div>

          {/* ── RIGHT — Mini-dashboard mockup ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="lg:col-span-5"
          >
            <div className="relative">
              {/* Soft glow behind card */}
              <div
                className="absolute -inset-6 -z-10 rounded-[40px] blur-3xl opacity-50"
                style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.20), transparent 60%)' }}
              />

              {/* Floating mini card stack */}
              <DashboardPreview tick={tick} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// DashboardPreview — animated mini portfolio card
// ────────────────────────────────────────────────────────────────────────
function DashboardPreview({ tick }: { tick: number }) {
  // A deterministic walk that animates by re-seeding on each tick
  const seed = 1234 + tick * 31;
  const path = useChartPath(seed);

  return (
    <div className="relative rounded-3xl border border-white/[0.10] bg-gradient-to-br from-[#0D1324] via-[#0B1020] to-[#080A15] p-5 sm:p-6 shadow-2xl shadow-black/40">
      {/* Top header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00E88F] animate-pulse" />
          <span className="text-[10.5px] uppercase tracking-[0.18em] text-[#94A3B8]">Live portfolio</span>
        </div>
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
        </div>
      </div>

      {/* Big number */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.15em] text-[#94A3B8]">Total value</p>
        <p className="mt-1 text-[36px] sm:text-[42px] font-bold text-white tracking-tight tabular-nums leading-none">
          $216,930.<span className="text-[#94A3B8]">42</span>
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[13px]">
          <TrendingUp className="w-3.5 h-3.5 text-[#00E88F]" />
          <span className="text-[#00E88F] font-medium tabular-nums">+$3,182.55</span>
          <span className="text-[#64748B]">(+1.49%) today</span>
        </p>
      </div>

      {/* Animated chart */}
      <div className="mt-5">
        <svg viewBox="0 0 320 96" width="100%" height="96" preserveAspectRatio="none">
          <defs>
            <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E88F" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#00E88F" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hero-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="60%" stopColor="#00E88F" />
              <stop offset="100%" stopColor="#5B7CFF" />
            </linearGradient>
          </defs>
          <motion.path
            key={tick}
            d={path.area}
            fill="url(#hero-fill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          />
          <motion.path
            key={`line-${tick}`}
            d={path.line}
            fill="none"
            stroke="url(#hero-line)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
      </div>

      {/* Asset chips */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {[
          { l: 'BTC', v: '+2.4%', c: '#F7931A' },
          { l: 'NVDA', v: '+1.9%', c: '#76B900' },
          { l: 'EUR/USD', v: '+0.18%', c: '#5B7CFF' },
          { l: 'AAPL', v: '+1.1%', c: '#A1A1AA' },
        ].map(chip => (
          <div
            key={chip.l}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.03]"
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: chip.c }} />
            <span className="text-[10.5px] font-medium text-white">{chip.l}</span>
            <span className="text-[10.5px] text-[#00E88F] tabular-nums">{chip.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function useChartPath(seed: number) {
  // Deterministic random walk
  let s = seed % 9973 || 1;
  const lcg = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s % 1000) / 1000; };
  const N = 40, W = 320, H = 96;
  const pts: number[] = [];
  let v = 50;
  for (let i = 0; i < N; i++) {
    v += (lcg() - 0.42) * 7;
    v = Math.max(20, Math.min(80, v));
    pts.push(v);
  }
  pts[N - 1] = Math.max(...pts, 75);
  const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1;
  const step = W / (N - 1);
  let line = '';
  for (let i = 0; i < N; i++) {
    const x = i * step;
    const y = H - ((pts[i] - min) / range) * (H - 12) - 6;
    line += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  const area = `${line} L${W},${H} L0,${H} Z`;
  return { line, area };
}
