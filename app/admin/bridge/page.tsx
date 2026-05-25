'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Search, Loader2, X, CheckCircle2, XCircle,
  Banknote, Smartphone, Building2, Send, Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAdminAuthStore } from '@/lib/admin-store';

type BridgeRequest = {
  id: string;
  user_id: string;
  country_code: string;
  country_name: string;
  local_currency: string;
  local_amount: number;
  target_asset: string;
  target_network?: string;
  estimated_credit_usd?: number;
  fx_rate?: number;
  admin_payment_details?: any;
  admin_responded_at?: string;
  proof_url?: string;
  proof_uploaded_at?: string;
  credited_amount_usd?: number;
  credited_asset?: string;
  status: string;
  admin_notes?: string;
  created_at: string;
  user_email?: string;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  awaiting_admin:        { label: 'Needs reply',     color: 'text-electric-light bg-electric/10 border-electric/30' },
  awaiting_payment:      { label: 'Awaiting pay',    color: 'text-cyan bg-cyan/10 border-cyan/30' },
  awaiting_verification: { label: 'Verify proof',    color: 'text-gold bg-gold/10 border-gold/30' },
  completed:             { label: 'Completed',       color: 'text-profit bg-profit/10 border-profit/30' },
  rejected:              { label: 'Rejected',        color: 'text-loss bg-loss/10 border-loss/30' },
  expired:               { label: 'Expired',         color: 'text-cream/40 bg-white/5 border-white/10' },
  cancelled:             { label: 'Cancelled',       color: 'text-cream/40 bg-white/5 border-white/10' },
};

