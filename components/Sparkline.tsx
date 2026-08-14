'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Robinhood-style glide chart. Fetches a real price series and animates a
 * smooth line with a soft area gradient; green when up over the range, red down.
 */
export function Sparkline({
  symbol, kind, range = '1D', height = 180, showAxis = false,
}: { symbol: string; kind: 'crypto' | 'stock'; range?: string; height?: number; showAxis?: boolean }) {
  const [points, setPoints] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const pathRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/sparkline?symbol=${symbol}&kind=${kind}&range=${range}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (alive) setPoints(Array.isArray(j?.points) ? j.points : []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [symbol, kind, range]);

  // animate the line draw
  useEffect(() => {
    const el = pathRef.current;
    if (!el || !points.length) return;
    const len = el.getTotalLength();
    el.style.transition = 'none';
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    // force reflow
    el.getBoundingClientRect();
    el.style.transition = 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)';
    el.style.strokeDashoffset = '0';
  }, [points]);

  const W = 600, H = height;
  if (loading) return <div className="w-full rounded-xl bg-[var(--card)] animate-pulse" style={{ height: H }} />;
  if (points.length < 2) return <div className="w-full flex items-center justify-center text-[12px] text-[var(--text-3)]" style={{ height: H }}>Chart unavailable</div>;

  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const up = points[points.length - 1] >= points[0];
  const color = up ? '#00C805' : '#FF4D3D';
  const pad = 6;
  const xs = (i: number) => (i / (points.length - 1)) * W;
  const ys = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);

  // smooth path (Catmull-Rom -> Bezier)
  let d = `M ${xs(0)} ${ys(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const x0 = xs(i), y0 = ys(points[i]);
    const x1 = xs(i + 1), y1 = ys(points[i + 1]);
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  const area = `${d} L ${W} ${H} L 0 ${H} Z`;
  const gid = `spark-${symbol}-${kind}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path ref={pathRef} d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* end dot */}
      <circle cx={xs(points.length - 1)} cy={ys(points[points.length - 1])} r={4} fill={color}>
        <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export default Sparkline;
