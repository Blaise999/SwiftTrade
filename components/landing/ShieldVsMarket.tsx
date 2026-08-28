'use client';

import { useEffect, useRef, useState } from 'react';
import { AmbientMotion } from './AmbientMotion';
import { motion, useInView } from 'framer-motion';
import { ShieldCheck, TrendingDown } from 'lucide-react';

/**
 * Shield mode, told against a falling market. Left: the market keeps dropping.
 * Right: the same position, value locked. Animates on scroll into view.
 */
export function ShieldVsMarket() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [t, setT] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setT(1); return; }
    let raf = 0; const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 2200);
      setT(p < 1 ? 1 - Math.pow(1 - p, 3) : 1);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  // synthetic but honest: illustrative curve, labelled as an illustration
  const W = 320, H = 120;
  const pts = 40;
  const marketPath = (() => {
    let d = '';
    for (let i = 0; i < pts; i++) {
      const x = (i / (pts - 1)) * W;
      const drop = Math.pow(i / (pts - 1), 1.5) * 62;
      const wobble = Math.sin(i * 0.9) * 4 + Math.sin(i * 0.37) * 3;
      const y = 24 + drop + wobble;
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  })();
  const shieldY = 28;
  const visible = Math.max(2, Math.floor(pts * t));

  return (
    <section ref={ref} className="relative overflow-hidden py-20 sm:py-28">
      <AmbientMotion variant="orbit" tone="green" opacity={0.30} src="/motion/shield-pulse.webp" />
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 items-center">
          {/* copy */}
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--t-sub)] mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-[color:var(--profit)]" />
              Shield mode
            </div>
            <h2 className="text-[30px] sm:text-[44px] font-bold tracking-tight text-[color:var(--t-hi)] leading-[1.04]">
              When the market moves against you,{' '}
              <span className="text-[color:var(--profit)]">Shield doesn&apos;t.</span>
            </h2>
            <p className="mt-4 text-[15px] text-[color:var(--t-sub)] leading-relaxed max-w-lg">
              Read a headline you don&apos;t like? Turn Shield on and your position&apos;s value
              locks at its current price. The market keeps moving — your position stops
              following it down. Switch it off whenever you want back in.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                ['Locks value instantly', 'One tap on any holding — stocks or crypto.'],
                ['You stay in control', 'Un-shield any time and rejoin the live market.'],
                ['Transparent premium', 'A flat 1% of the position value, shown before you confirm.'],
              ].map(([t1, t2]) => (
                <li key={t1} className="flex gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[color:var(--profit)] shrink-0" />
                  <span className="text-[13.5px] text-[color:var(--t-sub)]">
                    <span className="text-[color:var(--t-hi)] font-semibold">{t1}.</span> {t2}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* the split visual */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* unshielded */}
            <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[color:var(--loss)] mb-3">
                <TrendingDown className="w-3.5 h-3.5" /> Unshielded
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[120px]">
                <path d={marketPath} fill="none" stroke="var(--loss)" strokeWidth={2.5}
                  strokeLinecap="round" strokeDasharray={1200}
                  strokeDashoffset={1200 - 1200 * t} />
              </svg>
              <div className="mt-2 text-[20px] font-bold tabular-nums text-[color:var(--loss)]">
                −{(t * 8.4).toFixed(1)}%
              </div>
              <div className="text-[11px] text-[color:var(--t-sub)]">follows the market down</div>
            </div>

            {/* shielded */}
            <div className="relative rounded-2xl border p-4 overflow-hidden"
              style={{
                borderColor: 'color-mix(in srgb, var(--profit) 35%, transparent)',
                background: 'linear-gradient(160deg, color-mix(in srgb, var(--profit) 8%, transparent), transparent)',
              }}>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[color:var(--profit)] mb-3">
                <ShieldCheck className="w-3.5 h-3.5" /> Shielded
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[120px]">
                <line x1="0" y1={shieldY} x2={(visible / pts) * W} y2={shieldY}
                  stroke="var(--profit)" strokeWidth={2.5} strokeLinecap="round" />
                <circle cx={(visible / pts) * W} cy={shieldY} r={4} fill="var(--profit)" />
              </svg>
              <div className="mt-2 text-[20px] font-bold tabular-nums text-[color:var(--profit)]">0.0%</div>
              <div className="text-[11px] text-[color:var(--t-sub)]">value locked at activation</div>
            </div>

            <p className="sm:col-span-2 text-[10.5px] text-[color:var(--t-sub)] opacity-70 leading-relaxed">
              Illustration only — not a forecast or a guarantee of returns. Shield locks the
              recorded value of a position; it does not eliminate investment risk.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ShieldVsMarket;
