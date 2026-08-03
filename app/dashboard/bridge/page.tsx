'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, ChevronDown, ArrowRight, ArrowDown, CheckCircle2, Clock,
  Upload, X, AlertCircle, Loader2, Copy, History, Banknote, Building2, Smartphone
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useStore } from '@/lib/supabase/store-supabase';

type Country = {
  code: string;
  name: string;
  currency: string;
  currency_symbol?: string;
  flag_emoji?: string;
  min_local: number;
  max_local: number;
};

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
  estimated_target?: number;
  final_credit_target?: number;
  credited_amount?: number;
  credited_amount_usd?: number;
  credited_asset?: string;
  fx_rate?: number;
  admin_payment_details?: any;
  admin_responded_at?: string;
  proof_url?: string;
  proof_uploaded_at?: string;
  status: 'awaiting_admin' | 'awaiting_payment' | 'awaiting_verification' | 'completed' | 'rejected' | 'expired' | 'cancelled';
  admin_notes?: string;
  created_at: string;
  expires_at?: string;
};

const ASSETS = [
  { code: 'USDT', name: 'Tether',     networks: ['TRC20', 'ERC20', 'BEP20'] },
  { code: 'USDC', name: 'USD Coin',   networks: ['ERC20', 'BEP20'] },
  { code: 'BTC',  name: 'Bitcoin',    networks: ['BTC'] },
  { code: 'ETH',  name: 'Ethereum',   networks: ['ERC20'] },
  { code: 'SOL',  name: 'Solana',     networks: ['SOL'] },
  { code: 'BNB',  name: 'BNB',        networks: ['BEP20'] },
  { code: 'XRP',  name: 'XRP',        networks: ['XRP'] },
  { code: 'ADA',  name: 'Cardano',    networks: ['ADA'] },
  { code: 'AVAX', name: 'Avalanche',  networks: ['AVAX-C', 'ERC20'] },
  { code: 'MATIC', name: 'Polygon',   networks: ['Polygon', 'ERC20'] },
  { code: 'DOGE', name: 'Dogecoin',   networks: ['DOGE'] },
  { code: 'TRX',  name: 'TRON',       networks: ['TRC20'] },
  { code: 'LINK', name: 'Chainlink',  networks: ['ERC20'] },
  { code: 'LTC',  name: 'Litecoin',   networks: ['LTC'] },
  { code: 'DOT',  name: 'Polkadot',   networks: ['DOT'] },
];

// Approximate FX (in real app pull from exchangerate API). 1 USD = ?
const FX: Record<string, number> = {
  HKD: 7.81, SGD: 1.36, JPY: 154.2, KRW: 1350, CNY: 7.24, TWD: 32.4,
  INR: 83.4, PHP: 56.5, IDR: 16200, THB: 36.5, VND: 25400, MYR: 4.45,
  PKR: 278, AED: 3.67, EGP: 48.5, TRY: 38.5,
  GBP: 0.78, EUR: 0.93, USD: 1, CAD: 1.36, AUD: 1.52, NZD: 1.66,
  MXN: 17, BRL: 5.1, ARS: 1080, CLP: 950, COP: 4100,
  ZAR: 18.4, KES: 130, GHS: 14.5, UGX: 3700, TZS: 2500, NGN: 1580,
};

function fmtNum(x: number, dp = 2) {
  if (!Number.isFinite(x)) return '0.00';
  return x.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  awaiting_admin:        { label: 'Waiting for desk',        color: 'text-electric-light bg-electric/10 border-electric/30' },
  awaiting_payment:      { label: 'Send your local payment', color: 'text-cyan bg-cyan/10 border-cyan/30' },
  awaiting_verification: { label: 'Verifying your proof',    color: 'text-gold bg-gold/10 border-gold/30' },
  completed:             { label: 'Completed',               color: 'text-profit bg-profit/10 border-profit/30' },
  rejected:              { label: 'Rejected',                color: 'text-loss bg-loss/10 border-loss/30' },
  expired:               { label: 'Expired',                 color: 'text-cream/40 bg-white/5 border-white/10' },
  cancelled:             { label: 'Cancelled',               color: 'text-cream/40 bg-white/5 border-white/10' },
};

