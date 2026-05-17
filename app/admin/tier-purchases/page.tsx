'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  DollarSign,
  Gift,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Eye,
  Edit,
  Save,
  X,
  Wallet,
} from 'lucide-react';
import { useAdminAuthStore } from '@/lib/admin-store';

interface TierPurchase {
  id: string;
  user_id: string;
  tier_level: number;
  tier_code: string;
  price_amount: number;
  bonus_amount: number;
  currency: string;
  payment_asset: string | null;
  payment_network: string | null;
  tx_hash: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  users?: {
    email: string;
    first_name: string;
    last_name: string;
    tier_level: number;
    tier_active: boolean;
    deposit_address?: string;
  };
}

const TIER_NAMES: Record<string, string> = {
  starter: 'Starter',
  trader: 'Trader',
  professional: 'Professional',
  elite: 'Elite',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-champagne-400/15 text-champagne-300',
  approved: 'bg-profit/20 text-profit',
  rejected: 'bg-loss/20 text-loss',
};

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

// ─────────────────────────────────────────────
// TOKEN HUNTING (same logic style as AdminDepositsPage)
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
    try {
      window.sessionStorage.setItem('swifttrade_admin_token', ls);
    } catch {}
    return ls;
  }

  return null;
}

function getAdminToken(admin: any, storeToken?: string | null): string | null {
  if (storeToken) return storeToken;

  const fromAdmin =
    admin?.sessionToken ||
    admin?.session_token ||
    admin?.token ||
    admin?.access_token ||
    admin?.accessToken ||
    null;

  if (fromAdmin) return fromAdmin;

  return getStorageToken();
}

