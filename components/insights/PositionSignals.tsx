'use client';

import { useEffect, useState } from 'react';
import { freshUrl } from '@/lib/fetch-fresh';
import { motion } from 'framer-motion';
import { Activity, ChevronDown, TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';
import { AssetLogo } from '@/components/AssetLogo';

const TONE: Record<string, string> = {
  good: '#00C805', warn: 'var(--gold)', bad: '#FF4D3D', info: '#4EA8DE',
};

export function PositionSignals({ userId }: { userId?: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(freshUrl(`/api/analytics/signals?userId=${userId}`), { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setRows(j?.positions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="mt-9 h-32 rounded-2xl bg-[var(--card)] animate-pulse" />;
  if (!rows.length) return null;

  return (
    <section className="mt-9">
      <div className="flex items-center gap-2 mb-1">
        <Activity className="w-4 h-4 text-[var(--accent-2)]" />
        <h2 className="text-[15px] font-bold text-[var(--text)]">Position readings</h2>
      </div>
      <p className="text-[12px] text-[var(--text-3)] mb-3">
        What price has actually done on each holding — trend, momentum, volatility and sizing,
        with the reasoning shown so you can weigh it yourself.
      </p>

      <div className="space-y-2.5">
        {rows.map((p: any, i: number) => {
          const isOpen = open === p.symbol;
          const good = p.signals.filter((s: any) => s.tone === 'good').length;
          const bad = p.signals.filter((s: any) => s.tone === 'bad' || s.tone === 'warn').length;
          const headline = good > bad ? 'good' : bad > good ? 'warn' : 'info';

          return (
            <motion.div key={p.symbol}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">

              <button onClick={() => setOpen(isOpen ? null : p.symbol)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--inset)] transition-colors">
                <AssetLogo symbol={p.symbol} kind={p.kind === 'crypto' ? 'crypto' : 'stock'} size={34} className="rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-[var(--text)]">{p.symbol}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                      style={{ color: TONE[headline], background: `color-mix(in srgb, ${TONE[headline]} 14%, transparent)` }}>
                      {p.weight.toFixed(0)}% of book
                    </span>
                  </div>
                  <p className="text-[11.5px] text-[var(--text-3)] mt-0.5 truncate">{p.summary}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-[var(--text-3)] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-white/[0.05] pt-3 space-y-2.5">
                  {p.signals.map((s: any) => {
                    const Icon = s.tone === 'good' ? TrendingUp
                      : s.tone === 'bad' ? TrendingDown
                      : s.tone === 'warn' ? AlertTriangle : Info;
                    return (
                      <div key={s.key} className="flex gap-3">
                        <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: TONE[s.tone] }} />
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-[12.5px] font-bold text-[var(--text)]">{s.label}</span>
                            <span className="text-[12px] font-semibold tabular-nums" style={{ color: TONE[s.tone] }}>
                              {s.reading}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-[var(--text-2)] leading-relaxed mt-0.5">{s.detail}</p>
                        </div>
                      </div>
                    );
                  })}

                  {p.horizon && (
                    <div className="rounded-lg bg-[var(--inset)] p-3 mt-1">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-1">On holding period</div>
                      <p className="text-[11.5px] text-[var(--text-2)] leading-relaxed">{p.horizon}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <p className="mt-3 text-[10.5px] text-[var(--text-3)] opacity-75 leading-relaxed">
        These are descriptions of past price behaviour, not forecasts. Technical readings say nothing
        about what happens next, and none of this accounts for your goals, tax position or risk
        tolerance. Not investment advice.
      </p>
    </section>
  );
}

export default PositionSignals;
