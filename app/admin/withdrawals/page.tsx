'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Send,
} from 'lucide-react';
import { useAdminAuthStore } from '@/lib/admin-store';

type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'paid';

interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: number;
  asset: string;
  network: string | null;
  destination_address: string;
  destination_tag: string | null;
  note: string | null;
  status: WithdrawalStatus;
  admin_note: string | null;
  rejection_reason: string | null;
  tx_hash: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    balance?: number | null;
  } | null;
}

function getStorageToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    window.sessionStorage.getItem('swifttrade_admin_token') ||
    window.localStorage.getItem('swifttrade_admin_token') ||
    null
  );
}

function getAdminToken(admin: any, storeToken?: string | null): string | null {
  if (storeToken) return storeToken;
  return admin?.sessionToken || admin?.session_token || admin?.token || admin?.access_token || getStorageToken();
}

export default function AdminWithdrawalsPage() {
  const store: any = useAdminAuthStore();
  const admin = store?.admin ?? null;
  const storeToken: string | null = store?.sessionToken ?? store?.token ?? null;
  const token = useMemo(() => getAdminToken(admin, storeToken), [admin, storeToken]);

  const apiFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!token) throw new Error('Missing admin token');
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        ...(init?.headers as any),
      };
      if (init?.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

      const res = await fetch(path, {
        ...init,
        headers,
        cache: 'no-store',
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      return json;
    },
    [token]
  );

  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | WithdrawalStatus>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<WithdrawalRow | null>(null);

  const [adminNote, setAdminNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [txHash, setTxHash] = useState('');

  const fetchWithdrawals = useCallback(async () => {
    try {
      setLoading(true);
      const q = new URLSearchParams();
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (search.trim()) q.set('q', search.trim());

      const json = await apiFetch(`/api/admin/withdrawals?${q.toString()}`);
      setWithdrawals(json.withdrawals || []);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, statusFilter, search]);

  useEffect(() => {
    if (token) fetchWithdrawals();
  }, [fetchWithdrawals, token]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copied!' });
    setTimeout(() => setMessage(null), 1500);
  };

  const shortAddr = (addr: string) =>
    addr.length > 24 ? `${addr.slice(0, 12)}...${addr.slice(-8)}` : addr;

  const openRow = (row: WithdrawalRow) => {
    setSelected(row);
    setAdminNote(row.admin_note || '');
    setRejectionReason(row.rejection_reason || '');
    setTxHash(row.tx_hash || '');
  };

  const runAction = async (action: 'approve' | 'reject' | 'paid') => {
    if (!selected) return;

    if (action === 'reject' && !rejectionReason.trim()) {
      setMessage({ type: 'error', text: 'Add rejection reason first' });
      return;
    }

    if (action === 'paid' && !txHash.trim()) {
      setMessage({ type: 'error', text: 'Add transaction hash first' });
      return;
    }

    try {
      setSavingId(selected.id);

      await apiFetch('/api/admin/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          id: selected.id,
          action,
          admin_note: adminNote || null,
          rejection_reason: rejectionReason || null,
          tx_hash: txHash || null,
        }),
      });

      setMessage({
        type: 'success',
        text:
          action === 'approve'
            ? 'Withdrawal approved'
            : action === 'reject'
              ? 'Withdrawal rejected'
              : 'Withdrawal marked paid',
      });

      setSelected(null);
      fetchWithdrawals();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-cream">Withdrawal Requests</h1>
          <p className="text-slate-400 mt-1">Approve, reject, and mark payouts as completed</p>
        </div>

        <button
          onClick={fetchWithdrawals}
          className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-cream"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
              message.type === 'success' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected', 'paid'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === status
                  ? status === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : status === 'approved'
                      ? 'bg-electric/20 text-electric'
                      : status === 'rejected'
                        ? 'bg-loss/20 text-loss'
                        : status === 'paid'
                          ? 'bg-profit/20 text-profit'
                          : 'bg-white/10 text-cream'
                  : 'bg-white/5 text-slate-400 hover:text-cream'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="md:ml-auto relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchWithdrawals()}
            placeholder="Search email, asset, address..."
            className="w-full px-4 py-3 pr-10 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-slate-500 focus:outline-none focus:border-gold/50 text-sm"
          />
          <button
            onClick={fetchWithdrawals}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cream"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" />
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No withdrawal requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w) => (
            <button
              key={w.id}
              onClick={() => openRow(w)}
              className="w-full text-left bg-white/5 rounded-xl border border-white/10 p-4 hover:border-gold/30 transition-all"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    w.status === 'paid'
                      ? 'bg-profit/10'
                      : w.status === 'approved'
                        ? 'bg-electric/10'
                        : w.status === 'rejected'
                          ? 'bg-loss/10'
                          : 'bg-yellow-500/10'
                  }`}
                >
                  {w.status === 'paid' ? (
                    <Send className="w-5 h-5 text-profit" />
                  ) : w.status === 'approved' ? (
                    <CheckCircle2 className="w-5 h-5 text-electric" />
                  ) : w.status === 'rejected' ? (
                    <XCircle className="w-5 h-5 text-loss" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-cream font-medium">
                      ${Number(w.amount || 0).toLocaleString()}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-white/5 rounded text-slate-400">
                      {w.asset}
                    </span>
                    {w.network && (
                      <span className="text-xs px-2 py-0.5 bg-white/5 rounded text-slate-400">
                        {w.network}
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        w.status === 'paid'
                          ? 'bg-profit/10 text-profit'
                          : w.status === 'approved'
                            ? 'bg-electric/10 text-electric'
                            : w.status === 'rejected'
                              ? 'bg-loss/10 text-loss'
                              : 'bg-yellow-500/10 text-yellow-400'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>

                  <div className="mt-1 text-sm text-slate-300">
                    {w.user?.email || 'Unknown user'}
                    {w.user?.first_name || w.user?.last_name ? (
                      <span className="text-slate-500 ml-2">
                        {w.user?.first_name || ''} {w.user?.last_name || ''}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">
                      {shortAddr(w.destination_address)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyText(w.destination_address);
                      }}
                      className="text-slate-500 hover:text-cream"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">
                    {new Date(w.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Bal: ${Number(w.user?.balance || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 bg-void/80 backdrop-blur-sm z-40"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-obsidian border border-white/10 rounded-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-cream">Withdrawal Review</h3>
                  <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-cream">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">User</p>
                    <p className="text-sm text-cream">{selected.user?.email || selected.user_id}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Amount</p>
                    <p className="text-sm text-cream">
                      ${Number(selected.amount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Asset</p>
                    <p className="text-sm text-cream">
                      {selected.asset} {selected.network ? `• ${selected.network}` : ''}
                    </p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Status</p>
                    <p className="text-sm text-cream capitalize">{selected.status}</p>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Destination Address</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-gold font-mono break-all flex-1">
                      {selected.destination_address}
                    </code>
                    <button onClick={() => copyText(selected.destination_address)}>
                      <Copy className="w-4 h-4 text-slate-400 hover:text-cream" />
                    </button>
                  </div>
                </div>

                {selected.destination_tag && (
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Memo / Tag</p>
                    <p className="text-sm text-cream">{selected.destination_tag}</p>
                  </div>
                )}

                {selected.note && (
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">User Note</p>
                    <p className="text-sm text-cream">{selected.note}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Admin Note</label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm"
                    placeholder="Internal note..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Rejection Reason</label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm"
                    placeholder="Required only when rejecting"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Transaction Hash</label>
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm font-mono"
                    placeholder="Required when marking paid"
                  />
                </div>

                {selected.rejection_reason && (
                  <div className="p-3 bg-loss/10 border border-loss/20 rounded-xl">
                    <p className="text-xs text-loss">{selected.rejection_reason}</p>
                  </div>
                )}

                {selected.tx_hash && (
                  <div className="p-3 bg-profit/10 border border-profit/20 rounded-xl">
                    <p className="text-xs text-profit font-mono break-all">{selected.tx_hash}</p>
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  {selected.status === 'pending' && (
                    <>
                      <button
                        onClick={() => runAction('reject')}
                        disabled={savingId === selected.id}
                        className="px-4 py-2 bg-loss text-white rounded-xl text-sm font-medium hover:bg-loss/80 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => runAction('approve')}
                        disabled={savingId === selected.id}
                        className="px-4 py-2 bg-electric text-void rounded-xl text-sm font-medium hover:bg-electric/80 disabled:opacity-50"
                      >
                        {savingId === selected.id ? 'Saving...' : 'Approve'}
                      </button>
                    </>
                  )}

                  {selected.status === 'approved' && (
                    <button
                      onClick={() => runAction('paid')}
                      disabled={savingId === selected.id}
                      className="px-4 py-2 bg-profit text-void rounded-xl text-sm font-medium hover:bg-profit/80 disabled:opacity-50"
                    >
                      {savingId === selected.id ? 'Saving...' : 'Mark Paid'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}