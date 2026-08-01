'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Star, Share2, TrendingUp, TrendingDown, Info,
  X, Check, Repeat,
} from 'lucide-react';
import { getEtf } from '@/lib/etf-data';
import { Sparkline } from '@/components/investing/EtfCards';
import { useStore } from '@/lib/supabase/store-supabase';

const RANGES = ['1D', '1W', '1M', '3M', '1Y', '5Y', 'All'] as const;
type Range = typeof RANGES[number];

export default function EtfDetail() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const { user } = useStore();

  const symbol = String(params?.symbol || '').toUpperCase();
  const etf = getEtf(symbol);

  const [range, setRange] = useState<Range>('1Y');
  const [sheet, setSheet] = useState<null | 'buy' | 'recurring'>(
    search?.get('action') === 'buy' ? 'buy' :
    search?.get('action') === 'recurring' ? 'recurring' : null
  );
  const [mode, setMode] = useState<'dollars' | 'shares'>('dollars');
  const [amount, setAmount] = useState<string>('');
  const [freq, setFreq] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!etf) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex flex-col items-center justify-center px-6">
        <p className="text-[var(--text-2)] text-sm">ETF “{symbol}” not found.</p>
        <Link href="/dashboard/invest" className="mt-3 text-[var(--accent-2)] text-sm">Back to investing</Link>
      </div>
    );
  }

  const up = etf.seedChangePct >= 0;
  const accent = up ? '#00C805' : '#FF4D3D';
  const balance = Number((user as any)?.balance_available ?? (user as any)?.balance ?? 0) || 0;

  const estQty = useMemo(() => {
    const a = parseFloat(amount) || 0;
    if (mode === 'dollars') return a / etf.seedPrice;
    return a;
  }, [amount, mode, etf.seedPrice]);

  const estCost = useMemo(() => {
    const a = parseFloat(amount) || 0;
    return mode === 'dollars' ? a : a * etf.seedPrice;
  }, [amount, mode, etf.seedPrice]);

  const submit = async () => {
    setSubmitError(null);

    // Recurring is a Phase-2 scheduling feature — confirm the plan
    // visually without placing a live order.
    if (sheet === 'recurring') {
      setDone(true);
      setTimeout(() => { setSheet(null); setDone(false); setAmount(''); }, 1800);
      return;
    }

    const uid = (user as any)?.id;
    if (!uid) {
      setSubmitError('Please sign in again to place this order.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/invest/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          symbol: etf.symbol,
          assetType: 'etf',
          side: 'buy',
          amountType: mode === 'dollars' ? 'notional' : 'qty',
          amount: parseFloat(amount) || 0,
          price: etf.seedPrice,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        if (j?.error === 'insufficient_balance') {
          setSubmitError(`Not enough balance. Need $${Number(j.need).toFixed(2)}, have $${Number(j.have).toFixed(2)}.`);
        } else {
          setSubmitError(j?.error || 'Order could not be placed. Please try again.');
        }
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      setDone(true);
      setTimeout(() => { setSheet(null); setDone(false); setAmount(''); }, 1900);
    } catch (e: any) {
      setSubmitting(false);
      setSubmitError('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-44 lg:pb-28">
      <div className="max-w-2xl mx-auto pt-5">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--inset)]">
            <ArrowLeft className="w-4 h-4 text-[var(--text-2)]" />
          </button>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--inset)] text-[var(--text-3)] hover:text-[var(--accent-3)]">
              <Star className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--inset)] text-[var(--text-3)]">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Identity */}
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-bold text-[var(--text)] tracking-tight">{etf.symbol}</h1>
            <span className={`text-[9px] uppercase tracking-wider rounded px-1.5 py-0.5 ${
              etf.assetType === 'stock' ? 'tag-stock' : 'tag-etf'
            }`}>{etf.assetType === 'stock' ? 'STOCK' : 'ETF'}</span>
          </div>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">{etf.name}</p>
          <div className="mt-3 flex items-end gap-3">
            <div className="text-[34px] font-bold text-[var(--text)] tabular-nums leading-none">
              ${etf.seedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center gap-1 text-[14px] font-medium pb-1 tabular-nums`} style={{ color: accent }}>
              {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {up ? '+' : ''}{etf.seedChangePct.toFixed(2)}% today
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="h-[200px] flex items-center">
            <Sparkline seed={etf.seedPrice + RANGES.indexOf(range)} up={up} w={600} h={190} />
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`flex-1 h-8 rounded-lg text-[12px] font-semibold transition-colors ${
                  range === r ? 'text-white' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
                }`}
                style={range === r ? { background: accent } : {}}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Stats — adapt to stock vs ETF */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {(etf.assetType === 'stock'
            ? [
                { k: 'Sector', v: etf.sector || '—' },
                { k: 'Market cap', v: etf.marketCapBillions ? `$${etf.marketCapBillions}B` : '—' },
                { k: 'Fractional', v: etf.fractionable ? 'Yes' : 'No' },
                { k: 'Category', v: String(etf.category).replace(/_/g, ' ') },
              ]
            : [
                { k: 'Tracks', v: etf.tracks || '—' },
                { k: 'Expense ratio', v: etf.expenseRatio != null ? `${etf.expenseRatio}%` : '—' },
                { k: 'Dividend yield', v: etf.dividendYield != null ? `${etf.dividendYield}%` : '—' },
                { k: 'Category', v: String(etf.category).replace(/_/g, ' ') },
              ]
          ).map(s => (
            <div key={s.k} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5">
              <div className="text-[10.5px] uppercase tracking-wider text-[var(--text-3)]">{s.k}</div>
              <div className="text-[14px] text-[var(--text)] font-medium mt-1 capitalize">{s.v}</div>
            </div>
          ))}
        </div>

        {/* About */}
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-[var(--accent-2)]" />
            <h3 className="text-[14px] font-semibold text-[var(--text)]">
              About {etf.assetType === 'stock' ? etf.symbol : 'this ETF'}
            </h3>
          </div>
          <p className="text-[12.5px] text-[var(--text-2)] leading-relaxed">{etf.description}</p>
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <div className="text-[10.5px] uppercase tracking-wider text-[var(--text-3)] mb-1">
              {etf.assetType === 'stock' ? 'Recent news' : 'Top holdings'}
            </div>
            <div className="text-[12px] text-[var(--text-3)]">
              {etf.assetType === 'stock' ? 'News feed coming soon.' : 'Holdings data coming soon.'}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[var(--text-3)] leading-relaxed">
            Investing involves risk. This is a long-term investing option, not financial advice.
            Past performance does not guarantee future results.
          </p>
        </div>
      </div>

      {/* Sticky action bar — sits above the mobile bottom nav */}
      <div className="fixed inset-x-0 z-40 sticky-bar border-t border-[var(--border)] px-4 py-3 bottom-[88px] lg:bottom-0">
        <div className="max-w-2xl mx-auto flex items-center gap-2.5">
          <button onClick={() => setSheet('recurring')}
            className="h-12 px-4 rounded-2xl border border-[var(--border)] hover:bg-[var(--inset)] text-[var(--text-2)] text-[13px] font-medium flex items-center gap-1.5 transition-colors shrink-0">
            <Repeat className="w-4 h-4" /> Recurring
          </button>
          <button onClick={() => setSheet('buy')}
            className="flex-1 min-w-0 h-12 rounded-2xl text-white text-[15px] font-bold flex items-center justify-center transition-all active:scale-[0.98]"
            style={{ background: accent }}>
            Buy {etf.symbol}
          </button>
        </div>
      </div>

      {/* Buy / Recurring sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => !done && setSheet(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-[var(--card)] border-t border-[var(--border)] rounded-t-3xl p-5 pb-8 animate-[slideUp_.25s_ease-out]"
            style={{ animationName: 'none' }}
          >
            {done ? (
              <div className="py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-[#00C805]/15 border border-[#00C805]/30 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-[#00C805]" />
                </div>
                <div className="text-[17px] font-semibold text-[var(--text)]">
                  {sheet === 'buy' ? 'Order submitted' : 'Recurring plan created'}
                </div>
                <p className="text-[12.5px] text-[var(--text-2)] mt-1">
                  {sheet === 'buy'
                    ? `${estQty.toFixed(4)} shares of ${etf.symbol}`
                    : `$${parseFloat(amount || '0').toFixed(2)} ${freq} into ${etf.symbol}`}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[17px] font-bold text-[var(--text)]">
                    {sheet === 'buy' ? `Buy ${etf.symbol}` : `Recurring · ${etf.symbol}`}
                  </h3>
                  <button onClick={() => setSheet(null)} className="text-[var(--text-3)] hover:text-[var(--text)]">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {sheet === 'buy' && (
                  <div className="flex gap-2 mb-4">
                    {(['dollars', 'shares'] as const).map(m => (
                      <button key={m} onClick={() => setMode(m)}
                        className={`flex-1 h-9 rounded-xl text-[12.5px] font-semibold capitalize transition-colors ${
                          mode === m ? 'bg-[var(--text)] text-[var(--surface)]' : 'bg-[var(--inset)] text-[var(--text-2)] border border-[var(--border)]'
                        }`}>
                        {m === 'dollars' ? 'In dollars' : 'In shares'}
                      </button>
                    ))}
                  </div>
                )}

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--inset)] p-4 mb-4">
                  <div className="text-[11px] uppercase tracking-wider text-[var(--text-3)] mb-1">
                    {sheet === 'recurring' ? 'Amount per cycle' : mode === 'dollars' ? 'Amount (USD)' : 'Shares'}
                  </div>
                  <div className="flex items-center gap-1">
                    {(sheet === 'recurring' || mode === 'dollars') && <span className="text-[28px] font-bold text-[var(--text)]">$</span>}
                    <input
                      autoFocus
                      inputMode="decimal"
                      value={amount}
                      onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="0"
                      className="flex-1 bg-transparent outline-none text-[28px] font-bold text-[var(--text)] placeholder:text-[var(--text-3)] w-full"
                    />
                  </div>
                </div>

                {sheet === 'buy' && (
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {['10', '25', '50', '100'].map(q => (
                      <button key={q} onClick={() => setAmount(q)}
                        className="h-9 rounded-xl bg-[var(--inset)] border border-[var(--border)] text-[var(--text-2)] text-[12.5px] font-medium hover:border-[var(--border-strong)] transition-colors">
                        {mode === 'dollars' ? `$${q}` : q}
                      </button>
                    ))}
                  </div>
                )}

                {sheet === 'recurring' && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {(['daily', 'weekly', 'monthly'] as const).map(f => (
                      <button key={f} onClick={() => setFreq(f)}
                        className={`h-9 rounded-xl text-[12.5px] font-semibold capitalize transition-colors ${
                          freq === f ? 'bg-[var(--accent-2)] text-[var(--text)]' : 'bg-[var(--inset)] text-[var(--text-2)] border border-[var(--border)]'
                        }`}>
                        {f}
                      </button>
                    ))}
                  </div>
                )}

                {/* Preview */}
                <div className="space-y-2 mb-5 text-[12.5px]">
                  <Row k="Symbol" v={etf.symbol} />
                  {sheet === 'buy' && <Row k="Est. quantity" v={`${estQty ? estQty.toFixed(4) : '0'} shares`} />}
                  <Row k="Est. price" v={`$${etf.seedPrice.toFixed(2)}`} />
                  {sheet === 'buy' && <Row k="Est. cost" v={`$${estCost.toFixed(2)}`} />}
                  <Row k="Buying power" v={`$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                  <Row k="Order type" v="Market" />
                </div>

                <p className="text-[10.5px] text-[var(--text-3)] mb-4 leading-relaxed">
                  Market orders execute at the next available price. Investing involves risk.
                  Past performance does not guarantee future results.
                </p>

                {submitError && (
                  <div className="mb-3 px-3 py-2.5 rounded-xl bg-[#FF4D3D]/10 border border-[#FF4D3D]/25 text-[#FF4D3D] text-[12px]">
                    {submitError}
                  </div>
                )}

                <button
                  onClick={submit}
                  disabled={!amount || parseFloat(amount) <= 0 || submitting}
                  className="w-full h-13 py-3.5 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: accent }}>
                  {submitting
                    ? 'Placing order…'
                    : sheet === 'buy' ? `Buy ${etf.symbol}` : 'Start recurring plan'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--text-3)]">{k}</span>
      <span className="text-[var(--text)] font-medium">{v}</span>
    </div>
  );
}