export default function SwiftBridgePage() {
  const { user } = useStore();
  const [countries, setCountries] = useState<Country[]>([]);
  const [requests, setRequests] = useState<BridgeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [country, setCountry] = useState<Country | null>(null);
  const [openCountry, setOpenCountry] = useState(false);
  const [search, setSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState(ASSETS[0]);
  const [receiveMode, setReceiveMode] = useState<'crypto' | 'usd'>('crypto');
  const [network, setNetwork] = useState(ASSETS[0].networks[0]);
  const [openAsset, setOpenAsset] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

  // Selected open request (for upload-proof, view details)
  const [selected, setSelected] = useState<BridgeRequest | null>(null);

  // Load countries + user requests
  useEffect(() => {
    (async () => {
      try {
        const { data: cs } = await supabase
          .from('bridge_countries')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });
        setCountries(cs || []);

        if (user?.id) {
          const { data: rs } = await supabase
            .from('bridge_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          setRequests(rs || []);

          // Realtime subscribe
          const ch = supabase
            .channel(`bridge-${user.id}`)
            .on('postgres_changes', {
              event: '*',
              schema: 'public',
              table: 'bridge_requests',
              filter: `user_id=eq.${user.id}`,
            }, (payload: any) => {
              const newRow = payload.new as BridgeRequest;
              setRequests((prev) => {
                const exists = prev.find((r) => r.id === newRow.id);
                if (!exists) return [newRow, ...prev];
                return prev.map((r) => (r.id === newRow.id ? newRow : r));
              });
              if (selected?.id === newRow.id) setSelected(newRow);
            })
            .subscribe();
          return () => { supabase.removeChannel(ch); };
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const staticFxRate = country ? FX[country.currency] || 1 : 1;
  const localAmt = parseFloat(amount.replace(/,/g, '')) || 0;

  // live conversion (fiat -> USD -> crypto). Stable: race-safe, keeps last good
  // value while re-fetching, only clears when inputs are empty — no twitching.
  const [conv, setConv] = useState<{ usd: number; crypto: number; fx_rate: number; crypto_price: number } | null>(null);
  const convReqRef = useRef(0);
  useEffect(() => {
    if (!country || !asset?.code || localAmt <= 0) { setConv(null); return; }
    const reqId = ++convReqRef.current;
    const t = setTimeout(async () => {
      try {
        const j = await (await fetch(`/api/convert?amount=${localAmt}&from=${country.currency}&to=${receiveMode === 'usd' ? 'USD' : asset.code}`, { cache: 'no-store' })).json();
        if (reqId !== convReqRef.current) return;           // ignore stale responses
        if (j?.usd != null && j.usd > 0) setConv({ usd: j.usd, crypto: j.crypto, fx_rate: j.fx_rate, crypto_price: j.crypto_price });
        // on failure: keep the previous value instead of flipping to null
      } catch { /* keep last good value */ }
    }, 450);
    return () => clearTimeout(t);
  }, [localAmt, country?.currency, asset?.code, receiveMode]);

  const fxRate = conv?.fx_rate && conv.fx_rate > 0 ? conv.fx_rate : staticFxRate;
  const usdEstimate = conv?.usd ?? (country ? localAmt / staticFxRate : 0);
  const cryptoEstimate = conv?.crypto ?? 0;

  const validAmount = country
    ? localAmt >= (country.min_local || 0) && localAmt <= (country.max_local || Infinity)
    : false;

  const filteredCountries = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.currency.toLowerCase().includes(q),
    );
  }, [countries, search]);

  const submit = async () => {
    if (!country || !validAmount || !user?.id) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/bridge/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          country_code: country.code,
          country_name: country.name,
          local_currency: country.currency,
          local_amount: localAmt,
          target_asset: receiveMode === 'usd' ? 'USD' : asset.code,
          target_network: network,
          fx_rate: fxRate,
          estimated_credit_usd: usdEstimate,
          estimated_target: cryptoEstimate,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.id) throw new Error(json.error || 'Failed to submit');
      setAmount('');
      setActiveTab('history');
      setSelected(json.request);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const uploadProof = async (file: File, request: BridgeRequest) => {
    if (!user?.id || !file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('request_id', request.id);
    const res = await fetch('/api/bridge/upload-proof', {
      method: 'POST',
      headers: { 'x-user-id': user.id },
      body: fd,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Upload failed');
    return json;
  };

  const markPaid = async (request: BridgeRequest) => {
    if (!user?.id) return;
    const res = await fetch('/api/bridge/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ request_id: request.id }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to submit');
    return json;
  };

  return (
    <div className="min-h-full">
      {/* HEADER */}
      <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-obsidian via-charcoal to-obsidian">
        <div className="absolute -top-20 right-0 w-[500px] h-[500px] bg-electric/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="relative px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric to-cyan flex items-center justify-center shadow-glow-electric">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-cream tracking-tight">SwiftBridge</h1>
              <p className="text-xs text-cream/50">Bureau de change · Local cash → crypto in minutes</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-cream/65 max-w-2xl">
            Pick your country, enter the amount, our concierge desk replies with verified payout details — pay in your local currency, upload proof, and we credit your platform balance.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto pt-6">
        <div className="inline-flex p-1 bg-obsidian/60 border border-white/10 rounded-xl">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'new' ? 'bg-gradient-to-r from-electric to-cyan text-white shadow-glow-electric' : 'text-cream/60 hover:text-cream'
            }`}
          >
            New request
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'history' ? 'bg-gradient-to-r from-electric to-cyan text-white shadow-glow-electric' : 'text-cream/60 hover:text-cream'
            }`}
          >
            <History className="w-4 h-4" />
            My requests
            {requests.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10">{requests.length}</span>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto py-6 pb-20">
        {activeTab === 'new' && (
          <div className="grid lg:grid-cols-12 gap-6">
            {/* FORM */}
            <div className="lg:col-span-7">
              <div className="bg-gradient-to-br from-obsidian to-charcoal border border-white/10 rounded-2xl p-6">
                <h2 className="font-display font-semibold text-cream text-lg mb-1">Start a bridge</h2>
                <p className="text-xs text-cream/50 mb-6">Average completion time: 5 minutes</p>

                {/* Country selector */}
                <label className="text-[11px] uppercase tracking-wider text-cream/50 font-medium">Country</label>
                <button
                  type="button"
                  onClick={() => setOpenCountry(true)}
                  className="mt-1 mb-4 w-full flex items-center justify-between gap-3 p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-electric/40 rounded-xl transition-colors"
                >
                  {country ? (
                    <div className="flex items-center gap-3">
                      <Image src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`} alt={country.name} width={28} height={20} className="rounded" />
                      <div className="text-left">
                        <div className="text-cream font-medium text-sm">{country.name}</div>
                        <div className="text-cream/50 text-[11px]">{country.currency} {country.currency_symbol ?? ''}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-cream/50 text-sm">Select your country…</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-cream/40" />
                </button>

                {/* Amount */}
                <label className="text-[11px] uppercase tracking-wider text-cream/50 font-medium">You send</label>
                <div className="mt-1 mb-2 flex items-center gap-2 p-3.5 bg-white/5 border border-white/10 rounded-xl focus-within:border-electric/50 transition-colors">
                  <span className="text-cream/50 text-lg">{country?.currency_symbol ?? '$'}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                    placeholder="0.00"
                    className="flex-1 bg-transparent outline-none text-cream font-mono text-2xl font-bold placeholder:text-cream/20"
                  />
                  <span className="text-cream/40 text-xs">{country?.currency ?? ''}</span>
                </div>
                {country && (
                  <div className="text-xs text-cream/50 mb-4">
                    Min {fmtNum(country.min_local, 0)} · Max {fmtNum(country.max_local, 0)} {country.currency}
                  </div>
                )}

                {/* Down arrow */}
                <div className="flex items-center justify-center my-2">
                  <div className="w-8 h-8 rounded-full bg-electric/20 border border-electric/40 flex items-center justify-center">
                    <ArrowDown className="w-4 h-4 text-electric" />
                  </div>
                </div>

                {/* Receive as */}
                <label className="text-[11px] uppercase tracking-wider text-cream/50 font-medium">Receive as</label>
                <div className="mt-1 mb-4 flex bg-white/5 rounded-xl p-1">
                  {(['crypto','usd'] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setReceiveMode(m)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${receiveMode===m ? 'bg-electric text-void' : 'text-cream/60'}`}>
                      {m === 'crypto' ? 'Crypto coin' : 'USD balance'}
                    </button>
                  ))}
                </div>

                {/* You receive (estimated) */}
                <label className="text-[11px] uppercase tracking-wider text-cream/50 font-medium">You receive (estimated)</label>
                <div className="mt-1 mb-4 flex items-center gap-2 p-3.5 bg-electric/5 border border-electric/30 rounded-xl">
                  <span className="text-electric-light text-lg">≈</span>
                  <span className="flex-1 font-mono text-2xl font-bold text-electric-light">
                    {receiveMode === 'usd' ? fmtNum(usdEstimate, 2) : (cryptoEstimate > 0 ? fmtNum(cryptoEstimate, 6) : fmtNum(usdEstimate, 2))}
                  </span>
                  <span className="text-electric-light/70 text-sm">{receiveMode === 'usd' ? 'USD' : (cryptoEstimate > 0 ? asset.code : 'USD')}</span>
                </div>
                {cryptoEstimate > 0 && (
                  <div className="-mt-3 mb-4 text-[11px] text-cream/45">
                    ≈ ${fmtNum(usdEstimate, 2)} · rate 1 {asset.code} = ${fmtNum(conv?.crypto_price || 0, 2)}
                  </div>
                )}

                {/* Asset & network */}
                <label className="text-[11px] uppercase tracking-wider text-cream/50 font-medium">Receive in</label>
                <div className="mt-1 grid grid-cols-2 gap-2 mb-5">
                  <button
                    type="button"
                    onClick={() => setOpenAsset(true)}
                    className="flex items-center justify-between gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                  >
                    <span className="text-cream font-medium text-sm">{asset.code}</span>
                    <ChevronDown className="w-4 h-4 text-cream/40" />
                  </button>
                  <select
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    className="px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-cream text-sm outline-none focus:border-electric/50"
                  >
                    {asset.networks.map((n) => (
                      <option key={n} value={n} className="bg-charcoal">{n}</option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-loss/10 border border-loss/30 rounded-lg text-loss text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <button
                  onClick={submit}
                  disabled={!country || !validAmount || submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-electric to-cyan rounded-xl text-white font-semibold shadow-glow-electric transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                  ) : (
                    <>Submit Bridge Request <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                <p className="mt-3 text-[11px] text-cream/40 text-center">
                  Our concierge desk responds within 5–15 minutes during business hours.
                </p>
              </div>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-gradient-to-br from-obsidian to-charcoal border border-white/10 rounded-2xl p-6">
                <h3 className="font-display font-semibold text-cream mb-4">How it works</h3>
                <ol className="space-y-3">
                  {[
                    'Pick country, enter amount, and the coin you want',
                    'Our desk replies with verified local payout details',
                    'Pay through your bank, mobile money, or e-wallet',
                    'Upload a screenshot of your transfer',
                    'We verify and credit your platform balance',
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-electric/20 border border-electric/40 flex items-center justify-center text-[11px] font-bold text-electric flex-shrink-0">{i + 1}</div>
                      <span className="text-sm text-cream/75">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-gradient-to-br from-electric/10 via-obsidian to-charcoal border border-electric/30 rounded-2xl p-6">
                <h3 className="font-display font-semibold text-cream mb-2">Why it&apos;s safer than P2P</h3>
                <ul className="space-y-2 text-sm text-cream/70">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-electric flex-shrink-0 mt-0.5" /> Verified payout accounts only</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-electric flex-shrink-0 mt-0.5" /> No haggling — fixed rates locked at submission</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-electric flex-shrink-0 mt-0.5" /> Funds escrowed until verification</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-electric flex-shrink-0 mt-0.5" /> Full audit trail</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {loading && (
              <div className="text-center py-12 text-cream/50">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading…
              </div>
            )}
            {!loading && requests.length === 0 && (
              <div className="text-center py-16 bg-obsidian/40 border border-white/10 rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-electric/10 border border-electric/30 flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-7 h-7 text-electric" />
                </div>
                <h3 className="font-display font-semibold text-cream text-lg">No bridge requests yet</h3>
                <p className="text-sm text-cream/50 mt-1">Tap “New request” to start your first one.</p>
              </div>
            )}

            {requests.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left bg-gradient-to-br from-obsidian to-charcoal border border-white/10 hover:border-electric/40 rounded-2xl p-5 transition-all"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Image
                      src={`https://flagcdn.com/w40/${r.country_code.toLowerCase()}.png`}
                      alt={r.country_name} width={32} height={22} className="rounded mt-1"
                    />
                    <div>
                      <div className="font-display font-semibold text-cream">
                        {fmtNum(r.local_amount, 0)} {r.local_currency}
                        <span className="text-cream/40 text-xs mx-2">→</span>
                        <span className="text-electric-light">{r.estimated_target ? fmtNum(r.estimated_target, 6) : (r.estimated_credit_usd ? '$'+fmtNum(r.estimated_credit_usd,2) : '—')} {r.estimated_target ? r.target_asset : ''}</span>
                      </div>
                      <div className="text-xs text-cream/50 mt-0.5">
                        {new Date(r.created_at).toLocaleString()} · {r.country_name}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border font-bold ${STATUS_LABEL[r.status]?.color}`}>
                    {STATUS_LABEL[r.status]?.label || r.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* COUNTRY PICKER MODAL */}
      <AnimatePresence>
        {openCountry && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-void/80 backdrop-blur flex items-end md:items-center justify-center p-2 md:p-4"
            onClick={() => setOpenCountry(false)}
            style={{ touchAction: 'none' }}
          >
            <motion.div
              initial={{ y: 30, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-charcoal border border-white/10 rounded-2xl overflow-hidden flex flex-col"
              style={{
                maxHeight: 'min(80dvh, 640px)',
                marginBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                <h3 className="font-display font-semibold text-cream">Select country</h3>
                <button onClick={() => setOpenCountry(false)} className="text-cream/60 hover:text-cream p-1"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-3 shrink-0">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country or currency…"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg outline-none text-cream text-sm"
                />
              </div>
              <div
                className="flex-1 overflow-y-auto overscroll-contain px-2 pb-3"
                style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
              >
                {filteredCountries.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => { setCountry(c); setOpenCountry(false); setSearch(''); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-electric/10 rounded-lg transition-colors text-left"
                  >
                    <Image src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} alt={c.name} width={28} height={20} className="rounded" />
                    <div className="flex-1 min-w-0">
                      <div className="text-cream font-medium text-sm truncate">{c.name}</div>
                      <div className="text-cream/50 text-[11px]">{c.currency}</div>
                    </div>
                    {country?.code === c.code && <CheckCircle2 className="w-4 h-4 text-electric shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ASSET PICKER */}
      <AnimatePresence>
        {openAsset && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-void/80 backdrop-blur flex items-end md:items-center justify-center p-2 md:p-4"
            onClick={() => setOpenAsset(false)}
            style={{ touchAction: 'none' }}
          >
            <motion.div
              initial={{ y: 30, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-charcoal border border-white/10 rounded-2xl overflow-hidden flex flex-col"
              style={{
                maxHeight: 'min(80dvh, 580px)',
                marginBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                <h3 className="font-display font-semibold text-cream">Select asset</h3>
                <button onClick={() => setOpenAsset(false)} className="text-cream/60 hover:text-cream p-1"><X className="w-5 h-5" /></button>
              </div>
              <div
                className="flex-1 p-2 overflow-y-auto overscroll-contain"
                style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
              >
                {ASSETS.map((a) => (
                  <button
                    key={a.code}
                    onClick={() => { setAsset(a); setNetwork(a.networks[0]); setOpenAsset(false); }}
                    className="w-full flex items-center justify-between gap-3 p-3 hover:bg-electric/10 rounded-lg transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <div className="text-cream font-medium text-sm">{a.code}</div>
                      <div className="text-cream/50 text-[11px] truncate">{a.name}</div>
                    </div>
                    {asset.code === a.code && <CheckCircle2 className="w-4 h-4 text-electric shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REQUEST DETAIL DRAWER */}
      <AnimatePresence>
        {selected && (
          <BridgeDetail
            request={selected}
            onClose={() => setSelected(null)}
            onUpload={uploadProof}
            onMarkPaid={markPaid}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Detail drawer with payment instructions + proof upload
// ─────────────────────────────────────────────────────────
function BridgeDetail({
  request, onClose, onUpload, onMarkPaid,
}: {
  request: BridgeRequest;
  onClose: () => void;
  onUpload: (f: File, r: BridgeRequest) => Promise<any>;
  onMarkPaid: (r: BridgeRequest) => Promise<any>;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const pay = request.admin_payment_details || {};

  const copy = (s: string) => {
    if (navigator?.clipboard) navigator.clipboard.writeText(s);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setErr('');
    try {
      await onUpload(f, request);
    } catch (x: any) {
      setErr(x.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-void/80 backdrop-blur flex items-stretch justify-end"
      onClick={onClose}
      style={{ touchAction: 'none' }}
    >
      <motion.div
        initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 80, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-charcoal border-l border-white/10 overflow-y-auto overscroll-contain pb-32 lg:pb-8"
        style={{
          height: '100dvh',
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 7rem)',
        }}
      >
        <div className="sticky top-0 z-10 bg-charcoal/95 backdrop-blur p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-cream">Bridge request</h3>
            <p className="text-[11px] text-cream/50 font-mono mt-0.5">#{request.id.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="text-cream/60 hover:text-cream"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border font-bold ${STATUS_LABEL[request.status]?.color}`}>
            {STATUS_LABEL[request.status]?.label}
          </span>

          {/* Summary */}
          <div className="bg-obsidian border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="text-cream/60">You send</div>
              <div className="text-cream font-mono font-semibold">{fmtNum(request.local_amount, 0)} {request.local_currency}</div>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <div className="text-cream/60">You receive (est.)</div>
              <div className="text-electric-light font-mono font-semibold">≈ {fmtNum(request.estimated_target || 0, 6)} {request.target_asset}{request.estimated_credit_usd ? ` (~$${fmtNum(request.estimated_credit_usd,2)})` : ''}</div>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <div className="text-cream/60">Country</div>
              <div className="text-cream">{request.country_name}</div>
            </div>
          </div>

          {/* AWAITING ADMIN */}
          {request.status === 'awaiting_admin' && (
            <div className="bg-electric/5 border border-electric/30 rounded-xl p-5 text-center">
              <Clock className="w-8 h-8 text-electric mx-auto mb-3 animate-pulse" />
              <h4 className="font-display font-semibold text-cream">Waiting for our desk…</h4>
              <p className="text-sm text-cream/60 mt-2">
                Our concierge will reply with verified payout details. You&apos;ll get a notification — usually within 5–15 minutes.
              </p>
            </div>
          )}

          {/* AWAITING PAYMENT — show admin's payout details */}
          {request.status === 'awaiting_payment' && (
            <>
              <div className="bg-gradient-to-br from-cyan/10 via-obsidian to-charcoal border border-cyan/30 rounded-xl p-5">
                <h4 className="font-display font-semibold text-cream mb-3 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-cyan" /> Pay to these details
                </h4>

                <div className="space-y-3">
                  {pay.method && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-cream/50">Method</div>
                      <div className="text-cream font-medium text-sm flex items-center gap-2 mt-0.5">
                        {pay.method.toLowerCase().includes('mobile') ? <Smartphone className="w-3.5 h-3.5 text-cyan" /> : <Building2 className="w-3.5 h-3.5 text-cyan" />}
                        {pay.method}
                      </div>
                    </div>
                  )}
                  {pay.bank_name && <DetailRow label="Bank" value={pay.bank_name} />}
                  {pay.account_name && <DetailRow label="Account name" value={pay.account_name} copy={copy} />}
                  {pay.account_number && <DetailRow label="Account number" value={pay.account_number} copy={copy} mono />}
                  {pay.swift && <DetailRow label="SWIFT" value={pay.swift} copy={copy} mono />}
                  {pay.iban && <DetailRow label="IBAN" value={pay.iban} copy={copy} mono />}
                  {pay.mobile_provider && <DetailRow label="Provider" value={pay.mobile_provider} />}
                  {pay.mobile_number && <DetailRow label="Mobile number" value={pay.mobile_number} copy={copy} mono />}
                  {pay.reference && <DetailRow label="Reference" value={pay.reference} copy={copy} mono />}
                  {pay.instructions && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-cream/50">Instructions</div>
                      <p className="text-sm text-cream/80 mt-1">{pay.instructions}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload proof */}
              <div className="bg-obsidian border border-white/10 rounded-xl p-5">
                <h4 className="font-display font-semibold text-cream mb-2">Upload proof of payment</h4>
                <p className="text-xs text-cream/50 mb-4">Screenshot or PDF — receipt or transfer confirmation.</p>
                <label className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-white/15 rounded-xl cursor-pointer hover:border-electric/50 hover:bg-electric/5 transition">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-electric animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-electric" />
                  )}
                  <span className="text-sm text-cream/60">{uploading ? 'Uploading…' : 'Tap to upload proof'}</span>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
                </label>
                {err && <div className="mt-2 text-xs text-loss">{err}</div>}

                <button
                  onClick={async () => {
                    setUploading(true); setErr('');
                    try { await onMarkPaid(request); onClose(); }
                    catch (e: any) { setErr(e?.message || 'Failed to submit'); }
                    finally { setUploading(false); }
                  }}
                  disabled={uploading}
                  className="mt-3 w-full py-2.5 rounded-xl border border-white/15 text-cream/70 text-sm font-medium hover:bg-white/5 hover:text-cream transition disabled:opacity-50"
                >
                  I&apos;ve already paid — submit without receipt
                </button>
                <p className="mt-2 text-[11px] text-cream/40 text-center">You can upload the receipt later; our desk will verify your payment.</p>
              </div>
            </>
          )}

          {/* AWAITING VERIFICATION */}
          {request.status === 'awaiting_verification' && (
            <div className="bg-gold/10 border border-gold/30 rounded-xl p-5 text-center">
              <Loader2 className="w-8 h-8 text-gold mx-auto mb-3 animate-spin" />
              <h4 className="font-display font-semibold text-cream">Verifying your payment…</h4>
              <p className="text-sm text-cream/60 mt-2">We&apos;ve received your proof. We&apos;ll credit your balance once confirmed.</p>
            </div>
          )}

          {/* COMPLETED */}
          {request.status === 'completed' && (
            <div className="bg-profit/10 border border-profit/30 rounded-xl p-5 text-center">
              <CheckCircle2 className="w-10 h-10 text-profit mx-auto mb-3" />
              <h4 className="font-display font-semibold text-cream">Completed!</h4>
              <p className="text-sm text-cream/60 mt-2">
                Credited <span className="text-cream font-mono">{fmtNum(request.final_credit_target || request.credited_amount || request.estimated_target || 0, 6)}</span> {request.credited_asset || request.target_asset} to your crypto holdings.
              </p>
            </div>
          )}

          {/* REJECTED */}
          {request.status === 'rejected' && (
            <div className="bg-loss/10 border border-loss/30 rounded-xl p-5">
              <h4 className="font-display font-semibold text-loss mb-2">Request rejected</h4>
              {request.admin_notes && <p className="text-sm text-cream/70">{request.admin_notes}</p>}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function DetailRow({ label, value, copy, mono }: { label: string; value: string; copy?: (s: string) => void; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-cream/50">{label}</div>
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <div className={`text-cream text-sm ${mono ? 'font-mono' : 'font-medium'}`}>{value}</div>
        {copy && (
          <button onClick={() => copy(value)} className="text-cream/40 hover:text-electric"><Copy className="w-3.5 h-3.5" /></button>
        )}
      </div>
    </div>
  );
}
