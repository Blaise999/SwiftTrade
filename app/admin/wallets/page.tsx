'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Search,
  RefreshCw,
  Edit,
  Save,
  X,
  Copy,
  Shield,
  CheckCircle,
  AlertCircle,
  Eye,
  CreditCard,
  ArrowDownCircle,
} from 'lucide-react';
import { useAdminAuthStore } from '@/lib/admin-store';

interface UserWallet {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  tier_level: number;
  tier_code: string;
  tier_active: boolean;
  deposit_address: string | null;
  deposit_network: string | null;
  tier_purchase_wallet: string | null;
  tier_purchase_network: string | null;
  balance_available: number;
  balance_bonus: number;
}

// ─────────────────────────────────────────────
function getStorageToken(): string | null {
  if (typeof window === 'undefined') return null;
  const ss = window.sessionStorage.getItem('swifttrade_admin_token') || window.sessionStorage.getItem('admin_token');
  if (ss) return ss;
  const ls = window.localStorage.getItem('swifttrade_admin_token') || window.localStorage.getItem('admin_token');
  if (ls) { try { window.sessionStorage.setItem('swifttrade_admin_token', ls); } catch {} return ls; }
  return null;
}
function getAdminToken(admin: any, storeToken?: string | null): string | null {
  if (storeToken) return storeToken;
  return admin?.sessionToken || admin?.session_token || admin?.token || admin?.access_token || admin?.accessToken || getStorageToken();
}

const TIER_NAMES: Record<string, string> = {
  basic: 'Basic', starter: 'Starter', trader: 'Trader', professional: 'Professional', elite: 'Elite',
};

