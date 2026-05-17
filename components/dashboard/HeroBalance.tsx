'use client';

import Link from 'next/link';
import { memo, useEffect, useState } from 'react';
import { Eye, EyeOff, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Globe, Activity } from 'lucide-react';
import { genSpark } from './MiniSpark';

type Props = { balance: number; todayPnl?: number; todayPct?: number; hkd?: number };

function HeroBalance({ balance, todayPnl = 0, todayPct = 0, hkd }: Props) {
  const [hide, setHide] = useState(false);
  const [spark, setSpark] = useState(() => genSpark(48, 100, 0.008, 0.04));

  useEffect(() => {
    const id = setInterval(() => {
      setSpark(prev => {
        const next = [...prev.slice(1), prev[prev.length - 1] * (1 + (Math.random() - 0.45) * 0.012)];
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const sparkSvg = (() => {
    const min = Math.min(...spark);
    const max = Math.max(...spark);
    const range = max - min || 1;
    const w = 600, h = 80;
    return spark.map((v, i) => {
      const x = (i / (spark.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  })();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-pearl-100/[0.08] bg-gradient-to-br from-charcoal/80 via-obsidian/85 to-void shadow-glow-soft">
      <div className="absolute -top-20 -right-20 w-[420px] h-[420px] bg-sapphire-500/[0.18] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[320px] h-[320px] bg-champagne-400/[0.10] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-grid-blue bg-[size:30px_30px] opacity-30 pointer-events-none" />

      <svg viewBox="0 0 600 80" preserveAspectRatio="none" className="absolute bottom-0 left-0 right-0 h-32 w-full opacity-40 pointer-events-none">
        <defs>
          <linearGradient id="hero-wave" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5b6dff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#5b6dff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={`0,80 ${sparkSvg} 600,80`} fill="url(#hero-wave)" />
        <polyline points={sparkSvg} fill="none" stroke="#8b97ff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      <div className="relative p-6 lg:p-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-pearl-50/[0.04] border border-pearl-100/[0.06]">
              <Activity className="w-3 h-3 text-sapphire-300" />
              <span className="text-[9px] uppercase tracking-[0.25em] text-pearl-300/85 font-medium">Net assets</span>
            </div>
            <span className="text-[10px] text-pearl-300/45 font-mono">USD · live</span>
          </div>
          <button onClick={() => setHide(!hide)} className="p-1.5 hover:bg-pearl-50/[0.04] rounded-lg transition-colors">
            {hide ? <EyeOff className="w-4 h-4 text-pearl-300/55" /> : <Eye className="w-4 h-4 text-pearl-300/55" />}
          </button>
        </div>

        <div className="font-serif font-light text-5xl lg:text-7xl text-pearl-50 tracking-tight leading-none">
          {hide ? '••••••••' : `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px]">
          <span className={`inline-flex items-center gap-1 font-mono tabular-nums ${todayPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {todayPnl >= 0 ? <TrendingUp className="w-3 h-3" /> : null}
            {todayPnl >= 0 ? '+' : ''}${Math.abs(todayPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-pearl-300/65">today</span>
          </span>
          {todayPct !== 0 && (
            <span className={`font-mono tabular-nums ${todayPct >= 0 ? 'text-profit/85' : 'text-loss/85'}`}>
              {todayPct >= 0 ? '+' : ''}{todayPct.toFixed(2)}%
            </span>
          )}
          {hkd !== undefined && (
            <>
              <span className="w-px h-3 bg-pearl-100/15" />
              <span className="text-pearl-300/55 font-mono tabular-nums">
                ≈ {hide ? '••••••' : `${hkd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HKD`}
              </span>
            </>
          )}
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          <Link href="/dashboard/wallet" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-sapphire-500 to-sapphire-600 hover:from-sapphire-400 hover:to-sapphire-500 text-pearl-50 font-medium text-[13px] rounded-lg transition-all shadow-glow-electric">
            <ArrowDownToLine className="w-3.5 h-3.5" /> Deposit
          </Link>
          <Link href="/dashboard/wallet?tab=withdraw" className="inline-flex items-center gap-2 px-4 py-2.5 border border-pearl-100/[0.12] hover:border-pearl-100/[0.25] hover:bg-pearl-50/[0.03] text-pearl-100 font-medium text-[13px] rounded-lg transition-all">
            <ArrowUpFromLine className="w-3.5 h-3.5" /> Withdraw
          </Link>
          <Link href="/dashboard/trade/crypto" className="inline-flex items-center gap-2 px-4 py-2.5 border border-pearl-100/[0.12] hover:border-pearl-100/[0.25] hover:bg-pearl-50/[0.03] text-pearl-100 font-medium text-[13px] rounded-lg transition-all">
            <TrendingUp className="w-3.5 h-3.5" /> Trade
          </Link>
          <Link href="/dashboard/bridge" className="inline-flex items-center gap-2 px-4 py-2.5 bg-champagne-400/[0.10] border border-champagne-400/30 hover:bg-champagne-400/15 text-champagne-200 font-medium text-[13px] rounded-lg transition-all">
            <Globe className="w-3.5 h-3.5" /> SwiftBridge
          </Link>
        </div>
      </div>
    </div>
  );
}

export default memo(HeroBalance);
