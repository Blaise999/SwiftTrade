'use client';

import { memo, useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

type Tick = { sym: string; px: number; chg: number; cls?: 'crypto' | 'fx' | 'eq' };

const SEED: Tick[] = [
  { sym: 'BTC',     px: 67_420.32, chg: +2.42, cls: 'crypto' },
  { sym: 'ETH',     px: 3_512.18,  chg: +1.84, cls: 'crypto' },
  { sym: 'SOL',     px: 142.07,    chg: -0.91, cls: 'crypto' },
  { sym: 'EUR/USD', px: 1.08315,   chg: +0.12, cls: 'fx' },
  { sym: 'GBP/USD', px: 1.26405,   chg: -0.08, cls: 'fx' },
  { sym: 'USD/JPY', px: 154.205,   chg: +0.34, cls: 'fx' },
  { sym: 'XAU/USD', px: 2328.05,   chg: +0.45, cls: 'fx' },
  { sym: 'AAPL',    px: 189.45,    chg: +1.13, cls: 'eq' },
  { sym: 'NVDA',    px: 943.21,    chg: +2.87, cls: 'eq' },
  { sym: 'TSLA',    px: 247.18,    chg: -1.42, cls: 'eq' },
  { sym: 'MSFT',    px: 412.74,    chg: +0.62, cls: 'eq' },
  { sym: 'BNB',     px: 598.21,    chg: +1.07, cls: 'crypto' },
  { sym: 'AVAX',    px: 36.84,     chg: +1.92, cls: 'crypto' },
  { sym: 'USD/HKD', px: 7.8108,    chg: +0.02, cls: 'fx' },
];

function StreamingTicker() {
  const [ticks, setTicks] = useState<Tick[]>(SEED);

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

  const all = useMemo(() => [...ticks, ...ticks, ...ticks], [ticks]);

  return (
    <div className="relative bg-obsidian/60 backdrop-blur-xl border border-pearl-100/[0.06] rounded-xl overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-obsidian to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-obsidian to-transparent z-10" />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-md bg-obsidian/90 border border-pearl-100/[0.08]">
        <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse" />
        <span className="text-[9px] tracking-[0.2em] uppercase text-pearl-300/85 font-medium">Live</span>
      </div>
      <div className="flex animate-ticker py-3 pl-24 whitespace-nowrap">
        {all.map((t, i) => (
          <div key={i} className="flex items-center gap-2.5 px-5 text-[12px] border-r border-pearl-100/[0.04]">
            <span className={`w-1 h-1 rounded-full ${t.cls === 'crypto' ? 'bg-champagne-400' : t.cls === 'fx' ? 'bg-sapphire-400' : 'bg-cyan'}`} />
            <span className="text-pearl-200/85 font-medium tracking-wide">{t.sym}</span>
            <span className="text-pearl-50 font-mono tabular-nums">
              {t.px.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: t.px < 10 ? 5 : 2 })}
            </span>
            <span className={`font-mono tabular-nums text-[11px] flex items-center gap-0.5 ${t.chg >= 0 ? 'text-profit' : 'text-loss'}`}>
              {t.chg >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {t.chg >= 0 ? '+' : ''}{t.chg.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(StreamingTicker);