export default function AdminWalletsPage() {
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
      const headers: Record<string, string> = { Authorization: `Bearer ${token}`, ...(init?.headers as any) };
      if (init?.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
      const res = await fetch(path, { ...init, headers, cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      return json;
    },
    [token]
  );

  const [users, setUsers] = useState<UserWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  // Edit states
  const [editingUser, setEditingUser] = useState<UserWallet | null>(null);
  const [editDepositAddress, setEditDepositAddress] = useState('');
  const [editDepositNetwork, setEditDepositNetwork] = useState('');
  const [editTierWallet, setEditTierWallet] = useState('');
  const [editTierNetwork, setEditTierNetwork] = useState('');
  const [editNote, setEditNote] = useState('');

  // Per-currency deposit wallets
  const [perCurrencyWallets, setPerCurrencyWallets] = useState<Array<{ id: string; currency: string; network: string; address: string; label: string | null }>>([]);
  const [newCurrency, setNewCurrency] = useState('');
  const [newNetwork, setNewNetwork] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [loadingWallets, setLoadingWallets] = useState(false);

  const CURRENCY_PRESETS = [
    { currency: 'BTC', network: 'BTC', label: 'Bitcoin' },
    { currency: 'ETH', network: 'ERC20', label: 'Ethereum' },
    { currency: 'USDT', network: 'TRC20', label: 'USDT (Tron)' },
    { currency: 'USDT', network: 'ERC20', label: 'USDT (ERC20)' },
    { currency: 'USDC', network: 'ERC20', label: 'USDC (ERC20)' },
    { currency: 'LTC', network: 'LTC', label: 'Litecoin' },
    { currency: 'SOL', network: 'SOL', label: 'Solana' },
  ];

  // Quick-edit inline states
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditField, setInlineEditField] = useState<'deposit' | 'tier' | null>(null);
  const [inlineValue, setInlineValue] = useState('');

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const json = await apiFetch('/api/admin/users');
      if (Array.isArray(json?.users)) {
        setUsers(json.users as UserWallet[]);
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, token]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter((u) =>
      u.email.toLowerCase().includes(q) ||
      `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(q) ||
      (u.deposit_address || '').toLowerCase().includes(q) ||
      (u.tier_purchase_wallet || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const loadPerCurrencyWallets = useCallback(async (userId: string) => {
    setLoadingWallets(true);
    try {
      const json = await apiFetch(`/api/admin/users/${userId}/deposit-wallets`);
      setPerCurrencyWallets(json.wallets || []);
    } catch {
      setPerCurrencyWallets([]);
    } finally {
      setLoadingWallets(false);
    }
  }, [apiFetch]);

  const handleAddPerCurrencyWallet = async () => {
    if (!editingUser || !newCurrency || !newNetwork || !newAddress) return;
    setProcessing(true);
    try {
      await apiFetch(`/api/admin/users/${editingUser.id}/deposit-wallets`, {
        method: 'POST',
        body: JSON.stringify({ currency: newCurrency, network: newNetwork, address: newAddress, label: newLabel || null }),
      });
      setMessage({ type: 'success', text: `${newCurrency} (${newNetwork}) wallet saved` });
      setNewCurrency(''); setNewNetwork(''); setNewAddress(''); setNewLabel('');
      await loadPerCurrencyWallets(editingUser.id);
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to save wallet' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeletePerCurrencyWallet = async (walletId: string) => {
    if (!editingUser || !confirm('Remove this wallet address?')) return;
    setProcessing(true);
    try {
      await apiFetch(`/api/admin/users/${editingUser.id}/deposit-wallets?wallet_id=${walletId}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Wallet removed' });
      await loadPerCurrencyWallets(editingUser.id);
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to delete wallet' });
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (u: UserWallet) => {
    setEditingUser(u);
    setEditDepositAddress(u.deposit_address || '');
    setEditDepositNetwork(u.deposit_network || '');
    setEditTierWallet(u.tier_purchase_wallet || '');
    setEditTierNetwork(u.tier_purchase_network || '');
    setEditNote('');
    setNewCurrency(''); setNewNetwork(''); setNewAddress(''); setNewLabel('');
    loadPerCurrencyWallets(u.id);
  };

  const handleSaveWallets = async () => {
    if (!editingUser) return;
    setProcessing(true);
    setMessage(null);
    try {
      const body: any = { note: editNote || 'Admin wallet update' };

      // Only send fields that actually changed
      if (editDepositAddress !== (editingUser.deposit_address || '')) {
        body.deposit_address = editDepositAddress;
        if (editDepositNetwork) body.deposit_network = editDepositNetwork;
      }
      if (editTierWallet !== (editingUser.tier_purchase_wallet || '')) {
        body.tier_purchase_wallet = editTierWallet;
        if (editTierNetwork) body.tier_purchase_network = editTierNetwork;
      }

      if (!body.deposit_address && !body.tier_purchase_wallet) {
        setMessage({ type: 'error', text: 'No changes to save' });
        setProcessing(false);
        return;
      }

      await apiFetch(`/api/admin/users/${editingUser.id}/wallets`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      setMessage({ type: 'success', text: `Wallets updated for ${editingUser.email}` });
      setEditingUser(null);
      await loadUsers();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to update wallets' });
    } finally {
      setProcessing(false);
    }
  };

  const handleInlineSave = async (userId: string) => {
    if (!inlineValue.trim() || !inlineEditField) return;
    setProcessing(true);
    setMessage(null);
    try {
      const body: any = { note: 'Quick wallet update' };
      if (inlineEditField === 'deposit') body.deposit_address = inlineValue;
      else body.tier_purchase_wallet = inlineValue;

      await apiFetch(`/api/admin/users/${userId}/wallets`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      setMessage({ type: 'success', text: 'Wallet updated' });
      setInlineEditId(null);
      setInlineEditField(null);
      setInlineValue('');
      await loadUsers();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to update' });
    } finally {
      setProcessing(false);
    }
  };

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copied to clipboard' });
    setTimeout(() => setMessage(null), 2000);
  }

  function displayName(u: UserWallet) {
    return `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
  }

  function shortAddr(addr: string | null) {
    if (!addr) return null;
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
  }

  // Stats
  const usersWithDeposit = users.filter((u) => u.deposit_address).length;
  const usersWithTierWallet = users.filter((u) => u.tier_purchase_wallet).length;
  const usersWithoutWallets = users.filter((u) => !u.deposit_address && !u.tier_purchase_wallet).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cream flex items-center gap-2">
            <Wallet className="w-6 h-6 text-gold" />
            User Wallet Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Edit tier purchase wallets and deposit wallets for each user individually.
          </p>
        </div>
        <button
          onClick={loadUsers}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3 rounded-xl text-sm flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-profit/10 border border-profit/20 text-profit'
                : 'bg-loss/10 border border-loss/20 text-loss'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="hover:opacity-70">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-obsidian rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-electric/20 rounded-lg"><Wallet className="w-5 h-5 text-electric" /></div>
            <div>
              <p className="text-2xl font-bold text-cream">{users.length}</p>
              <p className="text-xs text-slate-500">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-obsidian rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-profit/20 rounded-lg"><ArrowDownCircle className="w-5 h-5 text-profit" /></div>
            <div>
              <p className="text-2xl font-bold text-profit">{usersWithDeposit}</p>
              <p className="text-xs text-slate-500">Deposit Wallets Set</p>
            </div>
          </div>
        </div>
        <div className="bg-obsidian rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/20 rounded-lg"><CreditCard className="w-5 h-5 text-gold" /></div>
            <div>
              <p className="text-2xl font-bold text-gold">{usersWithTierWallet}</p>
              <p className="text-xs text-slate-500">Tier Wallets Set</p>
            </div>
          </div>
        </div>
        <div className="bg-obsidian rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-champagne-400/15 rounded-lg"><AlertCircle className="w-5 h-5 text-champagne-300" /></div>
            <div>
              <p className="text-2xl font-bold text-champagne-300">{usersWithoutWallets}</p>
              <p className="text-xs text-slate-500">No Wallets</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, name, or wallet address..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-cream placeholder:text-slate-600 focus:outline-none focus:border-gold/30"
        />
      </div>

      {/* Users Table */}
      <div className="bg-obsidian rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-slate-500 animate-spin mx-auto mb-2" />
            <p className="text-slate-500">Loading users...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Tier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                    <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> Tier Purchase Wallet</span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                    <span className="flex items-center gap-1"><ArrowDownCircle className="w-3.5 h-3.5" /> Deposit Wallet</span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    {/* User */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-cream font-medium">{displayName(u)}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>

                    {/* Tier */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-cream">
                        {TIER_NAMES[u.tier_code] || u.tier_code || 'Basic'}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">(L{u.tier_level || 0})</span>
                      {u.tier_active && <span className="text-profit text-[10px] ml-1">●</span>}
                    </td>

                    {/* Tier Purchase Wallet */}
                    <td className="px-4 py-3">
                      {inlineEditId === u.id && inlineEditField === 'tier' ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            className="flex-1 px-2 py-1.5 bg-white/5 border border-gold/30 rounded-lg text-xs font-mono text-cream focus:outline-none min-w-[180px]"
                            placeholder="Enter wallet address"
                            autoFocus
                          />
                          <button
                            onClick={() => handleInlineSave(u.id)}
                            disabled={processing}
                            className="p-1.5 bg-profit/20 text-profit rounded-lg hover:bg-profit/30 disabled:opacity-50"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setInlineEditId(null); setInlineEditField(null); }}
                            className="p-1.5 bg-loss/20 text-loss rounded-lg hover:bg-loss/30"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : u.tier_purchase_wallet ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono text-cream" title={u.tier_purchase_wallet}>
                            {shortAddr(u.tier_purchase_wallet)}
                          </span>
                          <button
                            onClick={() => copyText(u.tier_purchase_wallet!)}
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            <Copy className="w-3 h-3 text-slate-500" />
                          </button>
                          <button
                            onClick={() => {
                              setInlineEditId(u.id);
                              setInlineEditField('tier');
                              setInlineValue(u.tier_purchase_wallet || '');
                            }}
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            <Edit className="w-3 h-3 text-gold" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setInlineEditId(u.id);
                            setInlineEditField('tier');
                            setInlineValue('');
                          }}
                          className="text-xs text-champagne-300 hover:text-champagne-300 underline underline-offset-2 decoration-dashed"
                        >
                          + Set wallet
                        </button>
                      )}
                    </td>

                    {/* Deposit Wallet */}
                    <td className="px-4 py-3">
                      {inlineEditId === u.id && inlineEditField === 'deposit' ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            className="flex-1 px-2 py-1.5 bg-white/5 border border-gold/30 rounded-lg text-xs font-mono text-cream focus:outline-none min-w-[180px]"
                            placeholder="Enter deposit address"
                            autoFocus
                          />
                          <button
                            onClick={() => handleInlineSave(u.id)}
                            disabled={processing}
                            className="p-1.5 bg-profit/20 text-profit rounded-lg hover:bg-profit/30 disabled:opacity-50"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setInlineEditId(null); setInlineEditField(null); }}
                            className="p-1.5 bg-loss/20 text-loss rounded-lg hover:bg-loss/30"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : u.deposit_address ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono text-cream" title={u.deposit_address}>
                            {shortAddr(u.deposit_address)}
                          </span>
                          <button
                            onClick={() => copyText(u.deposit_address!)}
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            <Copy className="w-3 h-3 text-slate-500" />
                          </button>
                          <button
                            onClick={() => {
                              setInlineEditId(u.id);
                              setInlineEditField('deposit');
                              setInlineValue(u.deposit_address || '');
                            }}
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            <Edit className="w-3 h-3 text-gold" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setInlineEditId(u.id);
                            setInlineEditField('deposit');
                            setInlineValue('');
                          }}
                          className="text-xs text-champagne-300 hover:text-champagne-300 underline underline-offset-2 decoration-dashed"
                        >
                          + Set address
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditModal(u)}
                        className="px-3 py-1.5 bg-gold/10 text-gold text-xs rounded-lg hover:bg-gold/20 transition-colors flex items-center gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit Both
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* Full Edit Modal                             */}
      {/* ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-void/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setEditingUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="bg-charcoal border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-cream">Edit User Wallets</h3>
                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* User Info */}
              <div className="p-3 bg-white/5 rounded-xl mb-5">
                <p className="text-cream font-medium">{displayName(editingUser)}</p>
                <p className="text-sm text-slate-400">{editingUser.email}</p>
                <div className="flex gap-3 mt-2 text-xs text-slate-500">
                  <span>Tier: {TIER_NAMES[editingUser.tier_code] || 'Basic'}</span>
                  <span>Balance: ${Number(editingUser.balance_available || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-5">
                {/* Tier Purchase Wallet Section */}
                <div className="p-4 bg-gold/5 rounded-xl border border-gold/10">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4 text-gold" />
                    <p className="text-sm font-medium text-gold">Tier Purchase Wallet</p>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    This is the wallet address the user should send payment to for tier upgrades.
                  </p>
                  <input
                    type="text"
                    value={editTierWallet}
                    onChange={(e) => setEditTierWallet(e.target.value)}
                    placeholder="Enter tier purchase wallet address"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-slate-600 focus:outline-none focus:border-gold/40 font-mono text-sm"
                  />
                  <input
                    type="text"
                    value={editTierNetwork}
                    onChange={(e) => setEditTierNetwork(e.target.value)}
                    placeholder="Network (e.g., TRC20, ERC20, BTC) — optional"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-slate-600 focus:outline-none focus:border-gold/40 text-sm mt-2"
                  />
                  {editingUser.tier_purchase_wallet && (
                    <p className="text-xs text-slate-600 mt-2">
                      Current: <span className="font-mono">{editingUser.tier_purchase_wallet}</span>
                    </p>
                  )}
                </div>

                {/* Deposit Wallet Section */}
                <div className="p-4 bg-electric/5 rounded-xl border border-electric/10">
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowDownCircle className="w-4 h-4 text-electric" />
                    <p className="text-sm font-medium text-electric">Deposit Wallet</p>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    This is the deposit address assigned to this user for funding their trading account.
                  </p>
                  <input
                    type="text"
                    value={editDepositAddress}
                    onChange={(e) => setEditDepositAddress(e.target.value)}
                    placeholder="Enter deposit wallet address"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-slate-600 focus:outline-none focus:border-electric/40 font-mono text-sm"
                  />
                  <input
                    type="text"
                    value={editDepositNetwork}
                    onChange={(e) => setEditDepositNetwork(e.target.value)}
                    placeholder="Network (e.g., TRC20, ERC20, BTC) — optional"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-slate-600 focus:outline-none focus:border-electric/40 text-sm mt-2"
                  />
                  {editingUser.deposit_address && (
                    <p className="text-xs text-slate-600 mt-2">
                      Current: <span className="font-mono">{editingUser.deposit_address}</span>
                    </p>
                  )}
                </div>

                {/* Per-Currency Deposit Wallets */}
                <div className="p-4 bg-cyan/5 rounded-xl border border-cyan/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-4 h-4 text-cyan" />
                    <p className="text-sm font-medium text-cyan">Per-Currency Deposit Wallets</p>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Set a different deposit address for each cryptocurrency (BTC, ETH, USDT TRC20, etc.).
                  </p>

                  {/* Existing wallets */}
                  {loadingWallets ? (
                    <p className="text-xs text-slate-500 text-center py-3">Loading wallets…</p>
                  ) : perCurrencyWallets.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {perCurrencyWallets.map(w => (
                        <div key={w.id} className="flex items-center gap-2 p-2.5 bg-white/5 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-cream">{w.currency}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-slate-400">{w.network}</span>
                              {w.label && <span className="text-[10px] text-slate-500">({w.label})</span>}
                            </div>
                            <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5" title={w.address}>{w.address}</p>
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(w.address); }}
                            className="p-1.5 hover:bg-white/10 rounded-lg" title="Copy">
                            <Copy className="w-3 h-3 text-slate-500" />
                          </button>
                          <button onClick={() => handleDeletePerCurrencyWallet(w.id)}
                            className="p-1.5 hover:bg-loss/20 rounded-lg text-slate-500 hover:text-loss" title="Remove">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 text-center py-2 mb-3">No per-currency wallets set yet.</p>
                  )}

                  {/* Add new per-currency wallet */}
                  <div className="p-3 bg-white/5 rounded-xl space-y-2">
                    <p className="text-[10px] text-slate-500 font-semibold">Add / Update Wallet</p>
                    {/* Quick presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {CURRENCY_PRESETS.map(p => (
                        <button key={`${p.currency}-${p.network}`}
                          onClick={() => { setNewCurrency(p.currency); setNewNetwork(p.network); setNewLabel(p.label); }}
                          className={`px-2 py-1 text-[10px] rounded-lg transition-all ${
                            newCurrency === p.currency && newNetwork === p.network
                              ? 'bg-cyan/20 text-cyan font-bold'
                              : 'bg-white/5 text-slate-400 hover:bg-white/10'
                          }`}>{p.label}</button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={newCurrency} onChange={e => setNewCurrency(e.target.value.toUpperCase())}
                        placeholder="Currency (e.g. BTC)"
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-cream text-xs focus:outline-none focus:border-cyan/30 placeholder:text-slate-600" />
                      <input type="text" value={newNetwork} onChange={e => setNewNetwork(e.target.value.toUpperCase())}
                        placeholder="Network (e.g. TRC20)"
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-cream text-xs focus:outline-none focus:border-cyan/30 placeholder:text-slate-600" />
                    </div>
                    <input type="text" value={newAddress} onChange={e => setNewAddress(e.target.value)}
                      placeholder="Wallet address"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-cream text-xs font-mono focus:outline-none focus:border-cyan/30 placeholder:text-slate-600" />
                    <div className="flex gap-2">
                      <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                        placeholder="Label (optional)"
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-cream text-xs focus:outline-none focus:border-cyan/30 placeholder:text-slate-600" />
                      <button onClick={handleAddPerCurrencyWallet}
                        disabled={processing || !newCurrency || !newNetwork || !newAddress}
                        className="px-4 py-2 bg-cyan/20 text-cyan text-xs font-semibold rounded-lg hover:bg-cyan/30 disabled:opacity-40 transition-all">
                        {processing ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Note (for audit log)</label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Reason for change..."
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-slate-600 focus:outline-none focus:border-gold/30 text-sm"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-3 bg-white/5 text-slate-400 font-semibold rounded-xl hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveWallets}
                    disabled={processing}
                    className="flex-1 py-3 bg-gold text-void font-semibold rounded-xl hover:bg-gold/90 transition-all disabled:opacity-50"
                  >
                    {processing ? 'Saving…' : 'Save Wallets'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
