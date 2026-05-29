// app/dashboard/page.tsx  (or wherever your DashboardOverview lives)
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Wallet,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Globe,
  Shield,
  CheckCircle,
  ChevronRight,
  BarChart3,
  History,
  Settings,
  CreditCard,
  Send,
  Bitcoin,
  DollarSign,
} from 'lucide-react';

import { useStore } from '@/lib/supabase/store-supabase';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAccount } from 'wagmi';
import { PortfolioCommandCard } from '@/components/dashboard/PortfolioCommandCard';
import { useSpotTradingStore } from '@/lib/spot-trading-store';

// ----- helpers
const n = (v: any) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

function CardLink({
  href,
  children,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`block select-none rounded-xl border border-white/10 bg-white/5 transition-all
        hover:border-white/20 hover:bg-white/[0.07]
        active:scale-[0.99] active:bg-white/[0.09]
        focus:outline-none focus:ring-2 focus:ring-gold/30 ${className}`}
    >
      {children}
    </Link>
  );
}

export default function DashboardOverview() {
  const { user, refreshUser } = useStore();
  const bots: any[] = []; // bots feature removed
  const fetchBots = (_id: string) => {};

  const [hideBalance, setHideBalance] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const { address: liveAddress, isConnected: liveConnected } = useAccount();

  const loadRecentActivity = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured()) return;

    try {
      const [{ data: trades }, { data: deposits }, { data: bonuses }, { data: withdrawals }, { data: referrals }] =
        await Promise.all([
          supabase.from('trades').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('deposits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
          supabase.from('transactions').select('*').eq('user_id', user.id).in('type', ['bonus', 'deposit']).order('created_at', { ascending: false }).limit(3),
          supabase.from('withdrawals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
          supabase.from('referrals').select('*').eq('referrer_id', user.id).order('created_at', { ascending: false }).limit(3),
        ]);

      const items: any[] = [];

      (trades || []).forEach((t: any) => {
        items.push({
          id: `trade-${t.id}`,
          kind: 'trade',
          label: t.symbol || t.pair || 'Trade',
          sublabel: `${t.direction || t.type || 'Trade'} • ${t.market_type || t.asset_type || ''}`,
          amount: Number(t.amount ?? 0),
          pnl: Number(t.profit_loss ?? t.pnl ?? 0),
          status: t.status,
          created_at: t.created_at || t.opened_at,
        });
      });

      (deposits || []).forEach((d: any) => {
        items.push({
          id: `dep-${d.id}`,
          kind: 'deposit',
          label: 'Deposit',
          sublabel: `${d.network || d.currency || 'Funds'} • ${d.status}`,
          amount: Number(d.amount ?? 0),
          pnl: Number(d.amount ?? 0),
          status: d.status,
          created_at: d.created_at,
        });
      });

      (bonuses || []).forEach((b: any) => {
        items.push({
          id: `tx-${b.id}`,
          kind: 'bonus',
          label: b.type === 'deposit' ? 'Deposit Credit' : 'Bonus',
          sublabel: b.description || b.reference_type || 'Credit',
          amount: Math.abs(Number(b.amount ?? 0)),
          pnl: Number(b.amount ?? 0),
          status: 'completed',
          created_at: b.created_at,
        });
      });

      (withdrawals || []).forEach((w: any) => {
        items.push({
          id: `wd-${w.id}`,
          kind: 'withdrawal',
          label: 'Withdrawal',
          sublabel: `${w.method || w.network || 'Funds'} • ${w.status}`,
          amount: Number(w.amount ?? 0),
          pnl: -Number(w.amount ?? 0),
          status: w.status,
          created_at: w.created_at,
        });
      });

      (referrals || []).forEach((r: any) => {
        items.push({
          id: `ref-${r.id}`,
          kind: 'referral',
          label: 'Referral',
          sublabel: r.reward_paid ? `Earned $${Number(r.reward_amount || 0).toFixed(2)}` : 'New signup',
          amount: Number(r.reward_amount ?? 0),
          pnl: r.reward_paid ? Number(r.reward_amount ?? 0) : 0,
          status: r.reward_paid ? 'completed' : 'pending',
          created_at: r.created_at,
        });
      });

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentActivity(items.slice(0, 8));
    } catch {
      // console-only
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchBots(user.id);
    refreshUser();
    loadRecentActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ✅ SINGLE SOURCE OF TRUTH FOR DISPLAY:
  const cashBalance =
    n((user as any)?.balance_available) ||
    n((user as any)?.balanceAvailable) ||
    n((user as any)?.balance) ||
    0;

  const activeBots = bots.filter((b) => b.status === 'running').length;
  const totalBotPnl = bots.reduce((s, b) => s + (b.total_pnl ?? 0), 0);

  const kycRaw = String((user as any)?.kycStatus ?? (user as any)?.kyc_status ?? 'none').toLowerCase();
  const kycStatus = kycRaw === 'approved' ? 'verified' : kycRaw;

  const walletConnected = liveConnected || !!user?.walletAddress;
  const walletAddress = liveAddress || user?.walletAddress;

  // ─── Stock + crypto breakdown (live values + day P&L) ───────────────
  const [invest, setInvest] = useState({ value: 0, dayPnl: 0, dayPct: 0 });

  // Crypto value comes from the spot-trading Zustand store (same source the
  // crypto trade page uses, so dashboard numbers match exactly).
  const spotPositions = useSpotTradingStore((s) => s.positions);
  const spotHydrated = useSpotTradingStore((s) => s._hydrated);
  const loadSpotFromSupabase = useSpotTradingStore((s) => s.loadFromSupabase);

  useEffect(() => {
    if (!user?.id || spotHydrated) return;
    loadSpotFromSupabase(user.id).catch(() => {/* silent */});
  }, [user?.id, spotHydrated, loadSpotFromSupabase]);

  const crypto = useMemo(() => {
    let value = 0, pnl = 0, costBasis = 0;
    for (const p of spotPositions || []) {
      const v = Number((p as any).displayValue ?? (p as any).marketValue ?? 0);
      const pl = Number((p as any).displayPnL ?? (p as any).unrealizedPnL ?? 0);
      const qty = Number((p as any).quantity ?? 0);
      const avg = Number((p as any).averageBuyPrice ?? (p as any).averagePrice ?? 0);
      value += v;
      pnl += pl;
      costBasis += qty * avg;
    }
    const pct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    return { value, dayPnl: pnl, dayPct: pct };
  }, [spotPositions]);

  const investValue = invest.value;
  const cryptoValue = crypto.value;

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const r = await fetch(`/api/invest/positions?userId=${user.id}`, { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (j?.ok) {
          setInvest({
            value: Number(j.totalValue) || 0,
            dayPnl: Number(j.totalDayGain) || 0,
            dayPct: Number(j.totalDayGainPct) || 0,
          });
        }
      } catch {/* silent */}
    })();
  }, [user?.id]);

  const formatBal = (val: number) =>
    hideBalance
      ? '••••••'
      : `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatCash = (val: number) =>
    `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;


  return (
    <div className="space-y-6 pb-12">
      {/* ─── HEADER (animated, on-brand) ─── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-[#0D1324] via-[#0B1020] to-[#080A15] px-5 py-5 sm:px-7 sm:py-6"
      >
        {/* Animated gradient glow */}
        <div
          className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, #22D3EE, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-[320px] h-[320px] rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, #F5C542, transparent 70%)' }}
        />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16C784] animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.22em] text-[#94A3B8] font-medium">
                Markets open · Hong Kong
              </span>
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-white leading-tight">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
              <span className="bg-gradient-to-r from-[#00E88F] via-[#22D3EE] to-[#5B7CFF] bg-clip-text text-transparent">
                {user?.firstName || 'Trader'}
              </span>
            </h1>
            <p className="text-[12.5px] text-[#94A3B8] mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Link
            href="/dashboard/bridge"
            className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#F5C542]/[0.10] border border-[#F5C542]/30 hover:bg-[#F5C542]/[0.18] text-[#F5C542] text-[13px] font-semibold transition-all group"
          >
            <Globe className="w-3.5 h-3.5" />
            SwiftBridge
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </motion.div>

      {/* ─── PORTFOLIO COMMAND CARD ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <PortfolioCommandCard
          totalAssets={cashBalance + investValue + cryptoValue}
          cashBalance={cashBalance}
          investValue={investValue}
          cryptoValue={cryptoValue}
          dayPnl={invest.dayPnl + crypto.dayPnl}
          dayPct={
            (cashBalance + investValue + cryptoValue) > 0
              ? ((invest.dayPnl + crypto.dayPnl) / (cashBalance + investValue + cryptoValue)) * 100
              : 0
          }
        />
      </motion.div>

      {/* ─── ASSET BREAKDOWN CHIPS ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.03 }}
        className="grid grid-cols-2 gap-2.5"
      >
        <Link
          prefetch={false}
          href="/dashboard/invest"
          className="rounded-2xl border border-white/[0.06] bg-[#101216] p-4 hover:bg-[#14171D] transition-colors"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
            <span className="text-[10.5px] uppercase tracking-[0.18em] text-[#71717A]">Stocks &amp; ETFs</span>
          </div>
          <div className="text-[18px] font-semibold text-white tabular-nums">{formatBal(investValue)}</div>
          {investValue > 0 ? (
            <div className={`text-[11px] mt-0.5 tabular-nums ${invest.dayPnl >= 0 ? 'text-[#16C784]' : 'text-[#FF4D4F]'}`}>
              {invest.dayPnl >= 0 ? '+' : ''}{invest.dayPnl.toFixed(2)} ({invest.dayPnl >= 0 ? '+' : ''}{invest.dayPct.toFixed(2)}%) today
            </div>
          ) : (
            <div className="text-[11px] text-[#52525B] mt-0.5">No holdings yet</div>
          )}
        </Link>
        <Link
          prefetch={false}
          href="/dashboard/portfolio"
          className="rounded-2xl border border-white/[0.06] bg-[#101216] p-4 hover:bg-[#14171D] transition-colors"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            <span className="text-[10.5px] uppercase tracking-[0.18em] text-[#71717A]">Crypto</span>
          </div>
          <div className="text-[18px] font-semibold text-white tabular-nums">{formatBal(cryptoValue)}</div>
          {cryptoValue > 0 ? (
            <div className={`text-[11px] mt-0.5 tabular-nums ${crypto.dayPnl >= 0 ? 'text-[#16C784]' : 'text-[#FF4D4F]'}`}>
              {crypto.dayPnl >= 0 ? '+' : ''}{crypto.dayPnl.toFixed(2)} ({crypto.dayPnl >= 0 ? '+' : ''}{crypto.dayPct.toFixed(2)}%) total
            </div>
          ) : (
            <div className="text-[11px] text-[#52525B] mt-0.5">No holdings yet</div>
          )}
        </Link>
      </motion.div>

      {/* ─── QUICK ACTIONS (colorful, app-like) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.06 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
      >
        {[
          { l: 'Deposit',  h: '/dashboard/wallet',                i: CreditCard, c: 'text-[#16C784]', bg: 'from-[#16C784]/15 to-transparent' },
          { l: 'Withdraw', h: '/dashboard/wallet?tab=withdraw',   i: Send,       c: 'text-[#A1A1AA]', bg: 'from-white/[0.05] to-transparent' },
          { l: 'Trade',    h: '/dashboard/trade/crypto',          i: TrendingUp, c: 'text-[#3B82F6]', bg: 'from-[#3B82F6]/15 to-transparent' },
          { l: 'Bridge',   h: '/dashboard/bridge',                i: Globe,      c: 'text-[#F5C542]', bg: 'from-[#F5C542]/15 to-transparent' },
        ].map(a => (
          <Link key={a.l} prefetch={false} href={a.h}
            className={`group relative overflow-hidden flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border border-white/[0.06] bg-gradient-to-br ${a.bg} bg-[#101216] hover:border-white/[0.12] active:scale-[0.98] transition-all`}>
            <a.i className={`w-5 h-5 ${a.c}`} />
            <span className="text-[12.5px] text-white font-medium">{a.l}</span>
          </Link>
        ))}
      </motion.div>

      {/* ─── COMPACT STAT CARDS ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.09 }}
        className="grid grid-cols-2 lg:grid-cols-3 gap-3"
      >
        <CardLink href="/dashboard/portfolio" className="rounded-2xl border border-white/[0.06] bg-[#101216] p-4 hover:bg-[#14171D] transition-colors">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] mb-1.5">Portfolio</div>
          <div className="text-[18px] text-white font-semibold tabular-nums">{formatBal(cashBalance + investValue + cryptoValue)}</div>
          <div className="text-[11px] text-[#16C784] mt-0.5 tabular-nums">+0.42% today</div>
        </CardLink>
        <CardLink href="/dashboard/referrals" className="rounded-2xl border border-white/[0.06] bg-[#101216] p-4 hover:bg-[#14171D] transition-colors">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] mb-1.5">Referrals</div>
          <div className="text-[18px] text-white font-semibold tabular-nums">{(user as any)?.referral_count || 0}</div>
          <div className="text-[11px] text-[#F5C542] mt-0.5">Invite, earn →</div>
        </CardLink>
        <CardLink href="/dashboard/connect-wallet" className="rounded-2xl border border-white/[0.06] bg-[#101216] p-4 hover:bg-[#14171D] transition-colors col-span-2 lg:col-span-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] mb-1.5">Self-custody wallet</div>
          {walletConnected ? (
            <>
              <div className="text-[14px] font-mono text-[#16C784] tabular-nums">{walletAddress?.slice(0, 6)}…{walletAddress?.slice(-4)}</div>
              <div className="text-[11px] text-[#71717A] mt-0.5">Connected</div>
            </>
          ) : (
            <>
              <div className="text-[16px] text-white font-medium">Not connected</div>
              <div className="text-[11px] text-[#3B82F6] mt-0.5">Connect wallet →</div>
            </>
          )}
        </CardLink>
      </motion.div>

      {/* ─── ASSET CLASSES ─── */}
      <section>
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-champagne-300/70 font-medium mb-2">
              Markets
            </p>
            <h2 className="font-serif text-2xl text-pearl-50 font-light tracking-tight">Three asset classes</h2>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-pearl-100/[0.07] rounded-[20px] overflow-hidden border border-pearl-100/[0.07]">
          {[
            { name: 'Digital assets', sub: 'BTC · ETH · SOL · 350+ pairs', href: '/dashboard/trade/crypto', icon: Bitcoin },
            { name: 'Foreign exchange', sub: 'EUR/USD · GBP/USD · 60+ pairs', href: '/dashboard/trade/fx', icon: DollarSign },
            { name: 'Equities',          sub: 'AAPL · TSLA · NVDA · 5,000+ symbols', href: '/dashboard/trade/stocks', icon: BarChart3 },
          ].map((m) => (
            <Link key={m.name} href={m.href} className="group bg-gradient-to-br from-charcoal/40 to-obsidian/60 p-7 hover:from-charcoal/70 transition-colors flex items-start gap-5">
              <div className="w-11 h-11 rounded-[10px] border border-pearl-100/[0.10] flex items-center justify-center flex-shrink-0 group-hover:border-champagne-400/30 transition-colors">
                <m.icon className="w-[18px] h-[18px] text-pearl-100" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <div className="font-serif text-pearl-50 text-lg font-medium tracking-tight">{m.name}</div>
                <div className="text-xs text-pearl-300/55 mt-1">{m.sub}</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-pearl-300/40 group-hover:text-champagne-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* ─── KYC + RECENT ACTIVITY ─── */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* KYC card */}
        <div className="lg:col-span-4">
          <div className="rounded-[20px] border border-pearl-100/[0.07] bg-gradient-to-br from-charcoal/40 to-obsidian/60 p-7">
            <p className="text-[10px] uppercase tracking-[0.3em] text-champagne-300/70 font-medium mb-3">
              Verification
            </p>
            <div className="font-serif text-2xl text-pearl-50 font-light tracking-tight mb-2">
              {kycStatus === 'verified' ? 'Verified' : kycStatus === 'pending' ? 'In review' : 'Not verified'}
            </div>
            <p className="text-sm text-pearl-300/60 leading-relaxed mb-5">
              {kycStatus === 'verified'
                ? 'Your account is fully verified. All limits are unlocked.'
                : 'Verify your identity to unlock higher limits and lower fees.'}
            </p>
            <Link
              href="/kyc"
              className="inline-flex items-center gap-1.5 text-[13px] text-champagne-300 hover:text-champagne-200 font-medium"
            >
              {kycStatus === 'verified' ? 'View details' : 'Begin verification'}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-8">
          <div className="rounded-[20px] border border-pearl-100/[0.07] bg-gradient-to-br from-charcoal/40 to-obsidian/60 overflow-hidden">
            <div className="px-7 py-5 border-b border-pearl-100/[0.07] flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-champagne-300/70 font-medium mb-1">
                  Activity
                </p>
                <div className="font-serif text-xl text-pearl-50 font-light tracking-tight">Recent</div>
              </div>
              <Link href="/dashboard/history" className="text-[12px] text-pearl-300/60 hover:text-pearl-50 transition-colors flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <div className="px-7 py-14 text-center">
                <div className="text-pearl-300/45 text-sm">No recent activity</div>
                <Link href="/dashboard/wallet" className="inline-flex items-center gap-1.5 mt-4 text-[13px] text-champagne-300 hover:text-champagne-200 font-medium">
                  Make your first deposit <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-pearl-100/[0.05]">
                {recentActivity.slice(0, 6).map((it: any) => (
                  <div key={it.id} className="px-7 py-4 flex items-center gap-4 hover:bg-pearl-50/[0.02] transition-colors">
                    <div className="w-8 h-8 rounded-lg border border-pearl-100/[0.10] flex items-center justify-center text-[11px] font-mono text-pearl-300/70 capitalize">
                      {it.kind?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-pearl-50 font-medium truncate">{it.label}</div>
                      <div className="text-[11px] text-pearl-300/50 truncate">{it.sublabel}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-mono ${it.pnl > 0 ? 'text-profit' : it.pnl < 0 ? 'text-loss' : 'text-pearl-100'}`}>
                        {it.pnl > 0 ? '+' : ''}{formatCash(Math.abs(it.pnl || it.amount || 0))}
                      </div>
                      <div className="text-[10px] text-pearl-300/40 mt-0.5">{it.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── QUICK LINKS ─── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-pearl-100/[0.07] rounded-[20px] overflow-hidden border border-pearl-100/[0.07]">
          {[
            { label: 'SwiftBridge',    href: '/dashboard/bridge',         icon: Globe       },
            { label: 'Portfolio',      href: '/dashboard/portfolio',      icon: BarChart3   },
            { label: 'Trade history',  href: '/dashboard/history',        icon: History     },
            { label: 'Settings',       href: '/dashboard/settings',       icon: Settings    },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="bg-gradient-to-br from-charcoal/40 to-obsidian/60 p-5 hover:from-charcoal/70 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <link.icon className="w-4 h-4 text-pearl-300/65 group-hover:text-champagne-300 transition-colors" strokeWidth={1.75} />
                <span className="text-sm text-pearl-100 font-medium">{link.label}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-pearl-300/30 group-hover:text-pearl-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
