'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

/* ─────────────── RISK RADAR ─────────────── */
/**
 * Five-axis portfolio profile. Each axis is normalised 0-100 so the shape
 * itself is the signal — a spiky pentagon means an unbalanced book.
 */
export function RiskRadar({
  volatility, sharpe, concentration, diversification, drawdown,
}: {
  volatility: number; sharpe: number; concentration: number;
  diversification: number; drawdown: number;
}) {
  const axes = [
    { label: 'Stability', value: Math.max(0, Math.min(100, 100 - volatility)) },
    { label: 'Efficiency', value: Math.max(0, Math.min(100, (sharpe + 1) * 40)) },
    { label: 'Spread', value: Math.max(0, Math.min(100, 100 - concentration)) },
    { label: 'Independence', value: Math.max(0, Math.min(100, diversification)) },
    { label: 'Resilience', value: Math.max(0, Math.min(100, 100 - drawdown * 2)) },
  ];

  const S = 240, C = S / 2, R = 88;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    return [C + Math.cos(a) * r, C + Math.sin(a) * r];
  };
  const poly = axes.map((ax, i) => pt(i, (ax.value / 100) * R).join(',')).join(' ');
  const avg = axes.reduce((s, a) => s + a.value, 0) / axes.length;
  const tone = avg >= 65 ? '#00C805' : avg >= 40 ? 'var(--gold)' : '#FF4D3D';

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-1">Portfolio shape</div>
      <p className="text-[11.5px] text-[var(--text-3)] mb-2">Bigger and rounder is healthier. Spikes show imbalance.</p>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <svg viewBox={`0 0 ${S} ${S}`} className="w-[240px] shrink-0">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <polygon key={f}
              points={axes.map((_, i) => pt(i, R * f).join(',')).join(' ')}
              fill="none" stroke="var(--border)" strokeWidth="1" />
          ))}
          {axes.map((_, i) => {
            const [x, y] = pt(i, R);
            return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="var(--border)" strokeWidth="1" />;
          })}
          <motion.polygon
            points={poly} fill={tone} fillOpacity={0.18} stroke={tone} strokeWidth={2}
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: `${C}px ${C}px` }}
          />
          {axes.map((ax, i) => {
            const [x, y] = pt(i, (ax.value / 100) * R);
            return <circle key={i} cx={x} cy={y} r={3.5} fill={tone} />;
          })}
          {axes.map((ax, i) => {
            const [x, y] = pt(i, R + 20);
            return (
              <text key={ax.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                fontSize="9.5" fill="var(--text-3)" fontWeight="600">
                {ax.label}
              </text>
            );
          })}
        </svg>

        <div className="w-full space-y-1.5">
          {axes.map((ax) => (
            <div key={ax.label} className="flex items-center gap-2">
              <span className="text-[11.5px] text-[var(--text-2)] w-[86px]">{ax.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--inset)] overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: tone }}
                  initial={{ width: 0 }} animate={{ width: `${ax.value}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
              </div>
              <span className="text-[11px] tabular-nums text-[var(--text-3)] w-8 text-right">
                {ax.value.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── CORRELATION HEATMAP ─────────────── */
export function CorrelationMatrix({ pairs }: { pairs: any[] }) {
  const symbols = useMemo(() => {
    const s = new Set<string>();
    pairs.forEach((p) => { s.add(p.a); s.add(p.b); });
    return [...s].slice(0, 8);
  }, [pairs]);

  const lookup = useMemo(() => {
    const m: Record<string, number> = {};
    pairs.forEach((p) => { m[`${p.a}|${p.b}`] = p.corr; m[`${p.b}|${p.a}`] = p.corr; });
    return m;
  }, [pairs]);

  if (symbols.length < 2) return null;

  const cell = (v: number | undefined) => {
    if (v === undefined) return { bg: 'var(--inset)', fg: 'var(--text-3)' };
    const a = Math.min(1, Math.abs(v));
    const base = v >= 0 ? '#FF4D3D' : '#4EA8DE';
    return { bg: `color-mix(in srgb, ${base} ${a * 70}%, var(--card))`, fg: a > 0.55 ? '#fff' : 'var(--text-2)' };
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 overflow-x-auto">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-1">Correlation matrix</div>
      <p className="text-[11.5px] text-[var(--text-3)] mb-3">
        Red = moves together. Blue = moves opposite. Pale = independent.
      </p>
      <table className="border-separate border-spacing-1 text-[10.5px]">
        <thead>
          <tr>
            <th />
            {symbols.map((s) => (
              <th key={s} className="font-semibold text-[var(--text-3)] px-1 pb-1">{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {symbols.map((r) => (
            <tr key={r}>
              <td className="font-semibold text-[var(--text-3)] pr-2 text-right whitespace-nowrap">{r}</td>
              {symbols.map((c) => {
                const v = r === c ? 1 : lookup[`${r}|${c}`];
                const st = cell(v);
                return (
                  <td key={c}>
                    <div className="w-11 h-9 rounded-md grid place-items-center font-bold tabular-nums"
                      style={{ background: st.bg, color: st.fg }}>
                      {v === undefined ? '·' : v.toFixed(2)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────── EXPOSURE DONUT ─────────────── */
export function ExposureDonut({ crypto, stocks }: { crypto: number; stocks: number }) {
  const total = crypto + stocks;
  if (total <= 0) return null;
  const cPct = (crypto / total) * 100;
  const R = 54, CIRC = 2 * Math.PI * R;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="w-[130px] shrink-0 -rotate-90">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#5B9BFF" strokeWidth="16" />
        <motion.circle
          cx="70" cy="70" r={R} fill="none" stroke="#9B7CFF" strokeWidth="16"
          strokeDasharray={CIRC} strokeLinecap="round"
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: CIRC - (cPct / 100) * CIRC }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="space-y-2.5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)]">Market split</div>
        {[
          ['Crypto', crypto, '#9B7CFF'],
          ['Stocks', stocks, '#5B9BFF'],
        ].map(([label, val, tone]: any) => (
          <div key={label} className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: tone }} />
            <span className="text-[12.5px] text-[var(--text-2)] w-14">{label}</span>
            <span className="text-[13px] font-bold tabular-nums text-[var(--text)]">
              {((val / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
