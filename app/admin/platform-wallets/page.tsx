'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Plus, Edit, Trash2, Save, X, RefreshCw,
  CheckCircle, AlertCircle, Copy, CreditCard, ArrowDownCircle,
  Users, Search,
} from 'lucide-react';
import { useAdminAuthStore } from '@/lib/admin-store';

interface PlatformWallet {
  id: string; currency: string; network: string; address: string; label: string | null;
  wallet_type: 'tier_checkout' | 'deposit'; is_active: boolean;
  min_amount: number; confirmations: number; created_at: string; updated_at: string;
}
interface UserWallet {
  id: string; user_id: string; currency: string; network: string; address: string;
  label: string | null; is_active: boolean; created_at: string; updated_at: string;
  wallet_type?: 'deposit' | 'tier_checkout' | 'both';
}

function getStorageToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem('swifttrade_admin_token') || window.localStorage.getItem('swifttrade_admin_token') || null;
}
function getAdminToken(admin: any, storeToken?: string | null): string | null {
  if (storeToken) return storeToken;
  return admin?.sessionToken || admin?.session_token || admin?.token || admin?.access_token || getStorageToken();
}

const COMMON_CURRENCIES = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'XRP', 'DOGE', 'LTC', 'TRX'];
const COMMON_NETWORKS = ['BTC', 'ERC20', 'TRC20', 'BEP20', 'SOL', 'MATIC', 'ARB', 'BASE', 'LTC'];

type Tab = 'tier_checkout' | 'deposit' | 'per_user';

