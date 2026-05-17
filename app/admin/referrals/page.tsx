'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Gift,
  DollarSign,
  Search,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Award,
  TrendingUp,
  UserPlus,
  ArrowRight,
  Clock,
  CheckCircle,
  X,
  Copy,
  Shield,
} from 'lucide-react';
import { useAdminAuthStore } from '@/lib/admin-store';

interface ReferralUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  tier_level: number;
  tier_code: string;
  tier_active: boolean;
  referral_code: string;
  created_at: string;
  balance_available: number;
}

interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  reward_paid: boolean;
  reward_amount: number;
  reward_trigger: string;
  created_at: string;
  updated_at: string | null;
  referrer: ReferralUser | null;
  referred: ReferralUser | null;
}

interface ReferrerSummary {
  referrer: ReferralUser | null;
  totalReferred: number;
  totalRewards: number;
  referralCode: string;
}

interface Stats {
  total: number;
  rewarded: number;
  pending: number;
  totalRewards: number;
  uniqueReferrers: number;
}

type FilterStatus = 'all' | 'rewarded' | 'pending';
type ViewMode = 'relationships' | 'referrers';

// ─────────────────────────────────────────────
// TOKEN HUNTING
// ─────────────────────────────────────────────
function getStorageToken(): string | null {
  if (typeof window === 'undefined') return null;
  const ss =
    window.sessionStorage.getItem('swifttrade_admin_token') ||
    window.sessionStorage.getItem('admin_token');
  if (ss) return ss;
  const ls =
    window.localStorage.getItem('swifttrade_admin_token') ||
    window.localStorage.getItem('admin_token');
  if (ls) {
    try { window.sessionStorage.setItem('swifttrade_admin_token', ls); } catch {}
    return ls;
  }
  return null;
}

function getAdminToken(admin: any, storeToken?: string | null): string | null {
  if (storeToken) return storeToken;
  const fromAdmin =
    admin?.sessionToken || admin?.session_token || admin?.token ||
    admin?.access_token || admin?.accessToken || null;
  if (fromAdmin) return fromAdmin;
  return getStorageToken();
}