function fmt(x: any, dp = 2) {
  const n = Number(x);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export default function AdminBridgePage() {
  const [requests, setRequests] = useState<BridgeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('awaiting_admin');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<BridgeRequest | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const adminId =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('swift_admin_id') || localStorage.getItem('admin_id'))) || '';
      const res = await fetch('/api/bridge/admin', {
        headers: { 'x-admin-id': adminId },
        cache: 'no-store',
      });
      if (res.ok) {
        const j = await res.json();
        setRequests(j.requests || []);
      } else {
        // fall back to direct query if admin API isn't available
        const { data } = await supabase
          .from('bridge_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        setRequests((data || []) as any);
      }
    } catch {
      const { data } = await supabase
        .from('bridge_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setRequests((data || []) as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('admin-bridge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bridge_requests' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let rows = requests;
    if (filter !== 'all') rows = rows.filter((r) => r.status === filter);
    const q = search.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (r) =>
          (r.country_name || '').toLowerCase().includes(q) ||
          (r.local_currency || '').toLowerCase().includes(q) ||
          (r.user_email || '').toLowerCase().includes(q) ||
          (r.id || '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [requests, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: requests.length };
    for (const r of requests) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [requests]);

  const FILTERS = [
    { id: 'awaiting_admin',        label: 'Needs reply'   },
    { id: 'awaiting_payment',      label: 'Awaiting pay'  },
    { id: 'awaiting_verification', label: 'Verify proof'  },
    { id: 'completed',             label: 'Completed'     },
    { id: 'rejected',              label: 'Rejected'      },
    { id: 'all',                   label: 'All'           },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric to-cyan flex items-center justify-center shadow-glow-electric">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">SwiftBridge — Concierge Desk</h1>
          <p className="text-xs text-cream/50">Reply, verify proofs, credit balances</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              filter === f.id ? 'bg-electric text-white' : 'bg-white/5 text-cream/60 hover:bg-white/10 hover:text-cream'
            }`}
          >
            {f.label}
            {counts[f.id] > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30">{counts[f.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search user email, country, ID…"
          className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 focus:border-electric/40 rounded-lg outline-none text-sm text-cream"
        />
      </div>

      {/* Table */}
      <div className="bg-charcoal/60 border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-white/10 text-[10px] uppercase tracking-wider text-cream/50">
          <div className="col-span-3">User & Country</div>
          <div className="col-span-2">Local amount</div>
          <div className="col-span-2">Target</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-1 text-right">Action</div>
        </div>
        {loading && (
          <div className="p-10 text-center text-cream/50">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-10 text-center text-cream/50">No requests in this view.</div>
        )}
        {filtered.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelected(r)}
            className="w-full text-left grid grid-cols-12 px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors"
          >
            <div className="col-span-3 flex items-center gap-3 min-w-0">
              <Image
                src={`https://flagcdn.com/w40/${r.country_code.toLowerCase()}.png`}
                alt={r.country_name}
                width={28}
                height={20}
                className="rounded flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="text-cream text-sm font-medium truncate">{r.user_email || r.user_id.slice(0, 8)}</div>
                <div className="text-cream/50 text-[11px]">{r.country_name}</div>
              </div>
            </div>
            <div className="col-span-2 self-center font-mono text-cream text-sm">
              {fmt(r.local_amount, 0)} {r.local_currency}
            </div>
            <div className="col-span-2 self-center text-sm">
              <div className="text-electric-light font-mono">≈ {fmt(r.estimated_credit_usd || 0, 2)} {r.target_asset}</div>
              {r.target_network && <div className="text-cream/40 text-[11px]">{r.target_network}</div>}
            </div>
            <div className="col-span-2 self-center">
              <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border font-bold ${STATUS_LABEL[r.status]?.color}`}>
                {STATUS_LABEL[r.status]?.label || r.status}
              </span>
            </div>
            <div className="col-span-2 self-center text-cream/50 text-xs">
              {new Date(r.created_at).toLocaleString()}
            </div>
            <div className="col-span-1 self-center text-right">
              <Eye className="w-4 h-4 text-cream/40 inline" />
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selected && <AdminBridgeDetail request={selected} onClose={() => setSelected(null)} onRefresh={load} />}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ADMIN DETAIL DRAWER
// ─────────────────────────────────────────────────────────
function AdminBridgeDetail({
  request, onClose, onRefresh,
}: {
  request: BridgeRequest; onClose: () => void; onRefresh: () => void;
}) {
  const { admin } = useAdminAuthStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // RESPOND form
  const [method, setMethod] = useState(request.admin_payment_details?.method || 'Bank transfer');
  const [bank, setBank] = useState(request.admin_payment_details?.bank_name || '');
  const [accName, setAccName] = useState(request.admin_payment_details?.account_name || '');
  const [accNum, setAccNum] = useState(request.admin_payment_details?.account_number || '');
  const [swift, setSwift] = useState(request.admin_payment_details?.swift || '');
  const [iban, setIban] = useState(request.admin_payment_details?.iban || '');
  const [mobileProvider, setMobileProvider] = useState(request.admin_payment_details?.mobile_provider || '');
  const [mobileNumber, setMobileNumber] = useState(request.admin_payment_details?.mobile_number || '');
  const [reference, setReference] = useState(request.admin_payment_details?.reference || `SB-${request.id.slice(0, 8).toUpperCase()}`);
  const [instructions, setInstructions] = useState(request.admin_payment_details?.instructions || '');

  // VERIFY form
  const [creditAmount, setCreditAmount] = useState(String(request.estimated_credit_usd ?? ''));
  const [adminNotes, setAdminNotes] = useState(request.admin_notes || '');
  const [proofSignedUrl, setProofSignedUrl] = useState<string | null>(null);

  // generate signed URL for proof
  useEffect(() => {
    (async () => {
      if (request.proof_url) {
        const { data } = await supabase
          .storage
          .from('bridge-proofs')
          .createSignedUrl(request.proof_url, 600);
        setProofSignedUrl(data?.signedUrl || null);
      }
    })();
  }, [request.proof_url]);

  const post = async (body: any) => {
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/bridge/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(admin?.id ? { 'x-admin-id': admin.id } : {}),
        },
        body: JSON.stringify({ ...body, request_id: request.id }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Action failed');
      onRefresh();
      onClose();
    } catch (x: any) {
      setErr(x.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const respond = () =>
    post({
      action: 'respond',
      payment_details: {
        method,
        bank_name: bank || undefined,
        account_name: accName || undefined,
        account_number: accNum || undefined,
        swift: swift || undefined,
        iban: iban || undefined,
        mobile_provider: mobileProvider || undefined,
        mobile_number: mobileNumber || undefined,
        reference: reference || undefined,
        instructions: instructions || undefined,
      },
    });

  const approve = () =>
    post({
      action: 'approve',
      credited_amount_usd: parseFloat(creditAmount) || request.estimated_credit_usd || 0,
      credited_asset: request.target_asset,
      admin_notes: adminNotes || undefined,
    });

  const reject = () => post({ action: 'reject', admin_notes: adminNotes || 'Rejected by admin' });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-void/80 backdrop-blur flex items-stretch justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 80, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-charcoal border-l border-white/10 overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-charcoal/95 backdrop-blur p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-cream">Manage request</h3>
            <p className="text-[11px] text-cream/50 font-mono mt-0.5">#{request.id.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="text-cream/60 hover:text-cream"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Summary */}
          <div className="bg-obsidian border border-white/10 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-cream/60">User</span><span className="text-cream">{request.user_email || request.user_id.slice(0, 8)}</span></div>
            <div className="flex justify-between"><span className="text-cream/60">Country</span><span className="text-cream">{request.country_name}</span></div>
            <div className="flex justify-between"><span className="text-cream/60">User pays</span><span className="text-cream font-mono">{fmt(request.local_amount, 0)} {request.local_currency}</span></div>
            <div className="flex justify-between"><span className="text-cream/60">User receives</span><span className="text-electric-light font-mono">≈ {fmt(request.estimated_credit_usd || 0, 2)} {request.target_asset}</span></div>
            {request.fx_rate && <div className="flex justify-between"><span className="text-cream/60">FX rate</span><span className="text-cream font-mono">1 USD = {fmt(request.fx_rate, 4)} {request.local_currency}</span></div>}
          </div>

          {/* RESPOND (awaiting_admin) */}
          {request.status === 'awaiting_admin' && (
            <div className="bg-electric/5 border border-electric/30 rounded-xl p-5 space-y-3">
              <h4 className="font-display font-semibold text-cream flex items-center gap-2">
                <Send className="w-4 h-4 text-electric" /> Reply with payout details
              </h4>

              <div>
                <label className="text-[10px] uppercase text-cream/50">Method</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-cream text-sm outline-none">
                  <option className="bg-charcoal">Bank transfer</option>
                  <option className="bg-charcoal">Mobile money</option>
                  <option className="bg-charcoal">E-wallet</option>
                  <option className="bg-charcoal">Cash deposit</option>
                  <option className="bg-charcoal">UPI</option>
                  <option className="bg-charcoal">PIX</option>
                </select>
              </div>

              <Field label="Bank name"      value={bank}    set={setBank} />
              <Field label="Account name"   value={accName} set={setAccName} />
              <Field label="Account number" value={accNum}  set={setAccNum} mono />
              <Field label="SWIFT"          value={swift}   set={setSwift}  mono />
              <Field label="IBAN"           value={iban}    set={setIban}   mono />
              <Field label="Mobile provider" value={mobileProvider} set={setMobileProvider} />
              <Field label="Mobile number"   value={mobileNumber}   set={setMobileNumber} mono />
              <Field label="Reference"       value={reference}      set={setReference}    mono />

              <div>
                <label className="text-[10px] uppercase text-cream/50">Instructions for the user</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  placeholder="e.g. Send within 1 hour. Include reference in narration."
                  className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-cream text-sm outline-none focus:border-electric/40 resize-none"
                />
              </div>

              {err && <p className="text-xs text-loss">{err}</p>}

              <button
                disabled={busy}
                onClick={respond}
                className="w-full py-3 bg-gradient-to-r from-electric to-cyan rounded-xl text-white font-semibold shadow-glow-electric disabled:opacity-50 transition-all hover:scale-[1.01]"
              >
                {busy ? 'Sending…' : 'Send to user'}
              </button>
            </div>
          )}

          {/* AWAITING PAYMENT — show what was sent */}
          {request.status === 'awaiting_payment' && (
            <div className="bg-cyan/5 border border-cyan/30 rounded-xl p-5">
              <h4 className="font-display font-semibold text-cream mb-3">Awaiting user&apos;s payment</h4>
              <p className="text-sm text-cream/60">User has the payout details. Wait for proof upload.</p>
              {request.admin_payment_details && (
                <div className="mt-3 text-xs text-cream/70 space-y-1 font-mono">
                  {Object.entries(request.admin_payment_details).map(([k, v]) =>
                    v ? <div key={k}><span className="text-cream/50">{k}:</span> {String(v)}</div> : null,
                  )}
                </div>
              )}
            </div>
          )}

          {/* AWAITING VERIFICATION — show proof + approve/reject */}
          {request.status === 'awaiting_verification' && (
            <div className="bg-gold/5 border border-gold/30 rounded-xl p-5 space-y-4">
              <h4 className="font-display font-semibold text-cream">Verify proof of payment</h4>
              {proofSignedUrl ? (
                proofSignedUrl.toLowerCase().includes('.pdf') ? (
                  <a href={proofSignedUrl} target="_blank" rel="noreferrer" className="block text-electric-light underline text-sm">
                    Open proof (PDF)
                  </a>
                ) : (
                  <a href={proofSignedUrl} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={proofSignedUrl} alt="Proof" className="w-full max-h-80 object-contain rounded-lg border border-white/10" />
                  </a>
                )
              ) : (
                <p className="text-sm text-cream/50">Loading proof…</p>
              )}

              <div>
                <label className="text-[10px] uppercase text-cream/50">Credit amount (USD value)</label>
                <input
                  type="number" step="0.01"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-cream font-mono text-sm outline-none focus:border-electric/40"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-cream/50">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-cream text-sm outline-none focus:border-electric/40 resize-none"
                />
              </div>

              {err && <p className="text-xs text-loss">{err}</p>}

              <div className="grid grid-cols-2 gap-3">
                <button onClick={reject} disabled={busy} className="flex items-center justify-center gap-1.5 py-2.5 bg-loss/10 hover:bg-loss/20 border border-loss/30 rounded-lg text-loss text-sm font-semibold disabled:opacity-50">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button onClick={approve} disabled={busy} className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-profit to-profit-dark text-white rounded-lg text-sm font-semibold shadow-glow-profit disabled:opacity-50">
                  <CheckCircle2 className="w-4 h-4" /> Approve & Credit
                </button>
              </div>
            </div>
          )}

          {/* COMPLETED */}
          {request.status === 'completed' && (
            <div className="bg-profit/5 border border-profit/30 rounded-xl p-5 text-center">
              <CheckCircle2 className="w-8 h-8 text-profit mx-auto mb-2" />
              <p className="text-sm text-cream/70">Credited <span className="font-mono">{fmt(request.credited_amount_usd, 2)} {request.credited_asset}</span></p>
              {request.admin_notes && <p className="mt-2 text-xs text-cream/50">{request.admin_notes}</p>}
            </div>
          )}

          {request.status === 'rejected' && (
            <div className="bg-loss/5 border border-loss/30 rounded-xl p-5">
              <p className="text-sm text-loss font-semibold">Rejected</p>
              {request.admin_notes && <p className="mt-1 text-xs text-cream/60">{request.admin_notes}</p>}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, value, set, mono }: { label: string; value: string; set: (v: string) => void; mono?: boolean }) {
  return (
    <div>
      <label className="text-[10px] uppercase text-cream/50">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-cream text-sm outline-none focus:border-electric/40 ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}