export default function AdminTierPurchasesPage() {
  const store: any = useAdminAuthStore();

  const admin = store?.admin ?? null;
  const storeToken: string | null = store?.sessionToken ?? store?.token ?? null;
  const token = useMemo(() => getAdminToken(admin, storeToken), [admin, storeToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!token) return;
    try {
      window.sessionStorage.setItem('swifttrade_admin_token', token);
    } catch {}
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

  const [purchases, setPurchases] = useState<TierPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  // Detail modal states
  const [showDetailModal, setShowDetailModal] = useState<TierPurchase | null>(null);
  const [editingDepositAddress, setEditingDepositAddress] = useState(false);
  const [newDepositAddress, setNewDepositAddress] = useState('');
  const [depositNote, setDepositNote] = useState('');

  const loadPurchases = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setMessage('');
    try {
      const url =
        filter === 'all'
          ? '/api/admin/tier-purchases'
          : `/api/admin/tier-purchases?status=${filter}`;

      const data = await apiFetch(url);

      if (data.success) {
        setPurchases(data.purchases || []);
      } else {
        setPurchases([]);
        setMessage(data?.error || 'Failed to load');
      }
    } catch (err: any) {
      console.error('Failed to load tier purchases:', err);
      setMessage(err?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [filter, apiFetch, token]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  async function handleApprove(purchaseId: string) {
    setActionLoading(true);
    setMessage('');
    try {
      const data = await apiFetch('/api/admin/tier-purchases', {
        method: 'PATCH',
        body: JSON.stringify({ purchaseId, action: 'approve' }),
      });

      setMessage(data.message || (data.success ? 'Approved!' : data.error));
      if (data.success) {
        await loadPurchases();
      }
    } catch (e: any) {
      setMessage(e?.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(purchaseId: string) {
    setActionLoading(true);
    setMessage('');
    try {
      const data = await apiFetch('/api/admin/tier-purchases', {
        method: 'PATCH',
        body: JSON.stringify({
          purchaseId,
          action: 'reject',
          rejectedReason: rejectReason || 'Rejected by admin',
        }),
      });

      setMessage(data.message || (data.success ? 'Rejected' : data.error));
      if (data.success) {
        setShowRejectModal(null);
        setRejectReason('');
        await loadPurchases();
      }
    } catch (e: any) {
      setMessage(e?.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  }

  // Update user's deposit address
  async function handleUpdateDepositAddress(userId: string) {
    if (!newDepositAddress.trim()) {
      setMessage('Invalid address');
      return;
    }
    setActionLoading(true);
    setMessage('');

    try {
      await apiFetch(`/api/admin/users/${userId}/deposit-address`, {
        method: 'POST',
        body: JSON.stringify({ newAddress: newDepositAddress, note: depositNote }),
      });
      setMessage('Deposit address updated successfully');
      setEditingDepositAddress(false);
      // Update local state for the modal
      if (showDetailModal) {
        setShowDetailModal({
          ...showDetailModal,
          users: {
            ...showDetailModal.users!,
            deposit_address: newDepositAddress,
          },
        });
      }
      await loadPurchases();
    } catch (e: any) {
      setMessage(e.message || 'Failed to update address');
    } finally {
      setActionLoading(false);
    }
  }

  const pendingCount = purchases.filter((p) => p.status === 'pending').length;

  function getUserDisplay(p: TierPurchase) {
    const u = p.users;
    if (!u) return { name: 'Unknown', email: p.user_id?.slice(0, 8) || '' };
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'User';
    return { name, email: u.email };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cream flex items-center gap-2">
            <Shield className="w-6 h-6 text-gold" />
            Tier Purchases
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Approve or reject tier purchase requests. Approved purchases grant tier access + 40% bonus credit.
          </p>
        </div>
        <button
          onClick={loadPurchases}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className="p-3 bg-gold/10 border border-gold/20 rounded-xl text-sm text-cream flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-cream/40 hover:text-cream">
            ✕
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-obsidian rounded-xl border border-white/10 p-4">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="text-2xl font-bold text-champagne-300">{pendingCount}</p>
        </div>
        <div className="bg-obsidian rounded-xl border border-white/10 p-4">
          <p className="text-xs text-slate-500">Approved</p>
          <p className="text-2xl font-bold text-profit">
            {purchases.filter((p) => p.status === 'approved').length}
          </p>
        </div>
        <div className="bg-obsidian rounded-xl border border-white/10 p-4">
          <p className="text-xs text-slate-500">Total Revenue</p>
          <p className="text-2xl font-bold text-cream">
            ${purchases
              .filter((p) => p.status === 'approved')
              .reduce((sum, p) => sum + Number(p.price_amount), 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-obsidian rounded-xl border border-white/10 p-4">
          <p className="text-xs text-slate-500">Total Bonuses</p>
          <p className="text-2xl font-bold text-gold">
            ${purchases
              .filter((p) => p.status === 'approved')
              .reduce((sum, p) => sum + Number(p.bonus_amount), 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['pending', 'all', 'approved', 'rejected'] as FilterStatus[]).map((f) => (
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
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-champagne-400/15 text-champagne-300 rounded-full text-xs">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-obsidian rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-slate-500 animate-spin mx-auto mb-2" />
            <p className="text-slate-500">Loading...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500">No tier purchases found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Tier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Bonus</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Wallet</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">TX Hash</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="text-sm text-cream">
                        {p.users?.first_name || ''} {p.users?.last_name || ''}
                      </p>
                      <p className="text-xs text-slate-500">{p.users?.email || p.user_id.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-cream">
                        {TIER_NAMES[p.tier_code] || p.tier_code}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">(L{p.tier_level})</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-cream font-medium">
                      ${Number(p.price_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gold">
                      +${Number(p.bonus_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {p.users?.deposit_address ? (
                        <span className="text-xs font-mono text-slate-400" title={p.users.deposit_address}>
                          {p.users.deposit_address.slice(0, 6)}...{p.users.deposit_address.slice(-4)}
                        </span>
                      ) : (
                        <span className="text-xs text-champagne-300">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.tx_hash ? (
                        <span className="text-xs font-mono text-slate-400">
                          {p.tx_hash.slice(0, 10)}...
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          STATUS_STYLES[p.status] || ''
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {p.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-profit/20 text-profit text-xs rounded-lg hover:bg-profit/30 transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setShowRejectModal(p.id)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-loss/20 text-loss text-xs rounded-lg hover:bg-loss/30 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {p.status === 'rejected' && p.rejected_reason && (
                          <span className="text-xs text-slate-500 max-w-[120px] truncate" title={p.rejected_reason}>
                            {p.rejected_reason.slice(0, 30)}
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setShowDetailModal(p);
                            setEditingDepositAddress(false);
                            setNewDepositAddress('');
                            setDepositNote('');
                          }}
                          className="px-2 py-1.5 bg-white/5 text-slate-400 text-xs rounded-lg hover:bg-white/10"
                          title="View Details & Edit Wallet"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-void/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowRejectModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-charcoal border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4"
            >
              <h3 className="text-lg font-bold text-cream mb-4">Reject Tier Purchase</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-slate-600 focus:border-loss/40 focus:outline-none text-sm"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowRejectModal(null)}
                  className="flex-1 py-2 bg-white/5 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(showRejectModal)}
                  disabled={actionLoading}
                  className="flex-1 py-2 bg-loss/20 text-loss font-semibold rounded-xl disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal with Wallet Editing */}
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
              <h3 className="text-lg font-bold text-cream mb-4">Tier Purchase Details</h3>
              <div className="space-y-3 text-sm">
                <Row
                  label="User"
                  value={`${getUserDisplay(showDetailModal).name} (${getUserDisplay(showDetailModal).email})`}
                />
                <Row
                  label="Tier"
                  value={`${TIER_NAMES[showDetailModal.tier_code] || showDetailModal.tier_code} (Level ${showDetailModal.tier_level})`}
                />
                <Row
                  label="Price"
                  value={`$${Number(showDetailModal.price_amount).toLocaleString()}`}
                  bold
                />
                <Row
                  label="Bonus (40%)"
                  value={`+$${Number(showDetailModal.bonus_amount).toLocaleString()}`}
                />
                {showDetailModal.payment_asset && (
                  <Row label="Payment Asset" value={showDetailModal.payment_asset} />
                )}
                {showDetailModal.payment_network && (
                  <Row label="Network" value={showDetailModal.payment_network} />
                )}
                {showDetailModal.tx_hash && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400 shrink-0">TX Hash</span>
                    <span className="text-cream font-mono text-xs break-all text-right">
                      {showDetailModal.tx_hash}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      STATUS_STYLES[showDetailModal.status] || ''
                    }`}
                  >
                    {showDetailModal.status}
                  </span>
                </div>
                <Row label="Submitted" value={new Date(showDetailModal.created_at).toLocaleString()} />
                {showDetailModal.approved_at && (
                  <Row label="Approved" value={new Date(showDetailModal.approved_at).toLocaleString()} />
                )}
                {showDetailModal.rejected_reason && (
                  <Row label="Rejection Reason" value={showDetailModal.rejected_reason} loss />
                )}

                {/* ── User Deposit Wallet Section ── */}
                {showDetailModal.users && (
                  <div className="p-3 bg-white/5 rounded-xl mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5" />
                        User Deposit Wallet
                      </p>
                      {!editingDepositAddress ? (
                        <button
                          onClick={() => {
                            setEditingDepositAddress(true);
                            setNewDepositAddress(showDetailModal.users?.deposit_address || '');
                            setDepositNote('');
                          }}
                          className="p-1.5 bg-gold/10 text-gold rounded-lg hover:bg-gold/20 transition-all"
                          title="Edit Deposit Address"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateDepositAddress(showDetailModal.user_id)}
                            disabled={actionLoading}
                            className="p-1.5 bg-profit/20 text-profit rounded-lg hover:bg-profit/30"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingDepositAddress(false);
                              setNewDepositAddress('');
                              setDepositNote('');
                            }}
                            className="p-1.5 bg-loss/20 text-loss rounded-lg hover:bg-loss/30"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    {!editingDepositAddress ? (
                      <p className="text-sm text-cream font-mono break-all">
                        {showDetailModal.users.deposit_address || 'Not set'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={newDepositAddress}
                          onChange={(e) => setNewDepositAddress(e.target.value)}
                          placeholder="Enter new wallet address"
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-slate-500 focus:outline-none focus:border-gold font-mono text-sm"
                        />
                        <input
                          type="text"
                          value={depositNote}
                          onChange={(e) => setDepositNote(e.target.value)}
                          placeholder="Reason for change (optional)"
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-slate-500 focus:outline-none focus:border-gold text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}

                {showDetailModal.users?.tier_active !== undefined && (
                  <Row
                    label="Tier Active"
                    value={showDetailModal.users.tier_active ? 'Yes' : 'No'}
                  />
                )}
              </div>

              {/* Action Buttons */}
              {showDetailModal.status === 'pending' && (
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => {
                      handleApprove(showDetailModal.id);
                      setShowDetailModal(null);
                    }}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-profit/20 text-profit font-semibold rounded-xl hover:bg-profit/30 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectModal(showDetailModal.id);
                      setShowDetailModal(null);
                    }}
                    className="flex-1 py-2 bg-loss/20 text-loss font-semibold rounded-xl hover:bg-loss/30"
                  >
                    Reject
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowDetailModal(null)}
                className="w-full mt-3 py-2 bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 transition-colors"
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

function Row({ label, value, bold, loss }: { label: string; value: string; bold?: boolean; loss?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`${loss ? 'text-loss' : 'text-cream'} ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}
