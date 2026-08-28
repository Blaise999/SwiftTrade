'use client';

import { useEffect, useMemo, useState } from 'react';
import { syncPortfolio, applyOptimisticTrade } from '@/hooks/usePortfolioSync';
import { notifyHoldingsChanged } from '@/hooks/useRefetchOnFocus';
import { Sparkline } from '@/components/Sparkline';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { AssetLogo } from '@/components/AssetLogo';
import { ShieldControl } from '@/components/trade/ShieldControl';
import { useStore } from '@/lib/supabase/store-supabase';
import { getCoin, fmtCryptoPrice } from '@/lib/crypto-catalog';
import { n, fmtUSD } from '@/lib/calc';

export default function CryptoDetail() {
  const params = useParams();
  const router = useRouter();
  const symbol = String(params?.symbol || '').toUpperCase();
  const coin = getCoin(symbol);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [liveChange, setLiveChange] = useState<number | null>(null);
  useEffect(() => {
    if (!symbol) return;
    const load = () => fetch(`/api/crypto/prices?symbols=${symbol}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        const lp = j?.prices?.[symbol];
        if (lp && lp.price > 0) { setLivePrice(lp.price); setLiveChange(lp.change); }
      }).catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [symbol]);

  const { user, refreshUser } = useStore();
  const [position, setPosition] = useState<any>(null);
  const [optimisticSpent, setOptimisticSpent] = useState(0);
  const [range, setRange] = useState<'1D' | '1W' | '1M' | '1Y'>('1D');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(0);

  const price = livePrice ?? coin?.price ?? 0;
  const chg = liveChange ?? coin?.change ?? 0;

  const loadPosition = async () => {
    const uid = (user as any)?.id;
    if (!uid) return;
    try {
      const j = await (await fetch(`/api/holdings?userId=${uid}&market=crypto`, { cache: 'no-store' })).json();
      const mine = (j?.holdings || []).find((p: any) => String(p.symbol).toUpperCase() === symbol);
      setPosition(mine && n(mine.quantity) > 0 ? mine : null);
    } catch {}
  };
  useEffect(() => { loadPosition(); /* eslint-disable-next-line */ }, [(user as any)?.id, symbol, done]);

  const cash = Math.max(0, n((user as any)?.balance_available) - optimisticSpent);
  const usd = n(amount);
  const qtyPreview = price > 0 ? usd / price : 0;
  const up = chg >= 0;

  const posValue = position ? n(position.quantity) * price : 0;
  const posCost = position ? n(position.costBasis ?? n(position.quantity) * n(position.avgPrice)) : 0;
  const posPnl = posValue - posCost;
  const posPct = posCost > 0 ? (posPnl / posCost) * 100 : 0;

  const submit = async () => {
    const uid = (user as any)?.id;
    if (!uid || usd <= 0) return;
    setBusy(true); setMsg('');

    // ── optimistic: update balance + position instantly ──
    const optQty = (usd / price) * (side === 'buy' ? 1 : -1);
    setOptimisticSpent((s) => s + (side === 'buy' ? usd : -usd));
    // broadcast to every mounted page instantly
    applyOptimisticTrade({
      symbol, kind: 'crypto', side: side === 'buy' ? 'buy' : 'sell',
      quantity: Math.abs(usd / price), price, cost: usd,
    });
    setPosition((prev: any) => {
      const prevQty = n(prev?.quantity) || 0;
      const newQty = prevQty + optQty;
      if (newQty <= 1e-9) return null;
      return { ...(prev || { symbol }), quantity: newQty, avgPrice: n(prev?.avgPrice) || price, price };
    });

    try {
      const j = await (await fetch('/api/crypto/buy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, symbol, name: coin?.name, usdAmount: usd, price, side }),
      })).json();
      if (j?.ok) {
        setMsg(`${side === 'buy' ? 'Bought' : 'Sold'} ${j.quantity.toFixed(6)} ${symbol}`);
        setAmount(''); setDone(d => d + 1); refreshUser(); router.refresh(); notifyHoldingsChanged(); syncPortfolio(uid);
        setTimeout(() => setOptimisticSpent(0), 1200);   // let the real balance catch up
      } else {
        setMsg(j?.error || 'Failed');
        setOptimisticSpent(0); setDone(d => d + 1); syncPortfolio(uid);   // revert to server truth
      }
    } catch (e: any) {
      setMsg(e?.message || 'Failed'); setOptimisticSpent(0); setDone(d => d + 1);
    }
    finally { setBusy(false); }
  };

  if (!coin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-[var(--text-2)] gap-3">
        <p>Coin “{symbol}” not found.</p>
        <Link href="/dashboard/crypto" className="text-[var(--accent-2)]">Back to crypto</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden pb-28">
      <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 pt-4">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-[var(--text-3)] hover:text-[var(--text)] mb-3">
          <ChevronLeft className="w-5 h-5" /> Back
        </button>

        {/* identity */}
        <div className="flex items-center gap-3">
          <AssetLogo symbol={symbol} kind="crypto" size={56} className="rounded-2xl" />
          <div>
            <div className="text-[20px] font-bold text-[var(--text)]">{symbol}</div>
            <div className="text-[13px] text-[var(--text-3)]">{coin.name}</div>
          </div>
        </div>
        <div className="mt-4 flex items-end gap-3">
          <div className="text-[34px] font-extrabold text-[var(--text)] tabular-nums leading-none">
            {livePrice == null
              ? <span className="inline-block h-8 w-32 rounded-lg bg-[var(--card)] animate-pulse align-middle" />
              : `$${fmtCryptoPrice(price)}`}
          </div>
          {livePrice != null && (
          <div className={`flex items-center gap-1 text-[14px] font-semibold mb-1 ${up ? 'text-[#00C805]' : 'text-[#FF4D3D]'}`}>
            {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {up ? '+' : ''}{chg.toFixed(2)}%
          </div>
          )}
        </div>

        {/* live glide chart */}
        <div className="mt-5">
          <Sparkline symbol={symbol} kind="crypto" range={range} height={190} />
          <div className="mt-3 flex gap-1.5">
            {(['1D', '1W', '1M', '1Y'] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${range === r ? 'bg-[var(--accent)] text-black' : 'text-[var(--text-3)] hover:bg-[var(--card)]'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* your position */}
        {position && (
          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">Your position</div>
                <div className="text-[15px] font-semibold text-[var(--text)]">{n(position.quantity).toFixed(6)} {symbol}</div>
              </div>
              <div className="text-right">
                <div className="text-[17px] font-bold text-[var(--text)] tabular-nums">{fmtUSD(posValue)}</div>
                <div className={`text-[12px] font-medium tabular-nums ${posPnl >= 0 ? 'text-[#00C805]' : 'text-[#FF4D3D]'}`}>
                  {posPnl >= 0 ? '+' : ''}${Math.abs(posPnl).toFixed(2)} ({posPnl >= 0 ? '+' : ''}{posPct.toFixed(2)}%)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* shield mode (only when you hold it) */}
        {position && (
          <div className="mt-5">
            <ShieldControl
              userId={(user as any)?.id}
              symbol={symbol}
              kind="crypto"
              name={coin.name}
              price={price}
              initialShielded={!!position.shieldEnabled}
              positionValue={n(position.quantity) * price}
            />
          </div>
        )}

        {/* trade panel */}
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex bg-[var(--inset)] rounded-xl p-1 mb-4">
            {(['buy', 'sell'] as const).map(s => (
              <button key={s} onClick={() => setSide(s)}
                className={`flex-1 py-2 rounded-lg text-[13px] font-semibold capitalize transition ${
                  side === s ? (s === 'buy' ? 'bg-[#00C805] text-[#04140A]' : 'bg-[#FF4D3D] text-white') : 'text-[var(--text-3)]'
                }`}>{s}</button>
            ))}
          </div>

          <label className="text-[11px] text-[var(--text-3)]">Amount (USD)</label>
          <div className="mt-1 flex items-center rounded-xl bg-[var(--inset)] border border-[var(--border)] px-3">
            <span className="text-[var(--text-3)]">$</span>
            <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="0.00"
              className="flex-1 bg-transparent outline-none px-2 py-3 text-[18px] font-bold text-[var(--text)] tabular-nums" />
          </div>
          <div className="flex gap-1.5 mt-2">
            {[25, 50, 100, 250, 500].map(v => (
              <button key={v} onClick={() => setAmount(String(v))}
                className="flex-1 py-1.5 text-[12px] rounded-lg bg-[var(--inset)] text-[var(--text-2)] hover:text-[var(--text)]">${v}</button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-[12px] text-[var(--text-3)]">
            <span>≈ {qtyPreview.toFixed(6)} {symbol}</span>
            <span>Cash: {fmtUSD(cash)}</span>
          </div>

          {msg && <div className="mt-3 text-[13px] text-[var(--accent-2)]">{msg}</div>}

          <button onClick={submit} disabled={busy || usd <= 0}
            className={`mt-4 w-full py-3.5 rounded-2xl font-bold transition disabled:opacity-50 ${
              side === 'buy' ? 'bg-[#00C805] text-[#04140A] glow-up' : 'bg-[#FF4D3D] text-white glow-down'
            }`}>
            {busy ? '…' : side === 'buy' ? `Buy ${symbol}` : `Sell ${symbol}`}
          </button>
        </div>

        <p className="mt-5 text-[11px] text-[var(--text-3)] leading-relaxed text-center">
          Live market prices. Not financial advice.
        </p>
      </div>
    </div>
  );
}
