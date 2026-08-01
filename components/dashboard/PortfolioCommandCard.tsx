'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, TrendingUp, TrendingDown } from 'lucide-react';

type Range = '1D' | '1W' | '1M' | '1Y' | 'ALL';
const RANGES: Range[] = ['1D', '1W', '1M', '1Y', 'ALL'];

export function PortfolioCommandCard({
  totalAssets,
  cashBalance,
  investValue,
  cryptoValue = 0,
  fxValue = 0,
  dayPnl,
  dayPct,
}: {
  totalAssets: number;
  cashBalance: number;
  investValue: number;
  cryptoValue?: number;
  fxValue?: number;
  dayPnl: number;
  dayPct: number;
}) {
  const [hide, setHide] = useState(false);
  const [range, setRange] = useState<Range>('1M');
  const [pathLen, setPathLen] = useState(800);
  const up = dayPnl >= 0;

  const { path, area } = useMemo(
    () => buildChartPath({ seed: totalAssets + RANGES.indexOf(range), up, width: 800, height: 140 }),
    [totalAssets, range, up]
  );

  useEffect(() => {
    const id = setTimeout(() => {
      const el = document.querySelector('[data-portfolio-line]') as SVGPathElement | null;
      if (el) setPathLen(el.getTotalLength());
    }, 50);
    return () => clearTimeout(id);
  }, [path]);

  const allocations = [
    { label: 'Stocks',  value: investValue, color: '#C4A052' },
    { label: 'Crypto',  value: cryptoValue, color: '#C4A052' },
    { label: 'Forex',   value: fxValue,     color: '#3B948C' },
    { label: 'Cash',    value: cashBalance, color: '#64748B' },
  ].filter(a => a.value > 0);
  const allocTotal = allocations.reduce((s, a) => s + a.value, 0) || 1;

  const accent = up ? '#00C805' : '#FF4D3D';

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] to-[var(--inset)] p-5 sm:p-7 lg:p-8">
      <div
        className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: `radial-gradient(closest-side, ${accent}, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#94A3B8]">Portfolio value</p>
          <div className="mt-2 flex items-baseline gap-3 flex-wrap">
            <h2 className="text-[36px] sm:text-[44px] lg:text-[52px] font-bold text-[var(--text)] tabular-nums leading-none tracking-tight">
              {hide ? '••••••' : fmtUSD(totalAssets)}
            </h2>
            <span className={`text-[14px] font-medium tabular-nums flex items-center gap-1 ${up ? 'text-[#00C805]' : 'text-[#FF4D3D]'}`}>
              {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {hide ? '••••' : (
                <>
                  {up ? '+' : '−'}{fmtUSD(Math.abs(dayPnl))} ({up ? '+' : ''}{dayPct.toFixed(2)}%)
                </>
              )}
              <span className="text-[#64748B] ml-1">today</span>
            </span>
          </div>
        </div>
        <button
          onClick={() => setHide(!hide)}
          className="w-9 h-9 rounded-full border border-[var(--border)] bg-white/[0.03] hover:bg-white/[0.06] flex items-center justify-center text-[#94A3B8] transition-colors shrink-0"
          aria-label={hide ? 'Show balance' : 'Hide balance'}
        >
          {hide ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <div className="relative mt-5 -mx-1">
        <svg viewBox="0 0 800 140" width="100%" height="140" preserveAspectRatio="none" className="overflow-visible">
          <defs>
            <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.30" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="portfolioLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"  stopColor="#22D3EE" />
              <stop offset="50%" stopColor={accent} />
              <stop offset="100%" stopColor="#5B7CFF" />
            </linearGradient>
          </defs>
          {[25, 70, 115].map(y => (
            <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="2 6" />
          ))}
          <path d={area} fill="url(#portfolioFill)" />
          <path
            data-portfolio-line
            d={path}
            fill="none"
            stroke="url(#portfolioLine)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: pathLen,
              strokeDashoffset: pathLen,
              animation: 'pcc-sweep 0.6s ease-out forwards',
            }}
          />
        </svg>
        <style jsx>{`
          @keyframes pcc-sweep {
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 h-8 rounded-lg text-[11.5px] font-semibold transition-colors ${
              range === r
                ? 'bg-white/10 text-[var(--text)]'
                : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[var(--inset)]'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {allocations.length > 0 && (
        <div className="mt-5 pt-5 border-t border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10.5px] uppercase tracking-[0.2em] text-[#94A3B8]">Holdings</span>
            <span className="text-[11px] text-[#64748B]">{hide ? '••••' : `${allocations.length} asset classes`}</span>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.04]">
            {allocations.map(a => (
              <div
                key={a.label}
                className="h-full transition-all duration-500"
                style={{
                  width: `${(a.value / allocTotal) * 100}%`,
                  background: a.color,
                }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {allocations.map(a => (
              <div key={a.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                <span className="text-[12px] text-[#94A3B8]">{a.label}</span>
                <span className="text-[12px] text-[var(--text)] font-medium tabular-nums">
                  {hide ? '••' : `${((a.value / allocTotal) * 100).toFixed(0)}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function fmtUSD(v: number) {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildChartPath({ seed, up, width, height }: { seed: number; up: boolean; width: number; height: number }) {
  let s = Math.floor((seed || 1) * 1000) % 9973 || 1;
  const lcg = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s % 1000) / 1000; };
  const N = 48;
  const pts: number[] = [];
  let v = 50;
  for (let i = 0; i < N; i++) {
    v += (lcg() - (up ? 0.42 : 0.58)) * 8;
    v = Math.max(15, Math.min(85, v));
    pts.push(v);
  }
  if (up) pts[N - 1] = Math.max(...pts, 75);
  else    pts[N - 1] = Math.min(...pts, 25);
  const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1;
  const step = width / (N - 1);
  let path = '';
  for (let i = 0; i < N; i++) {
    const x = i * step;
    const y = height - ((pts[i] - min) / range) * (height - 8) - 4;
    path += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  const area = `${path} L${width},${height} L0,${height} Z`;
  return { path, area };
}
