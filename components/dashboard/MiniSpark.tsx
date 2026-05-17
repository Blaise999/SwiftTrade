'use client';

type Props = { data: number[]; up?: boolean; width?: number; height?: number };

export default function MiniSpark({ data, up = true, width = 80, height = 24 }: Props) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  const color = up ? '#3aa978' : '#d8493e';
  const id = `ms-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${height} ${pts} ${width},${height}`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function genSpark(n = 32, base = 100, vol = 0.04, drift = 0.02): number[] {
  const arr: number[] = [];
  let p = base;
  for (let i = 0; i < n; i++) {
    p = p * (1 + (Math.sin(i * 0.6) * vol + drift / n));
    p += (Math.random() - 0.5) * base * 0.012;
    arr.push(p);
  }
  return arr;
}
