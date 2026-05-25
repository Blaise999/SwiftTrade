'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search, TrendingUp, TrendingDown,
  ChevronRight, Sparkles, Eye, EyeOff, LineChart,
} from 'lucide-react';
import { useStore } from '@/lib/supabase/store-supabase';
import {
  getSP500Etfs, getEtfsByCategory, getBeginnerEtfs, getMegaCapStocks,
  getTopMovers, getStocksByCategory, CATEGORY_LABELS, type AssetCategory,
} from '@/lib/asset-catalog';
import { EtfCard, SP500Card, Sparkline } from '@/components/investing/EtfCards';
import { n, fmtUSD, fmtPct } from '@/lib/calc';

export default function InvestHome() {
  const { user, refreshUser } = useStore();
  const [hide, setHide] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Live invest holdings for total-asset display
  const [invest, setInvest] = useState<{ totalValue: number; totalDayGain: number; totalDayGainPct: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    if (user?.id) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const r = await fetch(`/api/invest/positions?userId=${user.id}`, { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (j?.ok) {
          setInvest({
            totalValue: n(j.totalValue),
            totalDayGain: n(j.totalDayGain),
            totalDayGainPct: n(j.totalDayGainPct),
          });
        }
      } catch {}
    })();
  }, [user?.id]);

  const cashBalance = useMemo(
    () => n((user as any)?.balance_available) || n((user as any)?.balanceAvailable) || n((user as any)?.balance),
    [user]
  );
  const stockBalance = invest?.totalValue || 0;  // ← stocks only, not total assets
  const dayPnl = invest?.totalDayGain || 0;
  const dayPct = invest?.totalDayGainPct || 0;
  const up = dayPnl >= 0;

  // Held stocks list (with current 24h %)
  const [holdings, setHoldings] = useState<any[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const r = await fetch(`/api/invest/positions?userId=${user.id}`, { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (j?.ok && Array.isArray(j.positions)) setHoldings(j.positions);
      } catch {}
    })();
  }, [user?.id]);

  const sp500 = getSP500Etfs();
  const beginnerEtfs = getBeginnerEtfs();
  const megaCaps = getMegaCapStocks().slice(0, 10);
  const topMovers = getTopMovers(10);
  const greeting =
    new Date().getHours() < 12 ? 'Good morning' :
    new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const stockRows: AssetCategory[] = ['technology', 'semiconductor', 'consumer', 'healthcare', 'financial', 'fintech', 'crypto_stock', 'energy'];
  const etfRows: AssetCategory[] = ['sp500', 'nasdaq_100', 'total_market', 'dividend', 'sector', 'bond'];

  return (
    <div className="min-h-screen bg-[#080A0D] pb-28">
      <div className="max-w-2xl mx-auto pt-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-[13px] text-[#A1A1AA]">{greeting},{' '}
            <span className="text-white font-medium">{user?.firstName || 'Investor'}</span>
          </p>
          <Link href="/dashboard/invest/search" prefetch={false}
            className="w-9 h-9 rounded-full bg-[#101216] border border-white/[0.06] flex items-center justify-center hover:bg-[#14171D] transition-colors">
            <Search className="w-4 h-4 text-[#A1A1AA]" />
          </Link>
        </div>

        {/* ── STOCK BALANCE (just stocks, not total) ── */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] uppercase tracking-[0.2em] text-[#71717A]">Stock balance</span>
            <button onClick={() => setHide(!hide)} className="text-[#71717A] hover:text-[#A1A1AA]">
              {hide ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="mt-1 text-[40px] sm:text-[44px] leading-none font-bold text-white tracking-tight tabular-nums">
            {hide ? '••••••' : fmtUSD(stockBalance)}
          </div>
          {stockBalance > 0 ? (
            <div className={`mt-2 flex items-center gap-1.5 text-[14px] font-medium tabular-nums ${up ? 'text-[#16C784]' : 'text-[#FF4D4F]'}`}>
              {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {hide ? '••••' : <>{up ? '+' : '−'}{fmtUSD(Math.abs(dayPnl))}</>}
              <span className="text-[#71717A]">({fmtPct(dayPct)}) today</span>
            </div>
          ) : (
            <div className="mt-2 text-[13px] text-[#71717A]">
              No stock holdings yet — pick one below to start
            </div>
          )}
          <div className="mt-4 -mx-1">
            {mounted && <Sparkline seed={stockBalance || 1234} up={up} w={620} h={90} />}
          </div>
        </div>

        {/* ── Invest / Search quick actions (no deposit/withdraw here) ── */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Link href="/dashboard/invest/etfs" prefetch={false}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 hover:bg-[#3B82F6]/15 transition-all active:scale-[0.97]">
            <LineChart className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-[13px] text-white font-medium">Explore ETFs</span>
          </Link>
          <Link href="/dashboard/invest/search" prefetch={false}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#101216] border border-white/[0.06] hover:bg-[#14171D] transition-all active:scale-[0.97]">
            <Search className="w-4 h-4 text-[#A1A1AA]" />
            <span className="text-[13px] text-white font-medium">Search</span>
          </Link>
        </div>

        {/* ── YOUR HOLDINGS (each stock with 24h %) ── */}
        {holdings.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-semibold text-white">Your holdings</h2>
              <span className="text-[11px] text-[#71717A]">{holdings.length} position{holdings.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#101216] overflow-hidden divide-y divide-white/[0.05]">
              {holdings.map((p: any) => {
                const gain = (p.dayGain ?? p.pnl ?? 0) >= 0;
                return (
                  <Link
                    key={p.id}
                    href={`/dashboard/invest/asset/${p.symbol}`}
                    prefetch={false}
                    className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6]/20 to-[#8B5CF6]/10 border border-white/[0.06] flex items-center justify-center shrink-0">
                        <span className="text-[11.5px] font-bold text-white">{String(p.symbol).slice(0, 4)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-white truncate">{p.symbol}</div>
                        <div className="text-[11px] text-[#71717A] truncate">
                          {Number(p.quantity).toFixed(4)} @ ${Number(p.avgPrice).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[14px] font-semibold text-white tabular-nums">
                        ${Number(p.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className={`text-[12px] tabular-nums ${gain ? 'text-[#16C784]' : 'text-[#FF4D4F]'}`}>
                        {gain ? '+' : ''}{Number(p.dayGainPct ?? p.pnlPct ?? 0).toFixed(2)}% 24h
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Top movers (stocks + ETFs) ── */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-semibold text-white">Top movers</h2>
            <Link href="/dashboard/invest/search" prefetch={false} className="text-[12px] text-[#3B82F6] flex items-center gap-0.5">
              Search <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            {topMovers.map(a => <EtfCard key={a.symbol} etf={a as any} />)}
          </div>
        </section>

        {/* ── Mega-cap stocks ── */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-semibold text-white">Popular stocks</h2>
            <Link href="/dashboard/invest/etfs" prefetch={false} className="text-[12px] text-[#3B82F6] flex items-center gap-0.5">
              See all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            {megaCaps.map(a => <EtfCard key={a.symbol} etf={a as any} />)}
          </div>
        </section>

        {/* ── Invest in the S&P 500 ── */}
        <section className="mt-8">
          <div className="rounded-2xl border border-[#F5C542]/15 bg-gradient-to-br from-[#F5C542]/[0.06] to-transparent p-4 mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-[#F5C542]" />
              <h2 className="text-[16px] font-semibold text-white">Invest in the S&P 500</h2>
            </div>
            <p className="text-[12.5px] text-[#A1A1AA] leading-relaxed">
              The S&P 500 tracks around 500 of the largest publicly traded companies in the United
              States. You cannot buy the index directly, but you can invest through ETFs that track it.
            </p>
          </div>
          <div className="space-y-2.5">
            {sp500.map(etf => <SP500Card key={etf.symbol} etf={etf as any} />)}
          </div>
        </section>

        {/* ── Beginner-friendly ETFs ── */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-semibold text-white">Beginner-friendly</h2>
            <Link href="/dashboard/invest/etfs" prefetch={false} className="text-[12px] text-[#3B82F6] flex items-center gap-0.5">
              Explore all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            {beginnerEtfs.map(a => <EtfCard key={a.symbol} etf={a as any} />)}
          </div>
        </section>

        {/* ── Stock category rows ── */}
        {stockRows.map(cat => {
          const list = getStocksByCategory(cat);
          if (!list.length) return null;
          return (
            <section key={cat} className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[16px] font-semibold text-white">{CATEGORY_LABELS[cat]}</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                {list.map(a => <EtfCard key={a.symbol} etf={a as any} />)}
              </div>
            </section>
          );
        })}

        {/* ── ETF category rows ── */}
        {etfRows.map(cat => {
          const list = getEtfsByCategory(cat);
          if (!list.length) return null;
          return (
            <section key={cat} className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[16px] font-semibold text-white">{CATEGORY_LABELS[cat]}</h2>
                <Link href="/dashboard/invest/etfs" prefetch={false} className="text-[12px] text-[#3B82F6] flex items-center gap-0.5">
                  See all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                {list.map(a => <EtfCard key={a.symbol} etf={a as any} />)}
              </div>
            </section>
          );
        })}

        <p className="mt-10 text-[11px] text-[#52525B] leading-relaxed text-center px-4">
          Investing involves risk, including possible loss of principal. Past performance does not
          guarantee future results. Prices shown are seed values for demonstration.
        </p>
      </div>
    </div>
  );
}
