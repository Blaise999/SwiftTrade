'use client';

import { useEffect, useState } from 'react';
import { freshUrl } from '@/lib/fetch-fresh';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Target, Lightbulb, BarChart3 } from 'lucide-react';
import { AssetLogo } from '@/components/AssetLogo';

const pct = (n: any) => (n == null ? '—' : `${Number(n) >= 0 ? '+' : ''}${Number(n).toFixed(1)}%`);
const money = (n: any) => (n == null ? '—' : `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
const cap = (n: number) =>
  n >= 1e12 ? `$${(n / 1e12).toFixed(2)}T` : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : `$${(n / 1e6).toFixed(0)}M`;

function ratingTone(r?: string | null) {
  if (!r) return 'var(--text-3)';
  const c = r[0]?.toUpperCase();
  return c === 'A' ? '#00C805' : c === 'B' ? '#8FBF5A' : c === 'C' ? 'var(--gold)' : '#FF4D3D';
}

export function FmpAnalysis({ userId }: { userId?: string }) {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(freshUrl(`/api/analytics/fmp?userId=${userId}`), { cache: 'no-store' })
      .then((r) => r.json()).then(setD).catch(() => {}).finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="mt-8 h-40 rounded-2xl bg-[var(--card)] animate-pulse" />;

  if (d && d.ok === false && d.error) {
    return (
      <div className="mt-8 rounded-2xl border border-[var(--border)] p-5 text-[12.5px] text-[var(--text-3)]">
        Fundamental analysis needs <code className="text-[var(--text)]">FMP_API_KEY</code> in your environment.
      </div>
    );
  }

  const holdings = d?.holdings || [];
  const ideas = d?.ideas || [];
  const sectors = d?.sectors || [];

  return (
    <>
      {holdings.length > 0 && (
        <section className="mt-9">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-[var(--accent-2)]" />
            <h2 className="text-[15px] font-bold text-[var(--text)]">Fundamentals on what you own</h2>
          </div>
          <p className="text-[12px] text-[var(--text-3)] mb-3">
            Tap a holding for the full breakdown. The valuation gap compares price to a discounted-cash-flow estimate.
          </p>

          <div className="space-y-2.5">
            {holdings.map((h: any, i: number) => {
              const isOpen = open === h.symbol;
              const gap = h.dcfGapPct;
              const gapTone = gap == null ? 'var(--text-3)' : gap > 15 ? '#00C805' : gap < -15 ? '#FF4D3D' : 'var(--gold)';
              return (
                <motion.div key={h.symbol}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                  <button onClick={() => setOpen(isOpen ? null : h.symbol)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--inset)] transition-colors">
                    <AssetLogo symbol={h.symbol} kind="stock" size={34} className="rounded-full" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-[var(--text)]">{h.symbol}</span>
                        {h.rating && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ color: ratingTone(h.rating), background: `color-mix(in srgb, ${ratingTone(h.rating)} 14%, transparent)` }}>
                            {h.rating}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--text-3)] truncate">{h.sector || h.name}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[13.5px] font-bold tabular-nums text-[var(--text)]">{money(h.price)}</div>
                      {gap != null && (
                        <div className="text-[11px] font-semibold tabular-nums" style={{ color: gapTone }}>
                          {gap > 0 ? 'under' : 'over'} by {Math.abs(gap).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-white/[0.05] pt-3">
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          ['P/E', h.pe != null ? Number(h.pe).toFixed(1) : null],
                          ['P/B', h.pb != null ? Number(h.pb).toFixed(2) : null],
                          ['ROE', h.roe != null ? `${Number(h.roe).toFixed(1)}%` : null],
                          ['Net margin', h.netMargin != null ? `${Number(h.netMargin).toFixed(1)}%` : null],
                          ['Debt/Equity', h.debtToEquity != null ? Number(h.debtToEquity).toFixed(2) : null],
                          ['Current ratio', h.currentRatio != null ? Number(h.currentRatio).toFixed(2) : null],
                        ].map(([k, v]: any) => (
                          <div key={k} className="rounded-lg bg-[var(--inset)] p-2.5">
                            <div className="text-[9.5px] uppercase tracking-wider text-[var(--text-3)]">{k}</div>
                            <div className="text-[13px] font-semibold tabular-nums text-[var(--text)] mt-0.5">{v ?? '—'}</div>
                          </div>
                        ))}
                      </div>

                      {h.dcf != null && gap != null && (
                        <div className="rounded-lg bg-[var(--inset)] p-3 mb-2.5">
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="text-[var(--text-3)] inline-flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5" /> DCF fair value
                            </span>
                            <span className="font-bold tabular-nums text-[var(--text)]">{money(h.dcf)}</span>
                          </div>
                          <div className="mt-1.5 text-[11px] text-[var(--text-3)] leading-relaxed">
                            Trading {gap > 0 ? 'below' : 'above'} the model by {Math.abs(gap).toFixed(0)}%.
                            DCF is very sensitive to growth assumptions — one input, not a verdict.
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-3)]">
                        <span>Mkt cap {cap(Number(h.marketCap) || 0)}</span>
                        {h.fromHighPct != null && <span>{Math.abs(Number(h.fromHighPct)).toFixed(0)}% off 52w high</span>}
                        {h.yourPnlPct != null && (
                          <span style={{ color: Number(h.yourPnlPct) >= 0 ? '#00C805' : '#FF4D3D' }}>
                            Your P&amp;L {pct(h.yourPnlPct)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {sectors.length > 0 && (
        <section className="mt-9">
          <h2 className="text-[15px] font-bold text-[var(--text)] mb-3">Sectors today</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sectors.map((s: any) => {
              const v = parseFloat(String(s.changesPercentage).replace('%', '')) || 0;
              const up = v >= 0;
              const owned = (d?.ownedSectors || []).includes(s.sector);
              return (
                <div key={s.sector} className="rounded-xl border p-3"
                  style={{
                    borderColor: owned ? 'color-mix(in srgb, var(--accent-2) 40%, transparent)' : 'var(--border)',
                    background: `color-mix(in srgb, ${up ? '#00C805' : '#FF4D3D'} ${Math.min(14, Math.abs(v) * 6)}%, var(--card))`,
                  }}>
                  <div className="text-[11px] text-[var(--text-2)] truncate">{s.sector}</div>
                  <div className="text-[15px] font-bold tabular-nums mt-0.5" style={{ color: up ? '#00C805' : '#FF4D3D' }}>
                    {up ? '+' : ''}{v.toFixed(2)}%
                  </div>
                  {owned && <div className="text-[9.5px] text-[var(--accent-2)] mt-0.5">you own here</div>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {ideas.length > 0 && (
        <section className="mt-9">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-[var(--gold)]" />
            <h2 className="text-[15px] font-bold text-[var(--text)]">Names to look at next</h2>
          </div>
          <p className="text-[12px] text-[var(--text-3)] mb-3">
            Screened for size, liquidity and moderate beta, then ranked against what you already hold.
            Starting points for your own research — not recommendations.
          </p>
          <div className="space-y-2">
            {ideas.map((it: any, i: number) => (
              <motion.div key={it.symbol}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center gap-3">
                <AssetLogo symbol={it.symbol} kind="stock" size={32} className="rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-bold text-[var(--text)]">{it.symbol}</span>
                    <span className="text-[11px] text-[var(--text-3)] truncate">{it.name}</span>
                  </div>
                  <p className="text-[11.5px] text-[var(--text-2)] mt-0.5 leading-relaxed">{it.rationale}</p>
                </div>
                <Link href={`/dashboard/invest/asset/${it.symbol}`} prefetch={false}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--inset)] text-[11.5px] font-semibold text-[var(--text)] hover:bg-[var(--border)]">
                  View
                </Link>
              </motion.div>
            ))}
          </div>
          <p className="mt-3 text-[10.5px] text-[var(--text-3)] opacity-75 leading-relaxed">
            Screener output based on public fundamentals. Not investment advice — nothing here accounts for
            your goals, tax position or risk tolerance.
          </p>
        </section>
      )}
    </>
  );
}

export default FmpAnalysis;
