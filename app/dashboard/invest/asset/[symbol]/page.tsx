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

  if (!etf) {
    return (
      <div className="min-h-screen bg-[#080A0D] flex flex-col items-center justify-center px-6">
        <p className="text-[#A1A1AA] text-sm">ETF “{symbol}” not found.</p>
        <Link href="/dashboard/invest" className="mt-3 text-[#3B82F6] text-sm">Back to investing</Link>
      </div>
    );
  }

  const up = etf.seedChangePct >= 0;
  const accent = up ? '#16C784' : '#FF4D4F';
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

  const submit = () => {
    setDone(true);
    setTimeout(() => { setSheet(null); setDone(false); setAmount(''); }, 1800);
  };

  return (
    <div className="min-h-screen bg-[#080A0D] pb-28">
      <div className="max-w-2xl mx-auto px-4 pt-5">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#101216] border border-white/[0.06] flex items-center justify-center hover:bg-[#14171D]">
            <ArrowLeft className="w-4 h-4 text-[#A1A1AA]" />
          </button>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-[#101216] border border-white/[0.06] flex items-center justify-center hover:bg-[#14171D] text-[#71717A] hover:text-[#F5C542]">
              <Star className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-full bg-[#101216] border border-white/[0.06] flex items-center justify-center hover:bg-[#14171D] text-[#71717A]">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Identity */}
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-bold text-white tracking-tight">{etf.symbol}</h1>
            <span className="text-[9px] uppercase tracking-wider text-[#F5C542] bg-[#F5C542]/10 border border-[#F5C542]/20 rounded px-1.5 py-0.5">ETF</span>
          </div>
          <p className="text-[13px] text-[#A1A1AA] mt-0.5">{etf.name}</p>
          <div className="mt-3 flex items-end gap-3">
            <div className="text-[34px] font-bold text-white tabular-nums leading-none">
              ${etf.seedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center gap-1 text-[14px] font-medium pb-1 tabular-nums`} style={{ color: accent }}>
              {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {up ? '+' : ''}{etf.seedChangePct.toFixed(2)}% today
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="mt-5 rounded-2xl border border-white/[0.06] bg-[#101216] p-4">
          <div className="h-[200px] flex items-center">
            <Sparkline seed={etf.seedPrice + RANGES.indexOf(range)} up={up} w={600} h={190} />
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`flex-1 h-8 rounded-lg text-[12px] font-semibold transition-colors ${
                  range === r ? 'text-[#04150d]' : 'text-[#71717A] hover:text-[#A1A1AA]'
                }`}
                style={range === r ? { background: accent } : {}}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {[
            { k: 'Tracks', v: etf.tracks },
            { k: 'Expense ratio', v: `${etf.expenseRatio}%` },
            { k: 'Dividend yield', v: etf.dividendYield ? `${etf.dividendYield}%` : '—' },
            { k: 'Category', v: etf.category.replace('_', ' ') },
          ].map(s => (
            <div key={s.k} className="rounded-xl border border-white/[0.06] bg-[#101216] p-3.5">
              <div className="text-[10.5px] uppercase tracking-wider text-[#71717A]">{s.k}</div>
              <div className="text-[14px] text-white font-medium mt-1 capitalize">{s.v}</div>
            </div>
          ))}
        </div>

        {/* About */}
        <div className="mt-5 rounded-2xl border border-white/[0.06] bg-[#101216] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-[#3B82F6]" />
            <h3 className="text-[14px] font-semibold text-white">About this ETF</h3>
          </div>
          <p className="text-[12.5px] text-[#A1A1AA] leading-relaxed">{etf.description}</p>
          <div className="mt-3 pt-3 border-t border-white/[0.05]">
            <div className="text-[10.5px] uppercase tracking-wider text-[#71717A] mb-1">Top holdings</div>
            <div className="text-[12px] text-[#52525B]">Holdings data coming soon.</div>
          </div>
          <p className="mt-3 text-[11px] text-[#52525B] leading-relaxed">
            Investing involves risk. This is a long-term investing option, not financial advice.
            Past performance does not guarantee future results.
          </p>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[#080A0D]/95 backdrop-blur-xl border-t border-white/[0.06] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2.5">
          <button onClick={() => setSheet('recurring')}
            className="h-12 px-4 rounded-2xl border border-white/[0.08] hover:bg-white/[0.04] text-[#A1A1AA] text-[13px] font-medium flex items-center gap-1.5 transition-colors">
            <Repeat className="w-4 h-4" /> Recurring
          </button>
          <button onClick={() => setSheet('buy')}
            className="flex-1 h-12 rounded-2xl text-[#04150d] text-[15px] font-bold flex items-center justify-center transition-all active:scale-[0.98]"
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
            className="relative w-full max-w-2xl bg-[#101216] border-t border-white/[0.08] rounded-t-3xl p-5 pb-8 animate-[slideUp_.25s_ease-out]"
            style={{ animationName: 'none' }}
          >
            {done ? (
              <div className="py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-[#16C784]/15 border border-[#16C784]/30 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-[#16C784]" />
                </div>
                <div className="text-[17px] font-semibold text-white">
                  {sheet === 'buy' ? 'Order submitted' : 'Recurring plan created'}
                </div>
                <p className="text-[12.5px] text-[#A1A1AA] mt-1">
                  {sheet === 'buy'
                    ? `${estQty.toFixed(4)} shares of ${etf.symbol}`
                    : `$${parseFloat(amount || '0').toFixed(2)} ${freq} into ${etf.symbol}`}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[17px] font-bold text-white">
                    {sheet === 'buy' ? `Buy ${etf.symbol}` : `Recurring · ${etf.symbol}`}
                  </h3>
                  <button onClick={() => setSheet(null)} className="text-[#71717A] hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {sheet === 'buy' && (
                  <div className="flex gap-2 mb-4">
                    {(['dollars', 'shares'] as const).map(m => (
                      <button key={m} onClick={() => setMode(m)}
                        className={`flex-1 h-9 rounded-xl text-[12.5px] font-semibold capitalize transition-colors ${
                          mode === m ? 'bg-white text-[#080A0D]' : 'bg-[#14171D] text-[#A1A1AA] border border-white/[0.06]'
                        }`}>
                        {m === 'dollars' ? 'In dollars' : 'In shares'}
                      </button>
                    ))}
                  </div>
                )}

                <div className="rounded-2xl border border-white/[0.06] bg-[#14171D] p-4 mb-4">
                  <div className="text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                    {sheet === 'recurring' ? 'Amount per cycle' : mode === 'dollars' ? 'Amount (USD)' : 'Shares'}
                  </div>
                  <div className="flex items-center gap-1">
                    {(sheet === 'recurring' || mode === 'dollars') && <span className="text-[28px] font-bold text-white">$</span>}
                    <input
                      autoFocus
                      inputMode="decimal"
                      value={amount}
                      onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="0"
                      className="flex-1 bg-transparent outline-none text-[28px] font-bold text-white placeholder:text-[#3F3F46] w-full"
                    />
                  </div>
                </div>

                {sheet === 'buy' && (
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {['10', '25', '50', '100'].map(q => (
                      <button key={q} onClick={() => setAmount(q)}
                        className="h-9 rounded-xl bg-[#14171D] border border-white/[0.06] text-[#A1A1AA] text-[12.5px] font-medium hover:border-white/[0.15] transition-colors">
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
                          freq === f ? 'bg-[#3B82F6] text-white' : 'bg-[#14171D] text-[#A1A1AA] border border-white/[0.06]'
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

                <p className="text-[10.5px] text-[#52525B] mb-4 leading-relaxed">
                  Market orders execute at the next available price. Investing involves risk.
                  Past performance does not guarantee future results.
                </p>

                <button
                  onClick={submit}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="w-full h-13 py-3.5 rounded-2xl text-[#04150d] text-[15px] font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: accent }}>
                  {sheet === 'buy' ? `Buy ${etf.symbol}` : 'Start recurring plan'}
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
      <span className="text-[#71717A]">{k}</span>
      <span className="text-white font-medium">{v}</span>
    </div>
  );
}
