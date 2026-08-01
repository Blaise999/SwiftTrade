'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, X, ShieldAlert } from 'lucide-react';
import {
  type Direction, priceFromPips, round, validateSl, validateTp, riskPreview,
} from '@/lib/fx/sltp';

const usd = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

const INV_CHIPS = [10, 50, 100, 500];
const LEV_CHIPS = [2, 5, 10, 20, 50, 100];
const PIP_CHIPS = [10, 20, 50, 100];

export interface FxOrderTicketProps {
  /** Which FX backend to trade on. 'regular' → /api/trades (sends `asset`);
   *  'demo-fx' → /api/demo-fx/trades (sends `pair_id`). */
  variant?: 'regular' | 'demo-fx';
  /** pair_id for demo-fx (required for that variant). */
  pairId?: string;
  /** pair symbol, e.g. "EUR/USD" — display + pip size, and the `asset` for regular. */
  pairSymbol: string;
  price: number;
  getAuthToken?: () => Promise<string | null> | string | null;
  onOpened?: () => void;
  className?: string;
  /** Override the endpoint if your route differs from the variant default. */
  endpoint?: string;
}

/**
 * FxOrderTicket — the whole order entry in one compact, always-visible column.
 * Works on BOTH FX systems: regular (/api/trades, keyed by `asset`) and the
 * demo-fx engine (/api/demo-fx/trades, keyed by `pair_id`). SL/TP as pips or
 * price, correct-side validation before submit, live risk/reward/liq preview.
 */
