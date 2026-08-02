'use client';

import { useMemo, useState } from 'react';
import { X, ChevronLeft } from 'lucide-react';

type Mode = 'amount' | 'percent' | 'price';

/**
 * Sleek Take Profit / Stop Loss editor (OlympTrade-style).
 * Amount / Percent / Price tabs; live gain% / loss% and the target price.
 * PnL model matches the FX engine:
 *   pnl = sign * (price - entry) * (investment / entry) * multiplier
 */
export function TakeProfitStopLoss({
  entryPrice,
  investment,
  multiplier = 1,
  direction = 'buy',
  currency = '$',
  initialTp = '',
  initialSl = '',
  onConfirm,
  onClose,
}: {
  entryPrice: number;
  investment: number;
  multiplier?: number;
  direction?: 'buy' | 'sell';
  currency?: string;
  initialTp?: string;
  initialSl?: string;
  onConfirm: (tpPrice: number | null, slPrice: number | null) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>('amount');
  const [tp, setTp] = useState(initialTp);
  const [sl, setSl] = useState(initialSl);

  const sign = direction === 'sell' ? -1 : 1;
  const unit = investment > 0 && entryPrice > 0 ? (investment * multiplier) / entryPrice : 0; // $ per price unit

  // convert an input (in the active mode) into { amount, price } for TP (gain +) or SL (loss -)
  const resolve = (raw: string, kind: 'tp' | 'sl') => {
    const v = Number(raw);
    if (!raw || !Number.isFinite(v) || unit === 0) return { amount: null as number | null, price: null as number | null, pct: 0 };
    let amount: number; // signed $ pnl
    if (mode === 'amount') {
      amount = kind === 'tp' ? Math.abs(v) : -Math.abs(v);
    } else if (mode === 'percent') {
      amount = (kind === 'tp' ? Math.abs(v) : -Math.abs(v)) / 100 * investment;
    } else {
      // price mode: user typed the target price
      amount = sign * (v - entryPrice) * unit;
    }
    const price = mode === 'price' ? v : entryPrice + (sign * amount) / unit;
    const pct = investment > 0 ? (amount / investment) * 100 : 0;
    return { amount, price, pct };
  };

  const tpR = useMemo(() => resolve(tp, 'tp'), [tp, mode, entryPrice, investment, multiplier, direction]);
  const slR = useMemo(() => resolve(sl, 'sl'), [sl, mode, entryPrice, investment, multiplier, direction]);

  const fmtPrice = (p: number | null) => (p == null ? '—' : p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 }));
  const placeholder = mode === 'amount' ? `${currency}0.00` : mode === 'percent' ? '0%' : 'price';

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full sm:w-[420px] bg-[var(--card)] border border-[var(--border)] rounded-t-3xl sm:rounded-3xl p-5 glow-soft">
        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text)]"><ChevronLeft className="w-5 h-5" /></button>
          <h3 className="text-[15px] font-semibold text-[var(--text)]">Take Profit and Stop Loss</h3>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text)]"><X className="w-5 h-5" /></button>
        </div>

        {/* tabs */}
        <div className="flex bg-[var(--inset)] rounded-xl p-1 mb-4">
          {(['amount', 'percent', 'price'] as Mode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium capitalize transition ${
                mode === m ? 'bg-[var(--card)] text-[var(--text)] shadow' : 'text-[var(--text-3)]'
              }`}>{m}</button>
          ))}
        </div>

        {/* Take Profit */}
        <Field
          label="Take Profit" tone="up"
          value={tp} onChange={setTp} placeholder={placeholder}
          hint={tpR.amount != null ? <>Gain: <span className="text-[#00E676]">{tpR.pct >= 0 ? '+' : ''}{tpR.pct.toFixed(0)}%</span> at {fmtPrice(tpR.price)}</> : 'Set a profit target'}
          onClear={() => setTp('')}
        />

        {/* Stop Loss */}
        <div className="mt-3">
          <Field
            label="Stop Loss" tone="down"
            value={sl} onChange={setSl} placeholder={placeholder}
            hint={slR.amount != null ? <>Loss: <span className="text-[#FF5A47]">{slR.pct.toFixed(0)}%</span> at {fmtPrice(slR.price)}</> : 'Set a stop loss'}
            onClear={() => setSl('')}
          />
        </div>

        <button
          onClick={() => onConfirm(tpR.price, slR.price)}
          className="mt-5 w-full py-3.5 rounded-2xl bg-[#00E676] text-[#04140A] font-bold glow-up active:translate-y-px transition">
          Confirm
        </button>
      </div>
    </div>
  );
}

function Field({
  label, tone, value, onChange, placeholder, hint, onClear,
}: {
  label: string; tone: 'up' | 'down'; value: string; onChange: (v: string) => void;
  placeholder: string; hint: React.ReactNode; onClear: () => void;
}) {
  return (
    <div>
      <div className="rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-[var(--text-3)]">{label}</div>
          <input
            value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" placeholder={placeholder}
            className={`mt-0.5 w-full bg-transparent outline-none text-[17px] font-semibold tabular-nums ${
              tone === 'up' ? 'text-[#00E676]' : 'text-[#FF5A47]'
            } placeholder:text-[var(--text-3)]`}
          />
        </div>
        {value && <button onClick={onClear} className="text-[var(--text-3)] hover:text-[var(--text)] ml-2"><X className="w-4 h-4" /></button>}
      </div>
      <div className="mt-1.5 text-[12px] text-[var(--text-3)] px-1">{hint}</div>
    </div>
  );
}

export default TakeProfitStopLoss;
