'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Bitcoin, LineChart, Globe2 } from 'lucide-react';

const CARDS = [
  {
    title: 'Cryptocurrency',
    href: '/auth/signup',
    icon: Bitcoin,
    accent: '#F7931A',
    glow: 'rgba(247,147,26,0.18)',
    blurb: 'Spot trade BTC, ETH, SOL and 40+ assets with self-custody at any time.',
    tickers: [
      { s: 'BTC', p: '$67,420', d: '+2.4%' },
      { s: 'ETH', p: '$3,184',  d: '+1.8%' },
      { s: 'SOL', p: '$148.20', d: '+4.2%' },
    ],
    seed: 47,
  },
  {
    title: 'Foreign Exchange',
    href: '/auth/signup',
    icon: Globe2,
    accent: '#5B7CFF',
    glow: 'rgba(91,124,255,0.18)',
    blurb: 'Leveraged FX across the 30 most-liquid majors and crosses, no hidden spread.',
    tickers: [
      { s: 'EUR/USD', p: '1.0842', d: '+0.18%' },
      { s: 'GBP/USD', p: '1.2631', d: '+0.06%' },
      { s: 'USD/JPY', p: '156.21', d: '+0.31%' },
    ],
    seed: 23,
  },
  {
    title: 'Stocks & ETFs',
    href: '/auth/signup',
    icon: LineChart,
    accent: '#00E88F',
    glow: 'rgba(0,232,143,0.18)',
    blurb: 'Buy fractional shares of 500+ US stocks and ETFs. From $1, recurring built-in.',
    tickers: [
      { s: 'NVDA', p: '$943.21', d: '+2.87%' },
      { s: 'AAPL', p: '$189.45', d: '+1.13%' },
      { s: 'VOO',  p: '$512.34', d: '+0.42%' },
    ],
    seed: 71,
  },
];

export default function AssetClassCards() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-12 sm:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.10] bg-white/[0.03] mb-5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#94A3B8]">Markets</span>
          </div>
          <h2 className="text-[36px] sm:text-[44px] lg:text-[52px] font-bold tracking-tight text-white leading-[1.02]">
            Three markets.
            <br />
            <span className="bg-gradient-to-r from-[#00E88F] via-[#22D3EE] to-[#5B7CFF] bg-clip-text text-transparent">
              One account.
            </span>
          </h2>
          <p className="mt-5 text-[16px] text-[#94A3B8] leading-relaxed">
            Move capital between crypto, FX and equities without leaving Swift
            Trade. Settle in any of 12 supported currencies.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
            >
              <Link
                href={card.href}
                className="group relative block overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0D1324] via-[#0B1020] to-[#080A15] p-6 h-full hover:border-white/[0.15] transition-colors"
              >
                {/* Glow */}
                <div
                  className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: card.glow }}
                />

                {/* Icon */}
                <div
                  className="relative w-12 h-12 rounded-2xl border border-white/[0.08] flex items-center justify-center mb-5"
                  style={{
                    background: `linear-gradient(135deg, ${card.accent}22, transparent)`,
                  }}
                >
                  <card.icon className="w-5 h-5" style={{ color: card.accent }} />
                </div>

                {/* Title + blurb */}
                <h3 className="text-[20px] font-semibold text-white mb-2">{card.title}</h3>
                <p className="text-[13.5px] text-[#94A3B8] leading-relaxed mb-5">
                  {card.blurb}
                </p>

                {/* Mini sparkline */}
                <Sparkline seed={card.seed} accent={card.accent} />

                {/* Tickers */}
                <div className="mt-4 space-y-1.5">
                  {card.tickers.map(t => (
                    <div key={t.s} className="flex items-center justify-between text-[12.5px]">
                      <span className="text-[#94A3B8] font-medium">{t.s}</span>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="text-white">{t.p}</span>
                        <span className="text-[#00E88F] text-[11.5px]">{t.d}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Arrow */}
                <div className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: card.accent }}>
                  Open market
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Sparkline({ seed, accent }: { seed: number; accent: string }) {
  let s = seed % 9973 || 1;
  const lcg = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s % 1000) / 1000; };
  const N = 30, W = 280, H = 56;
  const pts: number[] = [];
  let v = 50;
  for (let i = 0; i < N; i++) {
    v += (lcg() - 0.45) * 8;
    v = Math.max(20, Math.min(80, v));
    pts.push(v);
  }
  pts[N - 1] = Math.max(...pts, 70);
  const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1;
  const step = W / (N - 1);
  let line = '';
  for (let i = 0; i < N; i++) {
    const x = i * step;
    const y = H - ((pts[i] - min) / range) * (H - 8) - 4;
    line += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  const area = `${line} L${W},${H} L0,${H} Z`;
  const gid = `spark-${seed}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
