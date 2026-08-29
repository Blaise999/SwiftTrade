'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AssetLogo } from '@/components/AssetLogo';
import {
  RefreshCw,
  Search,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  CreditCard,
  Users,
  History,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useStore } from '@/lib/supabase/store-supabase';

type ActivityKind = 'trade' | 'deposit' | 'withdrawal' | 'tier' | 'bonus' | 'referral' | 'bridge' | 'all';

type ActivityItem = {
  id: string;
  kind: 'trade' | 'deposit' | 'withdrawal' | 'tier' | 'bonus' | 'referral' | 'bridge';
  label: string;
  sublabel: string;
  amount: number;
  pnl: number;
  status: string;
  created_at: string;
  // Trade-specific fields
  direction?: string;
  entry_price?: number;
  exit_price?: number;
  multiplier?: number;
  market_type?: string;
};

function fmt(n: number, dp = 2) {
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(dp);
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const norm = (v: any) => String(v ?? '').trim().toLowerCase();

/**
 * ✅ Deposit status rule you asked for:
 * - User submitted deposit => "pending"
 * - Admin approves deposit => "confirmed"
 *
 * We also accept older values ("completed"/"approved") and treat them as confirmed,
 * so history keeps working even if you migrate old rows.
 */
const DONE_DEPOSIT = new Set(['confirmed', 'completed', 'approved', 'success']);
const PENDING_DEPOSIT = new Set(['pending', 'processing', 'submitted']);

function normalizeDepositStatus(s: any): 'pending' | 'confirmed' | 'rejected' | 'unknown' {
  const v = norm(s);
  if (DONE_DEPOSIT.has(v)) return 'confirmed';
  if (PENDING_DEPOSIT.has(v)) return 'pending';
  if (['rejected', 'failed', 'declined', 'canceled', 'cancelled', 'expired'].includes(v)) return 'rejected';
  return 'unknown';
}

function prettyDepositStatus(s: any) {
  const v = normalizeDepositStatus(s);
  if (v === 'confirmed') return 'confirmed';
  if (v === 'pending') return 'pending';
  if (v === 'rejected') return 'rejected';
  return 'unknown';
}

export default function FullActivityHistoryPage() {
  const { user } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState<ActivityKind>('all');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');

  const [page, setPage] = useState(1);
  const pageSize = 25;

  const firstLoadRef = useRef(false);

  const canUseSupabase =
    (typeof isSupabaseConfigured === 'function' ? isSupabaseConfigured() : !!isSupabaseConfigured) && !!supabase;

  const fetchAllActivity = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true); setError(null);
    try {
      // Server-side: RLS blocks client reads (custom auth => auth.uid() is null)
      const j = await (await fetch(`/api/history?userId=${user.id}`, { cache: 'no-store' })).json();
      const raw: any[] = Array.isArray(j?.items) ? j.items : [];
      const mapped: ActivityItem[] = raw.map((r) => ({
        id: r.id,
        kind: (r.category === 'membership' ? 'tier'
             : r.category === 'fee' ? 'trade'
             : (['trade','deposit','withdrawal','referral','bridge'].includes(r.category) ? r.category : 'bonus')) as ActivityItem['kind'],
        label: r.title || '',
        sublabel: r.subtitle || '',
        amount: Number(r.amount) || 0,
        pnl: r.direction === 'out' ? -(Number(r.amount) || 0) : (Number(r.amount) || 0),
        status: r.status || 'completed',
        created_at: r.created_at,
        direction: r.direction,
        market_type: r.symbol || undefined,
      }));
      // client-side date filter
      const now = Date.now();
      const cut = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 0;
      const filteredByDate = cut
        ? mapped.filter((m) => now - new Date(m.created_at).getTime() <= cut * 864e5)
        : mapped;
      setActivities(filteredByDate);
    } catch (e: any) {
      setError(e?.message || 'Failed to load activity history');
    } finally {
      setLoading(false);
    }
  }, [user?.id, dateRange]);

  useEffect(() => {
    if (firstLoadRef.current) return;
    firstLoadRef.current = true;
    fetchAllActivity();
  }, [fetchAllActivity]);

  useEffect(() => {
    if (firstLoadRef.current) fetchAllActivity();
  }, [dateRange, fetchAllActivity]);

  // Filtered activities
  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return activities.filter((item) => {
      if (filterKind !== 'all' && item.kind !== filterKind) return false;

      if (query) {
        const matchLabel = item.label.toLowerCase().includes(query);
        const matchSublabel = item.sublabel.toLowerCase().includes(query);
        if (!matchLabel && !matchSublabel) return false;
      }

      return true;
    });
  }, [activities, filterKind, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterKind, dateRange]);

  // Stats
  const stats = useMemo(() => {
    const trades = activities.filter((a) => a.kind === 'trade');
    const deposits = activities.filter((a) => a.kind === 'deposit');
    const withdrawals = activities.filter((a) => a.kind === 'withdrawal');

    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    // ✅ count both old + new "done" statuses (confirmed/completed/approved)
    const totalDeposited = deposits
      .filter((d) => normalizeDepositStatus(d.status) === 'confirmed')
      .reduce((sum, d) => sum + d.amount, 0);

    const totalWithdrawn = withdrawals
      .filter((w) => ['approved', 'completed', 'confirmed'].includes(norm(w.status)))
      .reduce((sum, w) => sum + w.amount, 0);

    const winTrades = trades.filter((t) => t.pnl > 0).length;
    const lossTrades = trades.filter((t) => t.pnl < 0).length;

    return {
      totalTrades: trades.length,
      totalPnl,
      totalDeposited,
      totalWithdrawn,
      winRate: trades.length > 0 ? ((winTrades / trades.length) * 100).toFixed(1) : '0',
      winTrades,
      lossTrades,
    };
  }, [activities]);

  const getKindIcon = (kind: ActivityItem['kind']) => {
    switch (kind) {
      case 'trade':
        return TrendingUp;
      case 'deposit':
        return ArrowUpRight;
      case 'withdrawal':
        return ArrowDownRight;
      case 'tier':
        return CreditCard;
      case 'bonus':
        return Gift;
      case 'referral':
        return Users;
      default:
        return History;
    }
  };

  const getKindColor = (kind: ActivityItem['kind'], pnl: number) => {
    switch (kind) {
      case 'deposit':
        return { bg: 'bg-electric/20', text: 'text-electric' };
      case 'withdrawal':
        return { bg: 'bg-orange-500/20', text: 'text-orange-400' };
      case 'tier':
        return { bg: 'bg-gold/20', text: 'text-gold' };
      case 'bonus':
        return { bg: 'bg-purple-500/20', text: 'text-purple-400' };
      case 'referral':
        return { bg: 'bg-cyan-500/20', text: 'text-cyan-400' };
      case 'trade':
      default:
        return pnl >= 0 ? { bg: 'bg-profit/20', text: 'text-profit' } : { bg: 'bg-loss/20', text: 'text-loss' };
    }
  };

  const getStatusColor = (status: string) => {
    const s = norm(status);

    // ✅ deposit rule: confirmed = "done"
    if (s === 'confirmed' || s === 'completed' || s === 'approved' || s === 'won' || s === 'closed') {
      return 'text-emerald-400';
    }

    if (s === 'pending' || s === 'processing' || s === 'submitted' || s === 'active' || s === 'open') {
      return 'text-yellow-400';
    }

    if (s === 'rejected' || s === 'failed' || s === 'lost' || s === 'liquidated' || s === 'expired') {
      return 'text-rose-400';
    }

    return 'text-white/50';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-gold" />
            Activity History
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Complete history of all your trades, deposits, withdrawals, and more
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchAllActivity()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 disabled:opacity-50 transition"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/5 rounded-xl border border-white/10 p-4">
          <p className="text-xs text-white/50 mb-1">Total Trades</p>
          <p className="text-xl font-bold text-white">{stats.totalTrades}</p>
          <p className="text-xs text-white/40 mt-1">
            Win Rate: <span className="text-profit">{stats.winRate}%</span>
          </p>
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-4">
          <p className="text-xs text-white/50 mb-1">Total P/L</p>
          <p className={`text-xl font-bold ${stats.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {stats.totalPnl >= 0 ? '+' : ''}${fmt(stats.totalPnl)}
          </p>
          <p className="text-xs text-white/40 mt-1">
            W: {stats.winTrades} / L: {stats.lossTrades}
          </p>
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-4">
          <p className="text-xs text-white/50 mb-1">Total Deposited</p>
          <p className="text-xl font-bold text-electric">${fmt(stats.totalDeposited)}</p>
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-4">
          <p className="text-xs text-white/50 mb-1">Total Withdrawn</p>
          <p className="text-xl font-bold text-orange-400">${fmt(stats.totalWithdrawn)}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 outline-none text-sm text-white placeholder:text-white/40 focus:border-white/20"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Type Filter */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
            {(['all', 'trade', 'deposit', 'withdrawal', 'tier', 'bonus', 'referral'] as ActivityKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setFilterKind(kind)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filterKind === kind ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {kind === 'all' ? 'All' : kind.charAt(0).toUpperCase() + kind.slice(1)}
              </button>
            ))}
          </div>

          {/* Date Range */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
            {(['all', '7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  dateRange === range ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {range === 'all' ? 'All Time' : range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {loading ? (
          <div className="px-4 py-12 text-center text-white/60">Loading activity...</div>
        ) : pageItems.length === 0 ? (
          <div className="px-4 py-12 text-center text-white/60">
            {searchQuery || filterKind !== 'all' ? 'No matching activity found.' : 'No activity yet.'}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {pageItems.map((item) => {
              const Icon = getKindIcon(item.kind);
              const colors = getKindColor(item.kind, item.pnl);
              // ticker sits in market_type when the row came from a trade
              const sym = (item as any).market_type && /^[A-Z0-9.]{1,6}$/.test(String((item as any).market_type))
                ? String((item as any).market_type).toUpperCase()
                : (item.label.match(/\b([A-Z]{2,6})\b/)?.[1] || null);
              const isTrade = item.kind === 'trade';
              const isOut = item.kind === 'withdrawal' || (isTrade && /bought|buy|shield|premium|fee/i.test(item.label));
              const amountTone = isOut ? 'text-[#FF6B57]' : 'text-[#00C805]';
              const accent =
                item.kind === 'trade' ? '#00C805'
                : item.kind === 'deposit' ? '#4EA8DE'
                : item.kind === 'withdrawal' ? '#FF6B57'
                : item.kind === 'bridge' ? '#7C5CFC'
                : item.kind === 'referral' ? '#E4C883'
                : 'var(--gold)';

              return (
                <div key={item.id}
                  className="relative flex items-center justify-between gap-3 p-4 hover:bg-white/[0.04] transition-colors">
                  {/* left accent stripe by category */}
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                    style={{ background: accent, opacity: 0.7 }} />

                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* real asset logo when we know the ticker, else the category icon */}
                    {sym && isTrade ? (
                      <div className="relative shrink-0">
                        <AssetLogo symbol={sym} kind="stock" size={40} className="rounded-xl" />
                        <span className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-[#0B0D14]"
                          style={{ background: accent }}>
                          <Icon className="w-2.5 h-2.5 text-black" />
                        </span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)` }}>
                        <Icon className="w-5 h-5" style={{ color: accent }} />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white text-[14px]">{item.label}</p>
                        <span className="text-[9.5px] uppercase tracking-[0.14em] font-bold px-1.5 py-0.5 rounded"
                          style={{ color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }}>
                          {item.kind}
                        </span>
                      </div>
                      {item.sublabel && <p className="text-[11.5px] text-white/45 truncate max-w-[38ch]">{item.sublabel}</p>}
                      <p className="text-[11px] text-white/30 mt-0.5">{formatDate(item.created_at)}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`font-bold tabular-nums text-[15px] ${amountTone}`}>
                      {isOut ? '−' : '+'}${fmt(item.amount)}
                    </p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-lg text-[10px] font-medium ${getStatusColor(
                        item.status
                      )} bg-white/5`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filtered.length > pageSize && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-white/5 text-xs text-white/60">
            <div>
              Page {page} / {totalPages} • {filtered.length} total
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {!canUseSupabase && (
        <div className="text-xs text-yellow-200/80">Supabase client not configured — cannot fetch activity history.</div>
      )}
    </div>
  );
}