export function FxOrderTicket({
  variant = 'regular', pairId, pairSymbol, price, getAuthToken, onOpened, className, endpoint,
}: FxOrderTicketProps) {
  const [dir, setDir] = useState<Direction>('buy');
  const [investment, setInvestment] = useState<number>(100);
  const [multiplier, setMultiplier] = useState<number>(10);
  const [mode, setMode] = useState<'price' | 'pips'>('pips');
  const [sl, setSl] = useState<string>('');
  const [tp, setTp] = useState<string>('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = endpoint || (variant === 'demo-fx' ? '/api/demo-fx/trades' : '/api/trades');

  const slPrice = useMemo(() => resolve(sl, 'sl'), [sl, mode, dir, price, pairSymbol]);
  const tpPrice = useMemo(() => resolve(tp, 'tp'), [tp, mode, dir, price, pairSymbol]);

  function resolve(v: string, kind: 'sl' | 'tp'): number | null {
    const num = Number(v);
    if (!v.trim() || !Number.isFinite(num) || num <= 0) return null;
    return mode === 'pips' ? priceFromPips(price, num, kind, dir, pairSymbol) : round(num, pairSymbol);
  }

  const slErr = validateSl(slPrice, price, dir);
  const tpErr = validateTp(tpPrice, price, dir);
  const preview = useMemo(
    () => riskPreview({ entry: price, dir, investment, multiplier, sl: slPrice, tp: tpPrice, pair: pairSymbol }),
    [price, dir, investment, multiplier, slPrice, tpPrice, pairSymbol],
  );

  const canSubmit = investment > 0 && price > 0 && !slErr && !tpErr && !busy &&
    (variant !== 'demo-fx' || !!pairId);
  const accent = dir === 'buy' ? '#00C805' : '#FF5000';

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = getAuthToken ? await getAuthToken() : null;
      if (token) headers.Authorization = `Bearer ${token}`;

      const body: any = { direction: dir, investment, multiplier };
      if (variant === 'demo-fx') body.pair_id = pairId;
      else body.asset = pairSymbol; // regular /api/trades keys on `asset`
      if (slPrice != null) body.stop_loss = slPrice;
      if (tpPrice != null) body.take_profit = tpPrice;

      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Failed to open trade');

      setConfirm(false); setSl(''); setTp('');
      onOpened?.();
    } catch (e: any) {
      setError(e?.message || 'Failed to open trade');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex flex-col gap-2.5 ${className || ''}`} style={{ color: '#0B0B0F' }}>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setDir('buy')}
          className={`h-11 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-1.5 transition ${
            dir === 'buy' ? 'text-white' : 'bg-black/[0.04] text-black/50 hover:bg-black/[0.07]'}`}
          style={dir === 'buy' ? { background: '#00C805' } : undefined}>
          <TrendingUp className="h-4 w-4" /> Buy
        </button>
        <button onClick={() => setDir('sell')}
          className={`h-11 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-1.5 transition ${
            dir === 'sell' ? 'text-white' : 'bg-black/[0.04] text-black/50 hover:bg-black/[0.07]'}`}
          style={dir === 'sell' ? { background: '#FF5000' } : undefined}>
          <TrendingDown className="h-4 w-4" /> Sell
        </button>
      </div>

      <Field label="Investment">
        <div className="flex items-center gap-1.5">
          <input inputMode="decimal" value={investment}
            onChange={(e) => setInvestment(Math.max(0, Number(e.target.value) || 0))}
            className="flex-1 min-w-0 h-10 rounded-lg bg-black/[0.04] px-3 text-sm font-mono outline-none focus:ring-1 focus:ring-black/15" />
          {INV_CHIPS.map((v) => (
            <button key={v} onClick={() => setInvestment(v)}
              className="h-10 px-2.5 rounded-lg bg-black/[0.04] text-[11px] text-black/60 hover:bg-black/[0.08] shrink-0">${v}</button>
          ))}
        </div>
      </Field>

      <Field label={`Leverage · ${multiplier}×`}>
        <div className="grid grid-cols-6 gap-1">
          {LEV_CHIPS.map((v) => (
            <button key={v} onClick={() => setMultiplier(v)}
              className={`h-8 rounded-lg text-[11px] font-medium transition ${
                multiplier === v ? 'text-white' : 'bg-black/[0.04] text-black/55 hover:bg-black/[0.08]'}`}
              style={multiplier === v ? { background: '#0B0B0F' } : undefined}>{v}×</button>
          ))}
        </div>
      </Field>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] uppercase tracking-wide text-black/45">Stop loss / Take profit</span>
          <div className="flex rounded-md bg-black/[0.05] p-0.5 text-[10px]">
            {(['pips', 'price'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-2 py-0.5 rounded ${mode === m ? 'bg-white text-black shadow-sm' : 'text-black/50'}`}>{m}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SlTpInput tone="loss" placeholder={mode === 'pips' ? 'SL pips' : 'SL price'} value={sl} onChange={setSl}
            chips={PIP_CHIPS} onChip={(p) => setSl(String(p))} showChips={mode === 'pips'} error={!!slErr} />
          <SlTpInput tone="profit" placeholder={mode === 'pips' ? 'TP pips' : 'TP price'} value={tp} onChange={setTp}
            chips={PIP_CHIPS} onChip={(p) => setTp(String(p))} showChips={mode === 'pips'} error={!!tpErr} />
        </div>
        {(slErr || tpErr) && <p className="mt-1 text-[11px] text-[#E5484D]">{slErr || tpErr}</p>}
      </div>

      <div className="rounded-xl bg-black/[0.03] border border-black/[0.06] px-3 py-2 grid grid-cols-2 gap-y-1 text-[11px]">
        <Stat label="Risk at SL" value={preview.riskUsd != null ? usd(preview.riskUsd) : '—'} color="#E5484D" />
        <Stat label="Reward at TP" value={preview.rewardUsd != null ? usd(preview.rewardUsd) : '—'} color="#00A804" />
        <Stat label="R : R" value={preview.rr != null ? `1 : ${preview.rr.toFixed(2)}` : '—'} />
        <Stat label="Liquidation" value={round(preview.liq, pairSymbol).toString()} color="#FF5000" />
      </div>

      <button disabled={!canSubmit} onClick={() => setConfirm(true)}
        style={{ background: canSubmit ? accent : undefined }}
        className="h-12 rounded-xl font-bold text-white text-sm transition active:scale-[0.99] disabled:opacity-40 disabled:bg-black/10 disabled:text-black/40">
        {dir === 'buy' ? 'Buy' : 'Sell'} {pairSymbol} · {usd(investment)} @ {multiplier}×
      </button>

      {error && <p className="text-[11px] text-[#E5484D]">{error}</p>}

      {confirm && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4" onClick={() => !busy && setConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-white border border-black/10 rounded-t-3xl sm:rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: accent }}>Confirm {dir} {pairSymbol}</h3>
              <button onClick={() => !busy && setConfirm(false)} className="text-black/40 hover:text-black"><X className="h-4 w-4" /></button>
            </div>
            <dl className="space-y-1.5 text-[13px]">
              <Row k="Entry" v={round(price, pairSymbol).toString()} />
              <Row k="Investment" v={usd(investment)} />
              <Row k="Leverage" v={`${multiplier}×`} />
              <Row k="Stop loss" v={slPrice != null ? round(slPrice, pairSymbol).toString() : 'None'} />
              <Row k="Take profit" v={tpPrice != null ? round(tpPrice, pairSymbol).toString() : 'None'} />
              <Row k="Risk / Reward" v={preview.riskUsd != null && preview.rewardUsd != null ? `${usd(preview.riskUsd)} / ${usd(preview.rewardUsd)}` : '—'} />
            </dl>
            {slPrice == null && (
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#FF5000]">
                <ShieldAlert className="h-3.5 w-3.5" /> No stop loss — position can be liquidated at {round(preview.liq, pairSymbol)}.
              </div>
            )}
            <button disabled={busy} onClick={submit} style={{ background: accent }}
              className="mt-4 w-full h-11 rounded-xl font-bold text-white text-sm disabled:opacity-50">
              {busy ? 'Placing…' : `Place ${dir} order`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[11px] uppercase tracking-wide text-black/45">{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SlTpInput({ tone, placeholder, value, onChange, chips, onChip, showChips, error }: {
  tone: 'loss' | 'profit'; placeholder: string; value: string; onChange: (v: string) => void;
  chips: number[]; onChip: (p: number) => void; showChips: boolean; error: boolean;
}) {
  const ring = tone === 'loss' ? 'focus:ring-[#FF5000]/40' : 'focus:ring-[#00C805]/40';
  return (
    <div>
      <input inputMode="decimal" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        className={`w-full h-9 rounded-lg bg-black/[0.04] px-2.5 text-[13px] font-mono outline-none focus:ring-1 ${ring} ${error ? 'ring-1 ring-[#E5484D]/60' : ''}`} />
      {showChips && (
        <div className="flex gap-0.5 mt-1">
          {chips.map((p) => (
            <button key={p} onClick={() => onChip(p)}
              className={`flex-1 py-0.5 text-[9px] rounded ${
                tone === 'loss' ? 'bg-[#FF5000]/10 text-[#FF5000] hover:bg-[#FF5000]/20'
                               : 'bg-[#00C805]/10 text-[#00A804] hover:bg-[#00C805]/20'}`}>{p}p</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between pr-3">
      <span className="text-black/45">{label}</span>
      <span className="font-mono" style={{ color: color || '#0B0B0F' }}>{value}</span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-black/50">{k}</dt>
      <dd className="font-mono text-black">{v}</dd>
    </div>
  );
}

export default FxOrderTicket;
