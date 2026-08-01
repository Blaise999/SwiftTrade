'use client';

import { useMemo } from 'react';
import { Shield } from 'lucide-react';
import { useNetWorth } from './useNetWorth';

/**
 * ShieldRiskMeter — the Shield Mode centerpiece.
 *
 * This is a REAL, honest heuristic computed from the user's live positions and
 * live prices via the ledger spine. It is a *risk indicator*, not a claim that
 * anything is being hedged. Three inputs, transparently weighted:
 *   - concentration: how much sits in your single biggest holding
 *   - crypto exposure: crypto value ÷ total net worth
 *   - drawdown: current unrealized loss vs cost basis
 *
 * Green (0–30) / Yellow (30–60) / Red (60–100). The suggested action is a
 * suggestion — nothing auto-executes.
 */

const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

function zoneOf(score: number) {
  if (score < 30) return { key: 'green', label: 'Low', color: '#22c55e', msg: 'Portfolio stable. No action needed.' };
  if (score < 60) return { key: 'yellow', label: 'Moderate', color: '#eab308', msg: 'Elevated exposure. Consider trimming your largest position.' };
  return { key: 'red', label: 'High', color: '#ef4444', msg: 'High concentration or volatility. Consider hedging or reducing risk.' };
}

export function ShieldRiskMeter({ userId }: { userId: string | null }) {
  const { data } = useNetWorth(userId);

  const { score, zone, biggest } = useMemo(() => {
    const positions = data?.positions ?? [];
    const total = data?.totalNetWorthUsd ?? 0;
    const invested = data?.positionsValueUsd ?? 0;

    if (!positions.length || invested <= 0) {
      return { score: 0, zone: zoneOf(0), biggest: null as null | { symbol: string; weight: number } };
    }

    const sorted = [...positions].sort((a, b) => b.valueUsd - a.valueUsd);
    const top = sorted[0];
    const concentration = clamp(top.valueUsd / invested); // 0..1 of invested
    const cryptoValue = positions.filter((p) => p.assetClass === 'crypto').reduce((s, p) => s + p.valueUsd, 0);
    const cryptoWeight = total > 0 ? clamp(cryptoValue / total) : 0;

    const cost = positions.reduce((s, p) => s + p.costBasisUsd, 0);
    const pnlPct = cost > 0 ? ((invested - cost) / cost) * 100 : 0;
    const drawdown = clamp(-pnlPct / 20); // −20% loss => full drawdown score

    const s = 100 * (0.4 * concentration + 0.35 * cryptoWeight + 0.25 * drawdown);
    return {
      score: Math.round(s),
      zone: zoneOf(s),
      biggest: { symbol: top.symbol, weight: Math.round(concentration * 100) },
    };
  }, [data]);

  // Gauge geometry: semicircle, needle from -90° (left) to +90° (right)
  const angle = -90 + (score / 100) * 180;
  const cx = 120, cy = 120, r = 90;
  const needle = {
    x: cx + r * 0.82 * Math.cos((angle - 90) * (Math.PI / 180)),
    y: cy + r * 0.82 * Math.sin((angle - 90) * (Math.PI / 180)),
  };
  const arc = (from: number, to: number) => {
    const a0 = (from - 90) * (Math.PI / 180);
    const a1 = (to - 90) * (Math.PI / 180);
    return `M ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`;
  };

  return (
    <div className="rounded-2xl border border-[color:var(--line,#26262b)] bg-[color:var(--wash-strong,#141417)] p-5">
      <div className="mb-1 flex items-center gap-2">
        <Shield size={16} style={{ color: zone.color }} />
        <span className="text-sm font-medium text-neutral-100">Shield Risk Meter</span>
        <span className="ml-auto text-xs text-neutral-500">indicative</span>
      </div>

      <svg viewBox="0 0 240 150" className="mx-auto w-full max-w-[280px]">
        {/* zone arcs */}
        <path d={arc(-90, -18)} fill="none" stroke="#22c55e" strokeWidth={14} strokeLinecap="round" opacity={0.35} />
        <path d={arc(-18, 36)} fill="none" stroke="#eab308" strokeWidth={14} strokeLinecap="round" opacity={0.35} />
        <path d={arc(36, 90)} fill="none" stroke="#ef4444" strokeWidth={14} strokeLinecap="round" opacity={0.35} />
        {/* needle */}
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={zone.color} strokeWidth={4} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={6} fill={zone.color} />
        {/* score */}
        <text x={cx} y={cy - 22} textAnchor="middle" fontSize="30" fontWeight="700" fill="#fafafa">
          {score}
        </text>
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="12" fill={zone.color}>
          {zone.label} risk
        </text>
      </svg>

      <p className="mt-2 text-center text-sm text-neutral-300">{zone.msg}</p>
      {biggest && (
        <p className="mt-1 text-center text-xs text-neutral-500">
          Largest exposure: {biggest.symbol} ({biggest.weight}% of holdings)
        </p>
      )}
    </div>
  );
}

export default ShieldRiskMeter;
