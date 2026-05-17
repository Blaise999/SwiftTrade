'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown,
  ChevronRight, Sparkles, Eye, EyeOff, LineChart, Wallet,
} from 'lucide-react';
import { useStore } from '@/lib/supabase/store-supabase';
import {
  ETFS, getSP500Etfs, getEtfsByCategory, getBeginnerEtfs,
  CATEGORY_LABELS, type EtfCategory,
} from '@/lib/etf-data';
import { EtfCard, SP500Card, Sparkline } from '@/components/investing/EtfCards';

const n = (v: any) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export default function InvestHome() {
  const { user, refreshUser } = useStore();
  const [hide, setHide] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (user?.id) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const balance = useMemo(
    () => n((user as any)?.balance_available) || n((user as any)?.balanceAvailable) || n((user as any)?.balance) || 0,
    [user]
  );
  const dayPnl = useMemo(() => n((user as any)?.pnl) || 0, [user]);
  const dayPct = balance > 0 ? (dayPnl / balance) * 100 : 0;
  const up = dayPnl >= 0;

  const sp500 = getSP500Etfs();
  const beginners = getBeginnerEtfs();
  const greeting =
    new Date().getHours() < 12 ? 'Good morning' :
    new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const rows: EtfCategory[] = ['sp500', 'nasdaq_100', 'total_market', 'dividend', 'sector', 'bond'];

  return (
    <div className="min-h-screen bg-[#080A0D] pb-28">
      <div className="max-w-2xl mx-auto px-4 pt-6">

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

        {/* ── Portfolio hero ── */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] uppercase tracking-[0.2em] text-[#71717A]">Portfolio value</span>
            <button onClick={() => setHide(!hide)} className="text-[#71717A] hover:text-[#A1A1AA]">
              {hide ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="mt-1 text-[44px] leading-none font-bold text-white tracking-tight tabular-nums">
            {hide ? '••••••' : `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className={`mt-2 flex items-center gap-1.5 text-[14px] font-medium tabular-nums ${up ? 'text-[#16C784]' : 'text-[#FF4D4F]'}`}>
            {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {hide ? '••••' : <>{up ? '+' : ''}${Math.abs(dayPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>}
            <span className="text-[#71717A]">({up ? '+' : ''}{dayPct.toFixed(2)}%) today</span>
          </div>
          <div className="mt-4 -mx-1">
            {mounted && <Sparkline seed={balance || 1234} up={up} w={620} h={90} />}
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div className="mt-5 grid grid-cols-4 gap-2.5">
          {[
            { l: 'Deposit', i: ArrowDownToLine, href: '/dashboard/wallet', tone: 'text-[#16C784]' },
            { l: 'Withdraw', i: ArrowUpFromLine, href: '/dashboard/wallet?tab=withdraw', tone: 'text-[#A1A1AA]' },
            { l: 'Invest', i: LineChart, href: '/dashboard/invest/etfs', tone: 'text-[#3B82F6]' },
            { l: 'Search', i: Search, href: '/dashboard/invest/search', tone: 'text-[#F5C542]' },
          ].map(a => (
            <Link key={a.l} href={a.href} prefetch={false}
              className="flex flex-col items-center gap-2 py-3.5 rounded-2xl bg-[#101216] border border-white/[0.06] hover:bg-[#14171D] transition-all active:scale-[0.97]">
              <a.i className={`w-5 h-5 ${a.tone}`} />
              <span className="text-[11px] text-[#A1A1AA] font-medium">{a.l}</span>
            </Link>
          ))}
        </div>

        {/* ── Invest in the S&P 500 ── */}
        <section className="mt-8">
          <div className="rounded-2xl border border-[#F5C542]/15 bg-gradient-to-br from-[#F5C542]/[0.06] to-transparent p-4 mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-[#F5C542]" />
              <h2 className="text-[16px] font-semibold text-white">Invest in the S&P 500</h2>
            </div>
            <p className="text-[12.5px] text-[#A1A1AA] leading-relaxed">
              The S&P 500 tracks around 500 of the largest publicly traded companies in the United States.
              You cannot buy the index directly, but you can invest through ETFs that track it.
            </p>
          </div>
          <div className="space-y-2.5">
            {sp500.map(etf => <SP500Card key={etf.symbol} etf={etf} />)}
          </div>
        </section>

        {/* ── Beginner-friendly ── */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-semibold text-white">Beginner-friendly</h2>
            <Link href="/dashboard/invest/etfs" prefetch={false} className="text-[12px] text-[#3B82F6] flex items-center gap-0.5">
              Explore all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            {beginners.map(etf => <EtfCard key={etf.symbol} etf={etf} />)}
          </div>
        </section>

        {/* ── Category rows ── */}
        {rows.map(cat => {
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
                {list.map(etf => <EtfCard key={etf.symbol} etf={etf} />)}
              </div>
            </section>
          );
        })}

        {/* Risk disclaimer */}
        <p className="mt-10 text-[11px] text-[#52525B] leading-relaxed text-center px-4">
          Investing involves risk, including possible loss of principal. Past performance does not
          guarantee future results. ETF data shown for information only — learn before investing.
        </p>
      </div>
    </div>
  );
}