export default function AdminPlatformWalletsPage() {
  const store: any = useAdminAuthStore();
  const admin = store?.admin ?? null;
  const storeToken: string | null = store?.sessionToken ?? store?.token ?? null;
  const token = useMemo(() => getAdminToken(admin, storeToken), [admin, storeToken]);

  const apiFetch = useCallback(async (path: string, init?: RequestInit) => {
    if (!token) throw new Error('Missing admin token');
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, ...(init?.headers as any) };
    if (init?.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(path, { ...init, headers, cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
    return json;
  }, [token]);

  const [wallets, setWallets] = useState<PlatformWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tab, setTab] = useState<Tab>('tier_checkout');
  const [showForm, setShowForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState<PlatformWallet | null>(null);
  const [formCurrency, setFormCurrency] = useState('');
  const [formNetwork, setFormNetwork] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formMinAmount, setFormMinAmount] = useState('0');
  const [formConfirmations, setFormConfirmations] = useState('1');
  const [saving, setSaving] = useState(false);

  // Per-user wallet state
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [userWallets, setUserWallets] = useState<UserWallet[]>([]);
  const [uwLoading, setUwLoading] = useState(false);
  const [uwForm, setUwForm] = useState(false);
  const [uwCurrency, setUwCurrency] = useState('');
  const [uwNetwork, setUwNetwork] = useState('');
  const [uwAddress, setUwAddress] = useState('');
  const [uwLabel, setUwLabel] = useState('');
  const [uwWalletType, setUwWalletType] = useState<'deposit'|'tier_checkout'|'both'>('both');

  const fetchWallets = useCallback(async () => {
    try {
      setLoading(true);
      const json = await apiFetch('/api/admin/platform-wallets');
      setWallets(json.wallets || []);
    } catch (e: any) { setMessage({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  }, [apiFetch]);

  useEffect(() => { if (token) fetchWallets(); }, [fetchWallets, token]);

  const filtered = wallets.filter((w) => w.wallet_type === (tab === 'per_user' ? 'deposit' : tab));

  const openForm = (w?: PlatformWallet) => {
    if (w) {
      setEditingWallet(w); setFormCurrency(w.currency); setFormNetwork(w.network);
      setFormAddress(w.address); setFormLabel(w.label || ''); setFormActive(w.is_active);
      setFormMinAmount(String(w.min_amount || 0)); setFormConfirmations(String(w.confirmations || 1));
    } else {
      setEditingWallet(null); setFormCurrency(''); setFormNetwork('');
      setFormAddress(''); setFormLabel(''); setFormActive(true); setFormMinAmount('0'); setFormConfirmations('1');
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formCurrency || !formNetwork || !formAddress) { setMessage({ type: 'error', text: 'Currency, network, and address required' }); return; }
    try {
      setSaving(true);
      await apiFetch('/api/admin/platform-wallets', {
        method: 'POST',
        body: JSON.stringify({
          id: editingWallet?.id, currency: formCurrency, network: formNetwork, address: formAddress,
          label: formLabel || null, wallet_type: tab === 'per_user' ? 'deposit' : tab,
          is_active: formActive, min_amount: Number(formMinAmount) || 0, confirmations: Number(formConfirmations) || 1,
        }),
      });
      setMessage({ type: 'success', text: editingWallet ? 'Wallet updated' : 'Wallet created' });
      setShowForm(false); fetchWallets();
    } catch (e: any) { setMessage({ type: 'error', text: e.message }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this wallet address?')) return;
    try { await apiFetch(`/api/admin/platform-wallets?id=${id}`, { method: 'DELETE' }); setMessage({ type: 'success', text: 'Wallet deleted' }); fetchWallets(); }
    catch (e: any) { setMessage({ type: 'error', text: e.message }); }
  };

  // Per-user wallet functions
  const searchUsers = async () => {
    if (!userSearch.trim()) return;
    try {
      const res = await apiFetch('/api/admin/users');
      const all: any[] = res.users || [];
      const q = userSearch.toLowerCase();
      setUserResults(all.filter((u: any) =>
        (u.email || '').toLowerCase().includes(q) || (u.first_name || '').toLowerCase().includes(q)
      ).slice(0, 10));
    } catch (e: any) { setMessage({ type: 'error', text: e.message }); }
  };

  const selectUser = async (user: any) => {
    setSelectedUserId(user.id);
    setSelectedUserEmail(user.email);
    setUserResults([]);
    setUserSearch('');
    setUwLoading(true);
    try {
      const res = await apiFetch(`/api/admin/users/${user.id}/deposit-wallets`);
      setUserWallets(res.wallets || []);
    } catch { setUserWallets([]); }
    finally { setUwLoading(false); }
  };

  const addUserWallet = async () => {
    if (!selectedUserId || !uwCurrency || !uwNetwork || !uwAddress) return;
    try {
      setSaving(true);
      await apiFetch(`/api/admin/users/${selectedUserId}/deposit-wallets`, {
        method: 'POST',
        body: JSON.stringify({ currency: uwCurrency.toUpperCase(), network: uwNetwork.toUpperCase(), address: uwAddress.trim(), label: uwLabel || null, wallet_type: uwWalletType }),
      });
      setMessage({ type: 'success', text: 'User wallet saved' }); setUwForm(false);
      setUwCurrency(''); setUwNetwork(''); setUwAddress(''); setUwLabel(''); setUwWalletType('both');
      await selectUser({ id: selectedUserId, email: selectedUserEmail });
    } catch (e: any) { setMessage({ type: 'error', text: e.message }); }
    finally { setSaving(false); }
  };

  const deleteUserWallet = async (walletId: string) => {
    if (!selectedUserId || !confirm('Delete this wallet?')) return;
    try {
      await apiFetch(`/api/admin/users/${selectedUserId}/deposit-wallets?wallet_id=${walletId}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Deleted' });
      await selectUser({ id: selectedUserId, email: selectedUserEmail });
    } catch (e: any) { setMessage({ type: 'error', text: e.message }); }
  };

  const copyText = (text: string) => { navigator.clipboard.writeText(text); setMessage({ type: 'success', text: 'Copied!' }); setTimeout(() => setMessage(null), 1500); };
  const shortAddr = (addr: string) => addr.length > 24 ? `${addr.slice(0, 12)}...${addr.slice(-8)}` : addr;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-cream">Platform Wallets</h1>
          <p className="text-slate-400 mt-1">Manage checkout, deposit & per-user wallet addresses</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchWallets()} className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-cream"><RefreshCw className="w-5 h-5" /></button>
          {tab !== 'per_user' && (
            <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2 bg-loss text-white rounded-xl font-medium hover:bg-loss/80"><Plus className="w-4 h-4" /> Add Wallet</button>
          )}
        </div>
      </div>

      <AnimatePresence>{message && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-3 rounded-xl flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </motion.div>
      )}</AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab('tier_checkout')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'tier_checkout' ? 'bg-loss/20 text-loss' : 'bg-white/5 text-slate-400 hover:text-cream'}`}>
          <CreditCard className="w-4 h-4" /> Tier Checkout
        </button>
        <button onClick={() => setTab('deposit')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'deposit' ? 'bg-electric/20 text-electric' : 'bg-white/5 text-slate-400 hover:text-cream'}`}>
          <ArrowDownCircle className="w-4 h-4" /> Deposit Wallets
        </button>
        <button onClick={() => setTab('per_user')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'per_user' ? 'bg-gold/20 text-gold' : 'bg-white/5 text-slate-400 hover:text-cream'}`}>
          <Users className="w-4 h-4" /> Per-User Wallets
        </button>
      </div>

      {/* PER-USER WALLET TAB */}
      {tab === 'per_user' ? (
        <div className="space-y-4">
          {/* User search */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                placeholder="Search user by email or name..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-slate-500 focus:outline-none focus:border-gold/50 text-sm"
              />
              {userResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-obsidian border border-white/10 rounded-xl overflow-hidden z-20 max-h-60 overflow-y-auto">
                  {userResults.map((u: any) => (
                    <button key={u.id} onClick={() => selectUser(u)} className="w-full px-4 py-3 text-left hover:bg-white/5 text-sm">
                      <span className="text-cream">{u.email}</span>
                      <span className="text-xs text-slate-500 ml-2">{u.first_name} {u.last_name}</span>
                      <span className="text-xs text-slate-600 ml-2">bal: ${Number(u.balance_available || 0).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={searchUsers} className="px-4 py-3 bg-gold text-void rounded-xl font-medium hover:bg-gold/80"><Search className="w-4 h-4" /></button>
          </div>

          {selectedUserId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gold/5 border border-gold/20 rounded-xl">
                <div>
                  <span className="text-sm text-cream font-medium">{selectedUserEmail}</span>
                  <span className="text-xs text-slate-500 ml-2">({selectedUserId.slice(0, 8)}...)</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setUwForm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-gold/20 text-gold rounded-lg text-xs font-medium"><Plus className="w-3 h-3" /> Add Wallet</button>
                  <button onClick={() => { setSelectedUserId(null); setUserWallets([]); }} className="p-1.5 bg-white/5 text-slate-400 rounded-lg"><X className="w-4 h-4" /></button>
                </div>
              </div>

              {uwLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" /></div>
              ) : userWallets.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-xl border border-white/5">
                  <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No wallets for this user yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userWallets.map((w) => (
                    <div key={w.id} className="bg-white/5 rounded-xl border border-white/10 p-4 flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-gold/20 to-electric/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-cream">{w.currency}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-cream font-medium text-sm">{w.currency}</span>
                          <span className="text-xs px-2 py-0.5 bg-white/5 rounded text-slate-400">{w.network}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            w.wallet_type === 'deposit' ? 'bg-electric/10 text-electric' :
                            w.wallet_type === 'tier_checkout' ? 'bg-loss/10 text-loss' :
                            'bg-gold/10 text-gold'
                          }`}>{
                            w.wallet_type === 'deposit' ? 'Deposit' :
                            w.wallet_type === 'tier_checkout' ? 'Tier Purchase' :
                            'Deposit + Tier'
                          }</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-slate-300 truncate">{w.address}</span>
                          <button onClick={() => copyText(w.address)} className="text-slate-500 hover:text-cream flex-shrink-0"><Copy className="w-3 h-3" /></button>
                        </div>
                        {w.label && <span className="text-xs text-slate-500 block mt-0.5">{w.label}</span>}
                      </div>
                      <button onClick={() => deleteUserWallet(w.id)} className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-loss"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add user wallet form */}
              <AnimatePresence>{uwForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-3">
                    <h4 className="text-sm font-medium text-cream">Add Wallet for {selectedUserEmail}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Currency</label>
                        <select value={uwCurrency} onChange={(e) => setUwCurrency(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm">
                          <option value="">Select...</option>
                          {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Network</label>
                        <select value={uwNetwork} onChange={(e) => setUwNetwork(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm">
                          <option value="">Select...</option>
                          {COMMON_NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Wallet Address</label>
                      <input type="text" value={uwAddress} onChange={(e) => setUwAddress(e.target.value)} placeholder="Paste address..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Label (optional)</label>
                        <input type="text" value={uwLabel} onChange={(e) => setUwLabel(e.target.value)} placeholder="e.g. Main BTC wallet" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Used for</label>
                        <select value={uwWalletType} onChange={(e) => setUwWalletType(e.target.value as any)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm">
                          <option value="both">Deposit + Tier Purchase</option>
                          <option value="deposit">Deposit only</option>
                          <option value="tier_checkout">Tier Purchase only</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setUwForm(false)} className="px-4 py-2 bg-white/5 text-slate-400 rounded-xl text-sm">Cancel</button>
                      <button onClick={addUserWallet} disabled={saving || !uwCurrency || !uwNetwork || !uwAddress} className="px-4 py-2 bg-gold text-void font-medium rounded-xl text-sm disabled:opacity-50">
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Wallet'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}</AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Search for a user above to manage their crypto wallets</p>
            </div>
          )}
        </div>
      ) : (
        /* PLATFORM WALLET TABS (tier_checkout / deposit) */
        <>
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-loss border-t-transparent rounded-full" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5">
              <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No {tab === 'tier_checkout' ? 'checkout' : 'deposit'} wallets configured yet.</p>
              <button onClick={() => openForm()} className="mt-3 text-loss hover:underline text-sm">+ Add your first wallet</button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((w) => (
                <div key={w.id} className={`bg-white/5 rounded-xl border p-4 flex items-center gap-4 ${w.is_active ? 'border-white/10' : 'border-loss/20 opacity-60'}`}>
                  <div className="w-12 h-12 bg-gradient-to-br from-loss/20 to-electric/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-cream">{w.currency}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-cream font-medium">{w.currency}</span>
                      <span className="text-xs px-2 py-0.5 bg-white/5 rounded text-slate-400">{w.network}</span>
                      {!w.is_active && <span className="text-xs px-2 py-0.5 bg-loss/10 text-loss rounded">Inactive</span>}
                    </div>
                    {w.address ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-slate-300" title={w.address}>{shortAddr(w.address)}</span>
                        <button onClick={() => copyText(w.address)} className="text-slate-500 hover:text-cream"><Copy className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <span className="text-xs text-loss mt-1">No address set — click edit to add</span>
                    )}
                    {w.label && <span className="text-xs text-slate-500 mt-1 block">{w.label}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openForm(w)} className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-cream"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(w.id)} className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-loss"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Platform Wallet Form Modal */}
      <AnimatePresence>{showForm && (<>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="fixed inset-0 bg-void/80 backdrop-blur-sm z-40" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-obsidian border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-cream">{editingWallet ? 'Edit' : 'Add'} {tab === 'tier_checkout' ? 'Checkout' : 'Deposit'} Wallet</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-cream"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Currency</label>
                <select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm">
                  <option value="">Select...</option>{COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Network</label>
                <select value={formNetwork} onChange={(e) => setFormNetwork(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm">
                  <option value="">Select...</option>{COMMON_NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Wallet Address</label>
              <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Paste wallet address..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Label (optional)</label>
              <input type="text" value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder="E.g., Main cold wallet" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="rounded border-white/20" />
              <span className="text-sm text-cream">Active (visible to users)</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/5 text-slate-400 rounded-xl text-sm hover:text-cream">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-loss text-white rounded-xl text-sm font-medium hover:bg-loss/80 disabled:opacity-50">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingWallet ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </motion.div>
      </>)}</AnimatePresence>
    </div>
  );
}
