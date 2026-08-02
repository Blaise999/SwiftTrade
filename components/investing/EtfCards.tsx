'use client';

import { AssetLogo } from '@/components/AssetLogo';
import Link from 'next/link';
import { memo } from 'react';
import { TrendingUp, TrendingDown, Star, Plus, Repeat } from 'lucide-react';
import type { Etf } from '@/lib/etf-data';

/* ────────────────────────────────────────────────────────────────────
   Design tokens (from product spec):
   bg #0A1526 · card #0F1D33 / #13243D · border rgba(255,255,255,.06)
   text #FFF / #8A9BB3 / #5C6B80 · gain #00C805 · loss #FF4D3D
   premium blue #3B948C · wealth gold #C4A052
   ──────────────────────────────────────────────────────────────────── */

export function Sparkline({
  seed, up, w = 96, h = 36,
}: { seed: number; up: boolean; w?: number; h?: number }) {
  // Deterministic pseudo-random path from a seed so it's stable per render
  const pts: number[] = [];
  let v = 50;
  let s = Math.floor(seed * 1000) % 9973;
  for (let i = 0; i < 24; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    v += ((s % 100) / 100 - (up ? 0.42 : 0.58)) * 9;
    v = Math.max(8, Math.min(92, v));
    pts.push(v);
  }
  if (up) pts[pts.length - 1] = Math.max(...pts);
  const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1;
  const path = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((p - min) / range) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const color = up ? '#00C805' : '#FF4D3D';
  const gid = `sg-${Math.round(seed * 1e6)}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${w},${h} L0,${h} Z`} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const fmtPrice = (p: number) =>
  p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─── Responsive, full-width sparkline (fills its container, never overflows) ─── */
export function FullSparkline({
  seed, up, h = 96,
}: { seed: number; up: boolean; h?: number }) {
  const W = 1000; // internal viewBox units — scales to 100% width
  const pts: number[] = [];
  let v = 50;
  let s = Math.floor(seed * 1000) % 9973;
  for (let i = 0; i < 60; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    v += ((s % 100) / 100 - (up ? 0.45 : 0.55)) * 7;
    v = Math.max(8, Math.min(92, v));
    pts.push(v);
  }
  if (up) pts[pts.length - 1] = Math.max(...pts);
  const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1;
  const path = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * W;
      const y = h - ((p - min) / range) * (h - 6) - 3;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const color = up ? '#00C805' : '#FF4D3D';
  const gid = `fsg-${Math.round(seed * 1e6)}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${h}`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height: h }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${W},${h} L0,${h} Z`} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ─── Compact ETF card (used in horizontal category rows) ─── */
export const EtfCard = memo(function EtfCard({
  etf, livePrice, liveChangePct,
}: { etf: Etf; livePrice?: number; liveChangePct?: number }) {
  const price = Number.isFinite(livePrice as number) ? (livePrice as number) : etf.seedPrice;
  const changePct = Number.isFinite(liveChangePct as number) ? (liveChangePct as number) : etf.seedChangePct;
  const up = changePct >= 0;
  const live = Number.isFinite(livePrice as number);
  return (
    <Link
      href={`/dashboard/invest/asset/${etf.symbol}`}
      prefetch={false}
      className="group relative shrink-0 min-w-[200px] w-[200px] sm:w-[220px] rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--inset)] border-[var(--border-strong)] transition-all p-4 active:scale-[0.98]"
    >
      {/* top: logo + tag */}
      <div className="flex items-center justify-between mb-3">
        <AssetLogo symbol={etf.symbol} kind={(etf as any).assetType === 'stock' ? 'stock' : 'etf'} size={38} />
        <span className={`shrink-0 text-[9px] uppercase tracking-wider rounded px-1.5 py-0.5 ${
          (etf as any).assetType === 'stock' ? 'tag-stock' : 'tag-etf'
        }`}>
          {(etf as any).assetType === 'stock' ? 'STOCK' : 'ETF'}
        </span>
      </div>

      {/* symbol + name */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-semibold text-[var(--text)] tracking-tight truncate">{etf.symbol}</span>
          {live && <span className="w-1.5 h-1.5 rounded-full bg-[#00C805] animate-pulse shrink-0" title="Live price" />}
        </div>
        <div className="text-[11px] text-[var(--text-3)] truncate">{etf.name}</div>
      </div>

      {/* price today + percent */}
      <div className="flex items-end justify-between">
        <div className="text-[20px] font-bold text-[var(--text)] tabular-nums leading-none">${fmtPrice(price)}</div>
        <div className={`flex items-center gap-0.5 text-[12px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${
          up ? 'text-[#00C805] bg-[#00C805]/10' : 'text-[#FF4D3D] bg-[#FF4D3D]/10'
        }`}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {up ? '+' : ''}{changePct.toFixed(2)}%
        </div>
      </div>
    </Link>
  );
});

/* ─── Full-width S&P 500 card with actions ─── */
export const SP500Card = memo(function SP500Card({
  etf, livePrice, liveChangePct,
}: { etf: Etf; livePrice?: number; liveChangePct?: number }) {
  const price = Number.isFinite(livePrice as number) ? (livePrice as number) : etf.seedPrice;
  const changePct = Number.isFinite(liveChangePct as number) ? (liveChangePct as number) : etf.seedChangePct;
  const up = changePct >= 0;
  const live = Number.isFinite(livePrice as number);
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/dashboard/invest/asset/${etf.symbol}`} prefetch={false} className="flex items-center gap-3 min-w-0 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3B948C]/20 to-[#C4A052]/10 border border-[var(--border)] flex items-center justify-center shrink-0">
            <span className="text-[13px] font-bold text-[var(--text)]">{etf.symbol.slice(0, 3)}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="text-[15px] font-semibold text-[var(--text)] group-hover:text-[var(--accent-2)] transition-colors">{etf.symbol}</div>
              {live && <span className="w-1.5 h-1.5 rounded-full bg-[#00C805] animate-pulse" title="Live price" />}
            </div>
            <div className="text-[11px] text-[var(--text-3)] truncate">{etf.name}</div>
            <div className="text-[10px] text-[var(--accent-3)] mt-0.5">Tracks the S&P 500 · {etf.expenseRatio}% expense</div>
          </div>
        </Link>
        <div className="text-right shrink-0">
          <div className="text-[16px] font-semibold text-[var(--text)] tabular-nums">${fmtPrice(price)}</div>
          <div className={`text-[12px] font-medium tabular-nums ${up ? 'text-[#00C805]' : 'text-[#FF4D3D]'}`}>
            {up ? '+' : ''}{changePct.toFixed(2)}% today
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Link
          href={`/dashboard/invest/asset/${etf.symbol}?action=buy`}
          prefetch={false}
          className="flex-1 h-9 rounded-xl bg-[#00C805] hover:bg-[#00A804] text-white text-[13px] font-semibold flex items-center justify-center transition-colors active:scale-[0.98]"
        >
          Buy
        </Link>
        <Link
          href={`/dashboard/invest/asset/${etf.symbol}?action=recurring`}
          prefetch={false}
          className="h-9 px-3 rounded-xl border border-[var(--border)] hover:bg-[var(--inset)] text-[var(--text-2)] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
        >
          <Repeat className="w-3.5 h-3.5" /> Recurring
        </Link>
        <button
          className="h-9 w-9 rounded-xl border border-[var(--border)] hover:bg-[var(--inset)] text-[var(--text-3)] hover:text-[var(--accent-3)] flex items-center justify-center transition-colors"
          aria-label="Add to watchlist"
        >
          <Star className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