export default function AdminReferralsPage() {
  const store: any = useAdminAuthStore();
  const admin = store?.admin ?? null;
  const storeToken: string | null = store?.sessionToken ?? store?.token ?? null;
  const token = useMemo(() => getAdminToken(admin, storeToken), [admin, storeToken]);

  useEffect(() => {
    if (typeof window === 'undefined' || !token) return;
    try { window.sessionStorage.setItem('swifttrade_admin_token', token); } catch {}
  }, [token]);

  const apiFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!token) throw new Error('Missing admin token. Please log in again.');
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        ...(init?.headers as any),
      };
      if (init?.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
      const res = await fetch(path, { ...init, headers, cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      return json;
    },
    [token]
  );

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referrerSummary, setReferrerSummary] = useState<ReferrerSummary[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, rewarded: 0, pending: 0, totalRewards: 0, uniqueReferrers: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('relationships');
  const [message, setMessage] = useState('');
  const [expandedReferrer, setExpandedReferrer] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<Referral | null>(null);

  const loadReferrals = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setMessage('');
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (search) params.set('search', search);
      const url = `/api/admin/referrals${params.toString() ? '?' + params.toString() : ''}`;
      const data = await apiFetch(url);
      if (data.success) {
        setReferrals(data.referrals || []);
        setReferrerSummary(data.referrerSummary || []);
        setStats(data.stats || { total: 0, rewarded: 0, pending: 0, totalRewards: 0, uniqueReferrers: 0 });
      } else {
        setReferrals([]);
        setMessage(data?.error || 'Failed to load referrals');
      }
    } catch (err: any) {
      console.error('Failed to load referrals:', err);
      setMessage(err?.message || 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, [filter, search, apiFetch, token]);

  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

  // Search-filtered data for client-side filtering
  const filteredReferrals = useMemo(() => {
    if (!search) return referrals;
    const q = search.toLowerCase();
    return referrals.filter((r) => {
      const re = r.referrer;
      const rd = r.referred;
      return (
        (re?.email || '').toLowerCase().includes(q) ||
        `${re?.first_name || ''} ${re?.last_name || ''}`.toLowerCase().includes(q) ||
        (rd?.email || '').toLowerCase().includes(q) ||
        `${rd?.first_name || ''} ${rd?.last_name || ''}`.toLowerCase().includes(q) ||
        (re?.referral_code || '').toLowerCase().includes(q)
      );
    });
  }, [referrals, search]);

  const filteredSummary = useMemo(() => {
    if (!search) return referrerSummary;
    const q = search.toLowerCase();
    return referrerSummary.filter((s) => {
      const re = s.referrer;
      return (
        (re?.email || '').toLowerCase().includes(q) ||
        `${re?.first_name || ''} ${re?.last_name || ''}`.toLowerCase().includes(q) ||
        s.referralCode.toLowerCase().includes(q)
      );
    });
  }, [referrerSummary, search]);

  // Group referrals by referrer for the expanded view
  const referralsByReferrer = useMemo(() => {
    const map = new Map<string, Referral[]>();
    for (const r of filteredReferrals) {
      const rid = r.referrer_id;
      if (!map.has(rid)) map.set(rid, []);
      map.get(rid)!.push(r);
    }
    return map;
  }, [filteredReferrals]);

  function userName(u: any) {
    if (!u) return 'Unknown';
    return `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Unknown';
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setMessage('Copied to clipboard');
    setTimeout(() => setMessage(''), 2000);
  }

  const TIER_NAMES: Record<string, string> = {
    basic: 'Basic', starter: 'Starter', trader: 'Trader',
    professional: 'Professional', elite: 'Elite',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cream flex items-center gap-2">
            <Users className="w-6 h-6 text-electric" />
            Referral Panel
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor who referred who, referral codes, and reward payouts.
          </p>
        </div>
        <button
          onClick={loadReferrals}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className="p-3 bg-gold/10 border border-gold/20 rounded-xl text-sm text-cream flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-cream/40 hover:text-cream">✕</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-obsidian rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-electric/20 rounded-lg">
              <LinkIcon className="w-5 h-5 text-electric" />
            </div>
            <div>
              <p className="text-2xl font-bold text-cream">{stats.total}</p>
              <p className="text-xs text-slate-500">Total Referrals</p>
            </div>
          </div>
        </div>

        <div className="bg-obsidian rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-profit/20 rounded-lg">
              <UserPlus className="w-5 h-5 text-profit" />
            </div>
            <div>
              <p className="text-2xl font-bold text-cream">{stats.uniqueReferrers}</p>
              <p className="text-xs text-slate-500">Active Referrers</p>
            </div>
          </div>
        </div>

        <div className="bg-obsidian rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-profit">{stats.rewarded}</p>
              <p className="text-xs text-slate-500">Rewards Paid</p>
            </div>
          </div>
        </div>

        <div className="bg-obsidian rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-champagne-400/15 rounded-lg">
              <Clock className="w-5 h-5 text-champagne-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-champagne-300">{stats.pending}</p>
              <p className="text-xs text-slate-500">Pending Rewards</p>
            </div>
          </div>
        </div>

        <div className="bg-obsidian rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-profit/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-profit" />
            </div>
            <div>
              <p className="text-2xl font-bold text-profit">${stats.totalRewards.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Total Payouts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter + Search + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'rewarded'] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-gold/20 text-gold'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}

          {/* View mode toggle */}
          <div className="flex bg-white/5 rounded-xl overflow-hidden border border-white/10 ml-2">
            <button
              onClick={() => setViewMode('relationships')}
              className={`px-3 py-2 text-xs font-medium transition-all ${
                viewMode === 'relationships' ? 'bg-electric/20 text-electric' : 'text-slate-400 hover:text-cream'
              }`}
            >
              All Referrals
            </button>
            <button
              onClick={() => setViewMode('referrers')}
              className={`px-3 py-2 text-xs font-medium transition-all ${
                viewMode === 'referrers' ? 'bg-electric/20 text-electric' : 'text-slate-400 hover:text-cream'
              }`}
            >
              By Referrer
            </button>
          </div>
        </div>

        <div className="relative w-full sm:w-auto sm:min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, name, code..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-cream placeholder:text-slate-600 focus:outline-none focus:border-gold/30"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* VIEW: All Referral Relationships            */}
      {/* ═══════════════════════════════════════════ */}
      {viewMode === 'relationships' && (
        <div className="bg-obsidian rounded-2xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-6 h-6 text-slate-500 animate-spin mx-auto mb-2" />
              <p className="text-slate-500">Loading referrals...</p>
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500">No referrals found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Referrer (Inviter)</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase"></th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Referred (Invited)</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Code Used</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Reward</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferrals.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      {/* Referrer */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-cream font-medium">{userName(r.referrer)}</p>
                        <p className="text-xs text-slate-500">{r.referrer?.email || r.referrer_id.slice(0, 8)}</p>
                      </td>

                      {/* Arrow */}
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-center">
                          <ArrowRight className="w-4 h-4 text-electric" />
                        </div>
                      </td>

                      {/* Referred */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-cream font-medium">{userName(r.referred)}</p>
                        <p className="text-xs text-slate-500">{r.referred?.email || r.referred_user_id.slice(0, 8)}</p>
                        {r.referred?.tier_code && r.referred.tier_code !== 'basic' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gold/10 text-gold rounded mt-0.5 inline-block">
                            {TIER_NAMES[r.referred.tier_code] || r.referred.tier_code}
                          </span>
                        )}
                      </td>

                      {/* Code */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-electric bg-electric/10 px-2 py-1 rounded">
                          {r.referrer?.referral_code || '—'}
                        </span>
                      </td>

                      {/* Reward */}
                      <td className="px-4 py-3">
                        {r.reward_amount > 0 ? (
                          <span className="text-sm font-medium text-profit">${Number(r.reward_amount).toLocaleString()}</span>
                        ) : (
                          <span className="text-xs text-slate-600">$0</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          r.reward_paid
                            ? 'bg-profit/20 text-profit'
                            : 'bg-champagne-400/15 text-champagne-300'
                        }`}>
                          {r.reward_paid ? 'Rewarded' : r.reward_trigger === 'pending_tier' ? 'Pending Tier' : 'Pending'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setShowDetailModal(r)}
                          className="px-2 py-1.5 bg-white/5 text-slate-400 text-xs rounded-lg hover:bg-white/10"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* VIEW: Grouped By Referrer                   */}
      {/* ═══════════════════════════════════════════ */}
      {viewMode === 'referrers' && (
        <div className="space-y-3">
          {loading ? (
            <div className="bg-obsidian rounded-2xl border border-white/10 p-12 text-center">
              <RefreshCw className="w-6 h-6 text-slate-500 animate-spin mx-auto mb-2" />
              <p className="text-slate-500">Loading...</p>
            </div>
          ) : filteredSummary.length === 0 ? (
            <div className="bg-obsidian rounded-2xl border border-white/10 p-12 text-center">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500">No referrers found.</p>
            </div>
          ) : (
            filteredSummary
              .sort((a, b) => b.totalReferred - a.totalReferred)
              .map((summary) => {
                const rid = summary.referrer?.id || '';
                const isExpanded = expandedReferrer === rid;
                const children = referralsByReferrer.get(rid) || [];

                return (
                  <div
                    key={rid}
                    className="bg-obsidian rounded-2xl border border-white/10 overflow-hidden"
                  >
                    {/* Referrer Header Row */}
                    <button
                      onClick={() => setExpandedReferrer(isExpanded ? null : rid)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-electric/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Award className="w-5 h-5 text-electric" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-cream">{userName(summary.referrer)}</p>
                          <p className="text-xs text-slate-500">{summary.referrer?.email || '—'}</p>
                        </div>
                        <span className="text-xs font-mono text-electric bg-electric/10 px-2 py-1 rounded ml-2">
                          {summary.referralCode}
                        </span>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-cream">{summary.totalReferred}</p>
                          <p className="text-xs text-slate-500">Referred</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-profit">${summary.totalRewards.toLocaleString()}</p>
                          <p className="text-xs text-slate-500">Earned</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Children */}
                    <AnimatePresence>
                      {isExpanded && children.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-white/5"
                        >
                          <div className="px-5 py-2 bg-white/[0.01]">
                            <p className="text-xs text-slate-500 mb-2 font-medium">People invited by {userName(summary.referrer)}:</p>
                            <div className="space-y-2">
                              {children.map((child) => (
                                <div
                                  key={child.id}
                                  className="flex items-center justify-between px-4 py-3 bg-white/[0.03] rounded-xl"
                                >
                                  <div className="flex items-center gap-3">
                                    <UserPlus className="w-4 h-4 text-slate-500" />
                                    <div>
                                      <p className="text-sm text-cream">{userName(child.referred)}</p>
                                      <p className="text-xs text-slate-500">{child.referred?.email || child.referred_user_id.slice(0, 8)}</p>
                                    </div>
                                    {child.referred?.tier_code && child.referred.tier_code !== 'basic' && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-gold/10 text-gold rounded">
                                        {TIER_NAMES[child.referred.tier_code] || child.referred.tier_code}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-4">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      child.reward_paid ? 'bg-profit/20 text-profit' : 'bg-champagne-400/15 text-champagne-300'
                                    }`}>
                                      {child.reward_paid ? `+$${Number(child.reward_amount).toLocaleString()}` : 'Pending'}
                                    </span>
                                    <span className="text-xs text-slate-600">
                                      {new Date(child.created_at).toLocaleDateString()}
                                    </span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setShowDetailModal(child); }}
                                      className="p-1.5 bg-white/5 text-slate-400 rounded-lg hover:bg-white/10"
                                      title="View Details"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* Detail Modal                                */}
      {/* ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {showDetailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-void/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowDetailModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="bg-charcoal border border-white/10 rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-cream">Referral Details</h3>
                <button onClick={() => setShowDetailModal(null)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Referrer Card */}
                <div className="p-4 bg-electric/5 rounded-xl border border-electric/10">
                  <p className="text-xs text-electric font-medium mb-2 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> REFERRER (Inviter)
                  </p>
                  <p className="text-cream font-medium">{userName(showDetailModal.referrer)}</p>
                  <p className="text-sm text-slate-400">{showDetailModal.referrer?.email || '—'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-500">Code:</span>
                    <span className="text-xs font-mono text-electric bg-electric/10 px-2 py-0.5 rounded">
                      {showDetailModal.referrer?.referral_code || '—'}
                    </span>
                    {showDetailModal.referrer?.referral_code && (
                      <button
                        onClick={() => copyText(showDetailModal.referrer?.referral_code || '')}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        <Copy className="w-3 h-3 text-slate-400" />
                      </button>
                    )}
                  </div>
                  {showDetailModal.referrer?.tier_code && (
                    <p className="text-xs text-slate-500 mt-1">
                      Tier: {TIER_NAMES[showDetailModal.referrer.tier_code] || showDetailModal.referrer.tier_code} (L{showDetailModal.referrer.tier_level})
                    </p>
                  )}
                </div>

                <div className="flex justify-center">
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-8 h-[1px] bg-slate-700" />
                    <ArrowRight className="w-4 h-4" />
                    <span className="text-xs">invited</span>
                    <ArrowRight className="w-4 h-4" />
                    <div className="w-8 h-[1px] bg-slate-700" />
                  </div>
                </div>

                {/* Referred Card */}
                <div className="p-4 bg-profit/5 rounded-xl border border-profit/10">
                  <p className="text-xs text-profit font-medium mb-2 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" /> REFERRED (Invited)
                  </p>
                  <p className="text-cream font-medium">{userName(showDetailModal.referred)}</p>
                  <p className="text-sm text-slate-400">{showDetailModal.referred?.email || '—'}</p>
                  {showDetailModal.referred?.tier_code && (
                    <p className="text-xs text-slate-500 mt-1">
                      Tier: {TIER_NAMES[showDetailModal.referred.tier_code] || showDetailModal.referred.tier_code} (L{showDetailModal.referred.tier_level})
                      {showDetailModal.referred.tier_active ? (
                        <span className="text-profit ml-1">● Active</span>
                      ) : (
                        <span className="text-slate-600 ml-1">● Inactive</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Joined: {new Date(showDetailModal.referred?.created_at || showDetailModal.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Reward Info */}
                <div className="p-4 bg-white/5 rounded-xl space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reward Status</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      showDetailModal.reward_paid ? 'bg-profit/20 text-profit' : 'bg-champagne-400/15 text-champagne-300'
                    }`}>
                      {showDetailModal.reward_paid ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reward Amount</span>
                    <span className="text-cream font-semibold">${Number(showDetailModal.reward_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reward Trigger</span>
                    <span className="text-cream">{showDetailModal.reward_trigger || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Referral Date</span>
                    <span className="text-cream">{new Date(showDetailModal.created_at).toLocaleString()}</span>
                  </div>
                  {showDetailModal.updated_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Last Updated</span>
                      <span className="text-cream">{new Date(showDetailModal.updated_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowDetailModal(null)}
                className="w-full mt-4 py-2 bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
