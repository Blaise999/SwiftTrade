'use client';

import { AssetLogo } from '@/components/AssetLogo';
import { freshUrl } from '@/lib/fetch-fresh';
import { trace } from '@/lib/trace';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search, TrendingUp, TrendingDown, ChevronRight, Sparkles,
  Eye, EyeOff, LineChart, X, ArrowDownLeft,
} from 'lucide-react';
import { useStore } from '@/lib/supabase/store-supabase';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import {
  getSP500Etfs, getEtfsByCategory, getBeginnerEtfs, getMegaCapStocks,
  getTopMovers, getStocksByCategory, searchAssets, CATEGORY_LABELS, type AssetCategory,
} from '@/lib/asset-catalog';
import { EtfCard, SP500Card, FullSparkline } from '@/components/investing/EtfCards';
import { useStockQuotes } from '@/hooks/useStockQuotes';
import { n, fmtUSD, fmtPct } from '@/lib/calc';

/* Staggered entrance — gives the page life without being noisy */
const section = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.45, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] as any },
  }),
};

export default function InvestHome() {
  const { user, refreshUser } = useStore();
  const [hide, setHide] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Inline search (replaces the old /invest/search route)
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Live invest holdings for total-asset display
  const [invest, setInvest] = useState<{ totalValue: number; totalCost: number; totalPnl: number; totalPnlPct: number; totalDayGain: number; totalDayGainPct: number } | null>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const [refetchTick, setRefetchTick] = useState(0);
  useRefetchOnFocus(() => setRefetchTick((t) => t + 1));

  useEffect(() => {
    setMounted(true);
    if (user?.id) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const r = await fetch(freshUrl(`/api/invest/positions?userId=${user.id}`), { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (j?.ok) {
          setInvest({
            totalValue: n(j.totalValue),
            totalCost: n(j.totalCost),
            totalPnl: n(j.totalPnl),
            totalPnlPct: n(j.totalPnlPct),
            totalDayGain: n(j.totalDayGain),
            totalDayGainPct: n(j.totalDayGainPct),
          });
          trace('invest-page', 'fetched /api/invest/positions', { count: j?.positions?.length ?? 'none' });
          if (Array.isArray(j.positions)) setHoldings(j.positions);
        }
      } catch {} finally { setReady(true); }
    })();
  }, [user?.id, refetchTick]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 60);
  }, [searchOpen]);

  const cashBalance = useMemo(
    () => n((user as any)?.balance_available) || n((user as any)?.balanceAvailable) || n((user as any)?.balance),
    [user]
  );
  // derive from the SAME holdings the rows render, so the card always tallies
  const stockBalance = useMemo(() => holdings.reduce((s, h: any) => s + n(h.value), 0), [holdings]);
  const totalCostAll = useMemo(() => holdings.reduce((s, h: any) => s + n(h.costBasis ?? (n(h.quantity) * n(h.avgPrice))), 0), [holdings]);
  const totalPnl = stockBalance - totalCostAll;
  const totalPct = totalCostAll > 0 ? (totalPnl / totalCostAll) * 100 : 0;
  const totalUp = totalPnl >= 0;
  const dayPnl = invest?.totalDayGain || 0;
  const dayPct = invest?.totalDayGainPct || 0;
  const up = dayPnl >= 0;

  const sp500 = getSP500Etfs();
  const beginnerEtfs = getBeginnerEtfs();
  const megaCaps = getMegaCapStocks().slice(0, 10);
  const topMovers = getTopMovers(10);

  const stockRows: AssetCategory[] = ['technology', 'semiconductor', 'consumer', 'healthcare', 'financial', 'fintech', 'crypto_stock', 'energy'];
  const etfRows: AssetCategory[] = ['sp500', 'nasdaq_100', 'total_market', 'dividend', 'sector', 'bond'];

  // ── Live quotes for the headline symbols (safe fallback to seed prices) ──
  const liveSymbols = useMemo(() => {
    const set = new Set<string>();
    [...topMovers, ...megaCaps, ...sp500, ...beginnerEtfs].forEach(a => set.add(a.symbol));
    holdings.forEach((h: any) => h?.symbol && set.add(String(h.symbol).toUpperCase()));
    return Array.from(set);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings.length]);
  const live = useStockQuotes(liveSymbols);
  const anyLive = Object.keys(live).length > 0;

  const greeting =
    new Date().getHours() < 12 ? 'Good morning' :
    new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const results = useMemo(() => (query.trim() ? searchAssets(query).slice(0, 24) : []), [query]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden pb-28">
      <div className="w-full max-w-2xl mx-auto px-3 sm:px-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between pt-5 mb-1">
          <p className="text-[13px] text-[var(--text-2)]">{greeting},{' '}
            <span className="text-[var(--text)] font-semibold">{user?.firstName || 'Investor'}</span>
          </p>
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search stocks and ETFs"
            className="w-9 h-9 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--inset)] transition-colors active:scale-95"
          >
            <Search className="w-4 h-4 text-[var(--text-2)]" />
          </button>
        </div>

        {/* ── HERO BALANCE CARD ── */}
        <motion.div
          variants={section} initial="hidden" animate="show" custom={0}
          className="relative mt-3 overflow-hidden rounded-3xl border border-white/[0.07] bg-[var(--inset)] p-5"
        >
          {/* ambient glow */}
          <div
            className={`pointer-events-none absolute -top-24 -right-10 w-72 h-72 rounded-full blur-[90px] opacity-40 ${up ? 'bg-[#00C805]/30' : 'bg-[#FF4D3D]/25'}`}
          />
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-3)]">Stock balance</span>
              <button onClick={() => setHide(!hide)} className="text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors">
                {hide ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              {anyLive && (
                <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium text-[#00C805]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C805] animate-pulse" /> LIVE
                </span>
              )}
            </div>

            <div className="mt-1.5 text-[clamp(34px,11vw,48px)] leading-none font-extrabold text-[var(--text)] tracking-tight tabular-nums">
              {hide ? '••••••' : !ready ? <span className="inline-block h-8 w-44 rounded-lg bg-[var(--inset)] animate-pulse align-middle" /> : fmtUSD(stockBalance)}
            </div>

            {!ready ? (
              <div className="mt-2 h-4 w-36 rounded bg-[var(--inset)] animate-pulse" />
            ) : stockBalance > 0 ? (
              <>
                <div className={`mt-2 flex items-center gap-1.5 text-[14px] font-semibold tabular-nums ${up ? 'text-[#00C805]' : 'text-[#FF4D3D]'}`}>
                  {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {hide ? '••••' : <>{up ? '+' : '−'}{fmtUSD(Math.abs(dayPnl))}</>}
                  <span className="text-[var(--text-3)] font-normal">({fmtPct(dayPct)}) today</span>
                </div>
                <div className={`mt-1 flex items-center gap-1.5 text-[12.5px] font-medium tabular-nums ${totalUp ? 'text-[#00C805]' : 'text-[#FF4D3D]'}`}>
                  {hide ? '••••' : <>{totalUp ? '▲ +' : '▼ −'}{fmtUSD(Math.abs(totalPnl))}</>}
                  <span className="text-[var(--text-3)] font-normal">({totalUp ? '+' : ''}{totalPct.toFixed(2)}%) all-time P&L</span>
                </div>
              </>
            ) : (
              <div className="mt-2 text-[13px] text-[var(--text-3)]">
                No stock holdings yet — pick one below to start
              </div>
            )}

            {/* responsive, full-width chart — never overflows the screen */}
            <div className="mt-4 -mx-1">
              {mounted && <FullSparkline seed={stockBalance || 1234} up={up} h={96} />}
            </div>
          </div>
        </motion.div>

        {/* ── Quick actions ── */}
        <motion.div
          variants={section} initial="hidden" animate="show" custom={1}
          className="mt-4 grid grid-cols-3 gap-2.5"
        >
          <Link href="/dashboard/deposit" prefetch={false}
            className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-[#00C805]/10 border border-[#00C805]/20 hover:bg-[#00C805]/15 transition-all active:scale-[0.97]">
            <ArrowDownLeft className="w-[18px] h-[18px] text-[#00C805]" />
            <span className="text-[12px] text-[var(--text)] font-medium">Add cash</span>
          </Link>
          <Link href="/dashboard/invest/etfs" prefetch={false}
            className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-[#3B948C]/10 border border-[#3B948C]/20 hover:bg-[#3B948C]/15 transition-all active:scale-[0.97]">
            <LineChart className="w-[18px] h-[18px] text-[var(--accent-2)]" />
            <span className="text-[12px] text-[var(--text)] font-medium">ETFs</span>
          </Link>
          <button onClick={() => setSearchOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--inset)] transition-all active:scale-[0.97]">
            <Search className="w-[18px] h-[18px] text-[var(--text-2)]" />
            <span className="text-[12px] text-[var(--text)] font-medium">Search</span>
          </button>
        </motion.div>

        {/* ── YOUR HOLDINGS ── */}
        {holdings.length > 0 && (
          <motion.section variants={section} initial="hidden" animate="show" custom={2} className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-bold text-[var(--text)] tracking-tight">Your holdings</h2>
              <span className="text-[11px] text-[var(--text-3)]">{holdings.length} position{holdings.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden divide-y divide-white/[0.05]">
              {holdings.map((p: any) => {
                const sym = String(p.symbol).toUpperCase();
                const lq = live[sym];
                const value = lq && Number(p.quantity) ? lq.price * Number(p.quantity) : Number(p.value);
                // total profit/loss vs cost basis (what you're up or down on this holding)
                const cost = Number(p.costBasis ?? (Number(p.quantity) * Number(p.avgPrice)));
                const pnl = value - cost;
                const pct = cost > 0 ? (pnl / cost) * 100 : 0;
                const gain = pnl >= 0;
                return (
                  <Link
                    key={p.id}
                    href={`/dashboard/invest/asset/${p.symbol}`}
                    prefetch={false}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-[var(--inset)] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AssetLogo symbol={sym} kind={p.assetType === 'stock' ? 'stock' : 'etf'} size={40} />
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-[var(--text)] truncate">{sym}</div>
                        <div className="text-[11px] text-[var(--text-3)] truncate">
                          {Number(p.quantity).toFixed(4)} @ ${Number(p.avgPrice).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[14px] font-semibold text-[var(--text)] tabular-nums">
                        ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className={`text-[12px] tabular-nums font-medium ${gain ? 'text-[#00C805]' : 'text-[#FF4D3D]'}`}>
                        {gain ? '+' : ''}${Math.abs(pnl).toFixed(2)} ({gain ? '+' : ''}{pct.toFixed(2)}%)
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ── Top movers ── */}
        <Rail
          custom={3}
          title="Top movers"
          right={<SeeAll onClick={() => setSearchOpen(true)} label="Search" />}
          items={topMovers}
          live={live}
        />

        {/* ── Popular stocks ── */}
        <Rail
          custom={4}
          title="Popular stocks"
          right={<SeeAllLink href="/dashboard/invest/etfs" label="See all" />}
          items={megaCaps}
          live={live}
        />

        {/* ── Invest in the S&P 500 ── */}
        <motion.section variants={section} initial="hidden" animate="show" custom={5} className="mt-8">
          <div className="rounded-2xl border border-[#C4A052]/15 bg-gradient-to-br from-[#C4A052]/[0.07] to-transparent p-4 mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-[var(--accent-3)]" />
              <h2 className="text-[16px] font-bold text-[var(--text)] tracking-tight">Invest in the S&P 500</h2>
            </div>
            <p className="text-[12.5px] text-[var(--text-2)] leading-relaxed">
              The S&P 500 tracks around 500 of the largest publicly traded companies in the United
              States. You can&apos;t buy the index directly, but you can invest through ETFs that track it.
            </p>
          </div>
          <div className="space-y-2.5">
            {sp500.map(etf => {
              const lq = live[etf.symbol];
              return <SP500Card key={etf.symbol} etf={etf as any} livePrice={lq?.price} liveChangePct={lq?.changePercent24h} />;
            })}
          </div>
        </motion.section>

        {/* ── Beginner-friendly ── */}
        <Rail
          custom={6}
          title="Beginner-friendly"
          right={<SeeAllLink href="/dashboard/invest/etfs" label="Explore all" />}
          items={beginnerEtfs}
          live={live}
        />

        {/* ── Stock category rows ── */}
        {stockRows.map((cat, i) => {
          const list = getStocksByCategory(cat);
          if (!list.length) return null;
          return <Rail key={cat} custom={7 + i} title={CATEGORY_LABELS[cat] || cat} items={list} live={live} />;
        })}

        {/* ── ETF category rows ── */}
        {etfRows.map((cat, i) => {
          const list = getEtfsByCategory(cat);
          if (!list.length) return null;
          return (
            <Rail
              key={cat}
              custom={15 + i}
              title={CATEGORY_LABELS[cat] || cat}
              right={<SeeAllLink href="/dashboard/invest/etfs" label="See all" />}
              items={list}
              live={live}
            />
          );
        })}

        <p className="mt-10 text-[11px] text-[var(--text-3)] leading-relaxed text-center px-4">
          Investing involves risk, including possible loss of principal. Past performance does not
          guarantee future results. Live prices shown where available; otherwise reference values.
        </p>
      </div>

      {/* ── INLINE SEARCH SHEET ── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--surface)]/95 backdrop-blur-md">
          <div className="w-full max-w-2xl mx-auto px-4 pt-5 flex flex-col h-full">
            <div className="flex items-center gap-2.5">
              <div className="flex-1 flex items-center gap-2.5 px-4 h-12 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                <Search className="w-4 h-4 text-[var(--text-3)] shrink-0" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search stocks & ETFs…"
                  className="flex-1 bg-transparent outline-none text-[15px] text-[var(--text)] placeholder:text-[var(--text-3)]"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-[var(--text-3)] hover:text-[var(--text)]">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => { setSearchOpen(false); setQuery(''); }}
                className="text-[14px] text-[var(--text-2)] hover:text-[var(--text)] px-1"
              >
                Cancel
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pb-10">
              {!query.trim() ? (
                <p className="text-[13px] text-[var(--text-3)] px-1">Start typing a ticker or company name.</p>
              ) : results.length === 0 ? (
                <p className="text-[13px] text-[var(--text-3)] px-1">No matches for “{query}”.</p>
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden divide-y divide-white/[0.05]">
                  {results.map((a) => {
                    const lq = live[a.symbol];
                    const pct = lq ? lq.changePercent24h : a.seedChangePct;
                    const price = lq ? lq.price : a.seedPrice;
                    const gain = pct >= 0;
                    return (
                      <Link
                        key={a.symbol}
                        href={`/dashboard/invest/asset/${a.symbol}`}
                        prefetch={false}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--inset)] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#3B948C]/20 to-[#C4A052]/10 border border-[var(--border)] flex items-center justify-center shrink-0">
                            <span className="text-[10.5px] font-bold text-[var(--text)]">{a.symbol.slice(0, 4)}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[14px] font-semibold text-[var(--text)] truncate">{a.symbol}</div>
                            <div className="text-[11px] text-[var(--text-3)] truncate max-w-[200px]">{a.name}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[13px] font-semibold text-[var(--text)] tabular-nums">${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          <div className={`text-[11.5px] tabular-nums ${gain ? 'text-[#00C805]' : 'text-[#FF4D3D]'}`}>
                            {gain ? '+' : ''}{pct.toFixed(2)}%
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Reusable horizontal rail ── */
function Rail({
  title, items, live, right, custom = 0,
}: {
  title: string;
  items: any[];
  live: Record<string, { price: number; changePercent24h: number }>;
  right?: React.ReactNode;
  custom?: number;
}) {
  return (
    <motion.section variants={section} initial="hidden" animate="show" custom={custom} className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-bold text-[var(--text)] tracking-tight">{title}</h2>
        {right}
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1 snap-x">
        {items.map((a) => {
          const lq = live[a.symbol];
          return (
            <div key={a.symbol} className="snap-start">
              <EtfCard etf={a as any} livePrice={lq?.price} liveChangePct={lq?.changePercent24h} />
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

function SeeAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} prefetch={false} className="text-[12px] text-[var(--accent-2)] hover:text-[#5FB3AA] flex items-center gap-0.5 transition-colors">
      {label} <ChevronRight className="w-3 h-3" />
    </Link>
  );
}

function SeeAll({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="text-[12px] text-[var(--accent-2)] hover:text-[#5FB3AA] flex items-center gap-0.5 transition-colors">
      {label} <ChevronRight className="w-3 h-3" />
    </button>
  );
}
