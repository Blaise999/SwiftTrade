'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Holding = { symbol: string; kind: 'crypto' | 'stock'; quantity: number };

/**
 * Robinhood-style portfolio curve. Builds a REAL series by pulling each
 * holding's price history and summing quantity x price at every point.
 */
export function PortfolioChart({
  holdings, cash = 0, range = '1D', height = 150,
}: { holdings: Holding[]; cash?: number; range?: string; height?: number }) {
  const [series, setSeries] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const pathRef = useRef<SVGPathElement | null>(null);

  const key = useMemo(
    () => holdings.map((h) => `${h.symbol}:${h.kind}:${h.quantity}`).join('|') + range,
    [holdings, range]
  );

  useEffect(() => {
    let alive = true;
    const top = holdings.filter((h) => h.quantity > 0).slice(0, 8);
    if (!top.length) { setSeries([]); setLoading(false); return; }
    setLoading(true);

    Promise.all(
      top.map((h) =>
        fetch(`/api/sparkline?symbol=${h.symbol}&kind=${h.kind}&range=${range}`, { cache: 'no-store' })
          .then((r) => r.json())
          .then((j) => ({ qty: h.quantity, points: Array.isArray(j?.points) ? j.points : [] }))
          .catch(() => ({ qty: h.quantity, points: [] as number[] }))
      )
    ).then((rows) => {
      if (!alive) return;
      const valid = rows.filter((r) => r.points.length > 1);
      if (!valid.length) { setSeries([]); setLoading(false); return; }
      const len = Math.min(...valid.map((r) => r.points.length));
      const out: number[] = [];
      for (let i = 0; i < len; i++) {
        let sum = cash;
        for (const r of valid) {
          // align series ends (most recent last)
          const p = r.points[r.points.length - len + i];
          sum += (p || 0) * r.qty;
        }
        out.push(sum);
      }
      setSeries(out);
      setLoading(false);
    });

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cash]);

  useEffect(() => {
    const el = pathRef.current;
    if (!el || !series.length) return;
    const len = el.getTotalLength();
    el.style.transition = 'none';
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    el.getBoundingClientRect();
    el.style.transition = 'stroke-dashoffset 1000ms cubic-bezier(0.22,1,0.36,1)';
    el.style.strokeDashoffset = '0';
  }, [series]);

  const W = 700, H = height;
  if (loading) return <div className="w-full rounded-xl bg-white/[0.03] animate-pulse" style={{ height: H }} />;
  if (series.length < 2) return <div style={{ height: H }} />;

  const min = Math.min(...series), max = Math.max(...series);
  const span = max - min || 1;
  const up = series[series.length - 1] >= series[0];
  const color = up ? '#00C805' : '#FF4D3D';
  const pad = 8;
  const xs = (i: number) => (i / (series.length - 1)) * W;
  const ys = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);

  let d = `M ${xs(0)} ${ys(series[0])}`;
  for (let i = 0; i < series.length - 1; i++) {
    const x0 = xs(i), y0 = ys(series[i]);
    const x1 = xs(i + 1), y1 = ys(series[i + 1]);
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  const gid = 'pf-grad';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill={`url(#${gid})`} />
      <path ref={pathRef} d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={xs(series.length - 1)} cy={ys(series[series.length - 1])} r={4} fill={color}>
        <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export default PortfolioChart;
