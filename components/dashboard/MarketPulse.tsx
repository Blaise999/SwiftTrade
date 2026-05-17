'use client';

import Link from 'next/link';
import { memo, useEffect, useState } from 'react';
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import MiniSpark, { genSpark } from './MiniSpark';

type MarketRow = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  spark: number[];
  category: 'crypto' | 'fx' | 'eq';
  href: string;
};

const SEED: MarketRow[] = [
  { symbol: 'BTC',     name: 'Bitcoin',  price: 67_420.32, change: +2.42, spark: genSpark(40, 67000, 0.005, 0.04),  category: 'crypto', href: '/dashboard/trade/crypto' },
  { symbol: 'ETH',     name: 'Ethereum', price: 3_512.18,  change: +1.84, spark: genSpark(40, 3470, 0.005, 0.03),    category: 'crypto', href: '/dashboard/trade/crypto' },
  { symbol: 'SOL',     name: 'Solana',   price: 142.07,    change: -0.91, spark: genSpark(40, 143, 0.006, -0.015),    category: 'crypto', href: '/dashboard/trade/crypto' },
  { symbol: 'EUR/USD', name: 'Euro / Dollar',  price: 1.08315, change: +0.12, spark: genSpark(40, 1.083, 0.0008, 0.002), category: 'fx', href: '/dashboard/trade/fx' },
  { symbol: 'GBP/USD', name: 'Pound / Dollar', price: 1.26405, change: -0.08, spark: genSpark(40, 1.264, 0.0009, -0.001),category: 'fx', href: '/dashboard/trade/fx' },
  { symbol: 'XAU/USD', name: 'Gold spot',      price: 2328.05, change: +0.45, spark: genSpark(40, 2325, 0.001, 0.005),   category: 'fx', href: '/dashboard/trade/fx' },
  { symbol: 'AAPL',    name: 'Apple',          price: 189.45,  change: +1.13, spark: genSpark(40, 188.0, 0.003, 0.012),  category: 'eq', href: '/dashboard/trade/stocks' },
  { symbol: 'NVDA',    name: 'NVIDIA',         price: 943.21,  change: +2.87, spark: genSpark(40, 922.0, 0.004, 0.025),  category: 'eq', href: '/dashboard/trade/stocks' },
  { symbol: 'TSLA',    name: 'Tesla',          price: 247.18,  change: -1.42, spark: genSpark(40, 251.0, 0.005, -0.018), category: 'eq', href: '/dashboard/trade/stocks' },
];

const PILL_COLORS: Record<string, string> = {
  crypto: 'bg-champagne-400/10 border-champagne-400/25 text-champagne-300',
  fx:     'bg-sapphire-500/10 border-sapphire-500/25 text-sapphire-300',
  eq:     'bg-cyan/10 border-cyan/25 text-cyan',
};
const PILL_LABEL: Record<string, string> = { crypto: 'Crypto', fx: 'FX', eq: 'Stock' };

function MarketPulse() {
  const [rows, setRows] = useState<MarketRow[]>(SEED);

  useEffect(() => {
    const id = setInterval(() => {
      setRows(prev => prev.map(r => {
        const j = (Math.random() - 0.5) * r.price * 0.001;
        const cj = (Math.random() - 0.5) * 0.05;
        const newSpark = [...r.spark.slice(1), r.price + j];
        return { ...r, price: r.price + j, change: r.change + cj, spark: newSpark };
      }));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {rows.map(r => (
        <Link key={r.symbol} href={r.href}
          className="group relative rounded-xl border border-pearl-100/[0.07] bg-gradient-to-br from-charcoal/40 to-obsidian/60 hover:border-sapphire-500/30 hover:from-charcoal/60 hover:to-obsidian/80 p-4 transition-all overflow-hidden">
          <div className="flex items-start justify-between mb-3">
            <div className="flex flex-col gap-1">
              <span className={`inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[8.5px] uppercase tracking-[0.18em] font-medium border ${PILL_COLORS[r.category]}`}>
                {PILL_LABEL[r.category]}
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-pearl-50 font-medium text-[14px]">{r.symbol}</span>
              </div>
              <span className="text-pearl-300/55 text-[10.5px] truncate">{r.name}</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-pearl-300/30 group-hover:text-sapphire-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="font-mono tabular-nums text-pearl-50 text-[15px] font-medium">
                {r.symbol.includes('/') && r.price < 100
                  ? r.price.toFixed(5)
                  : r.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`flex items-center gap-1 text-[11px] font-mono mt-0.5 ${r.change >= 0 ? 'text-profit' : 'text-loss'}`}>
                {r.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {r.change >= 0 ? '+' : ''}{r.change.toFixed(2)}%
              </div>
            </div>
            <div className="flex-shrink-0"><MiniSpark data={r.spark} up={r.change >= 0} width={84} height={28} /></div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default memo(MarketPulse);
