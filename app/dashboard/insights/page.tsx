'use client';

import { useEffect, useState } from 'react';
import { freshUrl } from '@/lib/fetch-fresh';
import { PositionSignals } from '@/components/insights/PositionSignals';
import { RiskRadar, CorrelationMatrix, ExposureDonut } from '@/components/insights/Visuals';
import { FmpAnalysis } from '@/components/insights/FmpAnalysis';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, Layers, ChevronLeft } from 'lucide-react';
import { useStore } from '@/lib/supabase/store-supabase';
import { AssetLogo } from '@/components/AssetLogo';

const usd = (n: number) =>
  `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** correlation -> colour (red = moves together, blue = independent) */
function corrColor(c: number) {
  if (c >= 0.7) return '#FF4D3D';
  if (c >= 0.4) return '#E08B4A';
  if (c >= 0.15) return 'var(--gold)';
  if (c >= -0.15) return '#4EA8DE';
  return '#7C5CFC';
}

export default function InsightsPage() {
  const { user } = useStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = (user as any)?.id;
    if (!uid) return;
    fetch(freshUrl(`/api/analytics?userId=${uid}`), { cache: 'no-store' })
      .then((r) => r.json()).then(setData).catch(() => {})
      .finally(() => setLoading(false));
  }, [(user as any)?.id]);

  const holdings = data?.holdings || [];
  const pairs = data?.correlations || [];
  const insights = data?.insights || [];
  const total = Number(data?.totalValue) || 0;

  return (
    <div className="min-h-screen w-full overflow-x-hidden pb-28">
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 pt-5">
        <Link href="/dashboard/portfolio" prefetch={false}
          className="inline-flex items-center gap-1 text-[13px] text-[var(--text-3)] hover:text-[var(--text)] mb-4">
          <ChevronLeft className="w-4 h-4" /> Portfolio
        </Link>

        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--text-3)] mb-2">
          <Layers className="w-3.5 h-3.5" /> Cross-market analysis
        </div>
        <h1 className="text-[26px] sm:text-[32px] font-extrabold text-[var(--text)] tracking-tight">
          What your portfolio is really doing
        </h1>
        <p className="mt-2 text-[13px] text-[var(--text-2)] max-w-lg leading-relaxed">
          Stocks and crypto in one place means we can show you something a single-market
          broker can&apos;t — whether your positions are actually independent bets.
        </p>

        {loading ? (
          <div className="mt-8 space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-[var(--card)] animate-pulse" />)}
          </div>
        ) : holdings.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-[var(--border)] p-10 text-center">
            <p className="text-[14px] text-[var(--text-2)]">No holdings to analyse yet.</p>
            <Link href="/dashboard/invest" prefetch={false}
              className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-[#00C805] text-black text-[13px] font-bold">
              Start investing
            </Link>
          </div>
        ) : (
          <>
            {/* insights */}
            <div className="mt-7 space-y-2.5">
              {insights.map((it: any, i: number) => {
                const Icon = it.level === 'warn' ? AlertTriangle : it.level === 'good' ? CheckCircle2 : Info;
                const tone = it.level === 'warn' ? '#FF4D3D' : it.level === 'good' ? '#00C805' : '#4EA8DE';
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                    className="rounded-2xl border p-4 flex gap-3"
                    style={{ borderColor: `color-mix(in srgb, ${tone} 30%, transparent)`, background: `color-mix(in srgb, ${tone} 6%, var(--card))` }}>
                    <Icon className="w-[18px] h-[18px] shrink-0 mt-0.5" style={{ color: tone }} />
                    <div>
                      <div className="text-[14px] font-bold text-[var(--text)]">{it.title}</div>
                      <p className="mt-1 text-[12.5px] text-[var(--text-2)] leading-relaxed">{it.body}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* shape + split */}
            {data?.risk && data.risk.volatility > 0 && (
              <section className="mt-8 grid gap-3 lg:grid-cols-2">
                <RiskRadar
                  volatility={data.risk.volatility}
                  sharpe={data.risk.sharpe}
                  concentration={holdings[0]?.weight || 0}
                  diversification={
                    pairs.length
                      ? 100 - (pairs.reduce((s: number, p: any) => s + Math.abs(p.corr), 0) / pairs.length) * 100
                      : 50
                  }
                  drawdown={data.risk.maxDrawdown}
                />
                <div className="space-y-3">
                  {data?.exposure && (
                    <ExposureDonut crypto={data.exposure.crypto} stocks={data.exposure.stocks} />
                  )}
                </div>
              </section>
            )}

            {/* risk metrics — the Wall Street block */}
            {data?.risk && data.risk.volatility > 0 && (
              <section className="mt-8">
                <h2 className="text-[15px] font-bold text-[var(--text)] mb-1">Risk profile</h2>
                <p className="text-[12px] text-[var(--text-3)] mb-3">Measured over the last 30 days of real price action.</p>
                <div className="grid grid-cols-3 gap-2.5 mb-3">
                  {[
                    ['Volatility', `${data.risk.volatility}%`, 'annualised'],
                    ['Return/risk', data.risk.sharpe.toFixed(2), 'Sharpe-style'],
                    ['Max drawdown', `−${data.risk.maxDrawdown}%`, 'peak to trough'],
                  ].map(([k, v, sub]: any) => (
                    <div key={k} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-3)]">{k}</div>
                      <div className="mt-1.5 text-[20px] font-bold tabular-nums text-[var(--text)]">{v}</div>
                      <div className="text-[10.5px] text-[var(--text-3)]">{sub}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                  <div className="grid grid-cols-4 gap-2 px-4 py-2.5 text-[10px] uppercase tracking-[0.12em] text-[var(--text-3)] border-b border-[var(--border)]">
                    <span>Asset</span><span className="text-right">Vol</span>
                    <span className="text-right">Beta</span><span className="text-right">Max DD</span>
                  </div>
                  {data.risk.perAsset.map((a: any) => (
                    <div key={a.symbol} className="grid grid-cols-4 gap-2 px-4 py-2.5 text-[12.5px] tabular-nums border-b border-white/[0.04] last:border-0">
                      <span className="font-semibold text-[var(--text)]">{a.symbol}</span>
                      <span className="text-right text-[var(--text-2)]">{a.volatility}%</span>
                      <span className="text-right text-[var(--text-2)]">{a.beta ?? '—'}</span>
                      <span className="text-right text-[#FF4D3D]">−{a.maxDrawdown}%</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* analyst consensus */}
            {Array.isArray(data?.analysts) && data.analysts.length > 0 && (
              <section className="mt-8">
                <h2 className="text-[15px] font-bold text-[var(--text)] mb-1">Street view on your stocks</h2>
                <p className="text-[12px] text-[var(--text-3)] mb-3">
                  Analyst consensus and 12-month price targets. Opinions, not forecasts.
                </p>
                <div className="space-y-2.5">
                  {data.analysts.map((a: any) => {
                    const held = holdings.find((h: any) => h.symbol === a.symbol);
                    const upside = held?.price && a.targetMean ? ((a.targetMean - held.price) / held.price) * 100 : null;
                    const tone = a.consensus === 'Buy' ? '#00C805' : a.consensus === 'Sell' ? '#FF4D3D' : 'var(--gold)';
                    const tot = Math.max(1, a.total);
                    return (
                      <div key={a.symbol} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <AssetLogo symbol={a.symbol} kind="stock" size={26} className="rounded-full" />
                            <span className="text-[14px] font-bold text-[var(--text)]">{a.symbol}</span>
                          </div>
                          {a.consensus && (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                              style={{ color: tone, background: `color-mix(in srgb, ${tone} 14%, transparent)` }}>
                              {a.consensus}
                            </span>
                          )}
                        </div>

                        {a.total > 0 && (
                          <div className="mt-3">
                            <div className="flex h-1.5 rounded-full overflow-hidden bg-[var(--inset)]">
                              <div style={{ width: `${(a.buy / tot) * 100}%`, background: '#00C805' }} />
                              <div style={{ width: `${(a.hold / tot) * 100}%`, background: 'var(--gold)' }} />
                              <div style={{ width: `${(a.sell / tot) * 100}%`, background: '#FF4D3D' }} />
                            </div>
                            <div className="mt-1.5 flex gap-3 text-[10.5px] text-[var(--text-3)]">
                              <span>{a.buy} buy</span><span>{a.hold} hold</span><span>{a.sell} sell</span>
                            </div>
                          </div>
                        )}

                        {a.targetMean && (
                          <div className="mt-3 flex items-center justify-between text-[12px]">
                            <span className="text-[var(--text-3)]">
                              12m target ${a.targetMean.toFixed(2)}
                              {a.targetLow && a.targetHigh ? ` (${a.targetLow.toFixed(0)}–${a.targetHigh.toFixed(0)})` : ''}
                            </span>
                            {upside != null && (
                              <span className="font-bold tabular-nums" style={{ color: upside >= 0 ? '#00C805' : '#FF4D3D' }}>
                                {upside >= 0 ? '+' : ''}{upside.toFixed(1)}% vs now
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* concentration */}
            <section className="mt-8">
              <h2 className="text-[15px] font-bold text-[var(--text)] mb-3">Concentration</h2>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--inset)] mb-4">
                  {holdings.slice(0, 8).map((h: any, i: number) => (
                    <div key={h.symbol}
                      style={{
                        width: `${h.weight}%`,
                        background: `hsl(${(i * 47) % 360} 65% 55%)`,
                      }}
                      title={`${h.symbol} ${h.weight.toFixed(1)}%`} />
                  ))}
                </div>
                <div className="space-y-2">
                  {holdings.slice(0, 8).map((h: any, i: number) => (
                    <div key={h.symbol} className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `hsl(${(i * 47) % 360} 65% 55%)` }} />
                      <AssetLogo symbol={h.symbol} kind={h.kind === 'crypto' ? 'crypto' : 'stock'} size={22} className="rounded-full" />
                      <span className="text-[13px] font-semibold text-[var(--text)] w-16">{h.symbol}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--inset)] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${h.weight}%`, background: `hsl(${(i * 47) % 360} 65% 55%)` }} />
                      </div>
                      <span className="text-[12px] tabular-nums text-[var(--text-2)] w-12 text-right">{h.weight.toFixed(1)}%</span>
                      <span className="text-[12px] tabular-nums text-[var(--text-3)] w-20 text-right hidden sm:block">{usd(h.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* correlation */}
            {pairs.length > 0 && (
              <section className="mt-8">
                <h2 className="text-[15px] font-bold text-[var(--text)] mb-1">Do your positions move together?</h2>
                <p className="text-[12px] text-[var(--text-3)] mb-3">
                  30-day correlation. 1.0 means they move in lockstep; 0 means independent.
                </p>
                <div className="mb-3">
                  <CorrelationMatrix pairs={pairs} />
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden divide-y divide-white/[0.05]">
                  {pairs.map((p: any) => (
                    <div key={`${p.a}-${p.b}`} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-[13px] font-semibold text-[var(--text)]">{p.a}</span>
                      <span className="text-[var(--text-3)] text-[11px]">vs</span>
                      <span className="text-[13px] font-semibold text-[var(--text)]">{p.b}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--inset)] overflow-hidden mx-2">
                        <div className="h-full rounded-full"
                          style={{ width: `${Math.abs(p.corr) * 100}%`, background: corrColor(p.corr) }} />
                      </div>
                      <span className="text-[12.5px] font-bold tabular-nums w-11 text-right" style={{ color: corrColor(p.corr) }}>
                        {p.corr.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <PositionSignals userId={(user as any)?.id} />

            <FmpAnalysis userId={(user as any)?.id} />

            <p className="mt-6 text-[11px] text-[var(--text-3)] leading-relaxed opacity-80">
              Correlation is backward-looking and can change quickly, especially in stressed markets.
              This is portfolio information, not investment advice or a recommendation to buy or sell.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
