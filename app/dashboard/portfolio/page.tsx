'use client';

import { AssetLogo } from '@/components/AssetLogo';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import Link from 'next/link';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { ShieldCheck, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { useStore } from '@/lib/supabase/store-supabase';
import { getCoin } from '@/lib/crypto-catalog';

type Holding = {
  symbol: string;
  name?: string;
  kind: 'crypto' | 'stock';
  quantity: number;
  price: number;       // per-unit value used for valuation
  value: number;       // quantity × price
  pnl?: number | null;
  pnlPct?: number | null;
  shieldEnabled: boolean;
  autoShieldEnabled?: boolean;
  shieldOnBelow?: number | null;
  shieldOffAbove?: number | null;
};

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export default function PortfolioPage() {
  const { user } = useStore();
  const userId = (user as any)?.id as string | undefined;
  const cash = num((user as any)?.balance_available ?? (user as any)?.balance);

  const [crypto, setCrypto] = useState<Holding[]>([]);
  const [refetchTick, setRefetchTick] = useState(0);
  useRefetchOnFocus(() => setRefetchTick((t) => t + 1));
  const [stocks, setStocks] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [hRes, iRes, sRes] = await Promise.all([
        // crypto holdings derived from the trades table (where buys ACTUALLY land)
        fetch(`/api/holdings?userId=${userId}&market=crypto`, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        fetch(`/api/invest/positions?userId=${userId}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        // crypto_positions shield flags (if any), merged in by symbol
        fetch(`/api/portfolio?userId=${userId}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      ]);

      const shieldBySymbol: Record<string, boolean> = {};
      for (const p of (sRes?.positions || [])) shieldBySymbol[String(p.symbol).toUpperCase()] = !!p.shieldEnabled;

      const cr: Holding[] = ((hRes?.holdings) || []).map((p: any) => {
        const qty = num(p.quantity);
        const avg = num(p.avgPrice);
        const marketPrice = num(p.price) || getCoin(p.symbol)?.price || avg;   // LIVE price from /api/holdings
        const value = num(p.value) || qty * marketPrice;
        const cost = qty * avg;
        const pnl = value - cost;
        return {
          symbol: String(p.symbol).toUpperCase(), kind: 'crypto', quantity: qty,
          price: marketPrice, value,
          pnl, pnlPct: cost > 0 ? (pnl / cost) * 100 : 0,
          shieldEnabled: !!shieldBySymbol[String(p.symbol).toUpperCase()],
        };
      }).filter((h: Holding) => h.quantity > 0);

      const st: Holding[] = ((iRes?.positions) || []).map((p: any) => {
        const qty = num(p.quantity);
        const price = num(p.price ?? p.avgPrice);
        return {
          symbol: String(p.symbol).toUpperCase(), name: p.name, kind: 'stock', quantity: qty,
          price, value: num(p.value ?? qty * price),
          pnl: p.pnl != null ? num(p.pnl) : null, pnlPct: p.pnlPct != null ? num(p.pnlPct) : null,
          shieldEnabled: !!p.shieldEnabled,
        };
      }).filter((h: Holding) => h.quantity > 0);

      setCrypto(cr); setStocks(st);
    } finally {
      setLoading(false);
    }
  }, [userId, refetchTick]);

  useEffect(() => { load(); }, [load]);

  const cryptoValue = useMemo(() => crypto.reduce((s, h) => s + h.value, 0), [crypto]);
  const stockValue = useMemo(() => stocks.reduce((s, h) => s + h.value, 0), [stocks]);
  const total = cash + cryptoValue + stockValue;
  const shieldCount = [...crypto, ...stocks].filter(h => h.shieldEnabled).length;

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text)]">
      <div className="mx-auto max-w-2xl px-3 sm:px-4 pt-6 pb-28">

        {/* Header / totals */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[var(--inset)] p-6">
          <div className="pointer-events-none absolute -top-24 -right-10 w-72 h-72 rounded-full blur-[90px] opacity-40 bg-[#00C805]/25" />
          <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-3)]">Total net worth</div>
          <div className="mt-1.5 text-[clamp(32px,10vw,44px)] leading-none font-extrabold text-[var(--text)] tracking-tight tabular-nums">{usd(total)}</div>
          <div className="mt-5 grid grid-cols-3 gap-2.5 text-sm">
            <Tile label="Cash" value={usd(cash)} tone="#00C805" />
            <Tile label="Crypto" value={usd(cryptoValue)} tone="#9B7CFF" />
            <Tile label="Stocks" value={usd(stockValue)} tone="#5B9BFF" />
          </div>
          </div>
          {shieldCount > 0 && (
            <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-[var(--accent-2)]">
              <ShieldCheck className="w-4 h-4" /> {shieldCount} position{shieldCount > 1 ? 's' : ''} shielded
            </div>
          )}
        </div>

        {loading ? (
          <p className="mt-8 text-center text-[var(--text-3)] text-sm">Loading your holdings…</p>
        ) : (
          <>
            <Section title="Crypto" holdings={crypto} />
            <Section title="Stocks & ETFs" holdings={stocks} />
            {crypto.length === 0 && stocks.length === 0 && (
              <p className="mt-8 text-center text-[var(--text-3)] text-sm">
                You don’t hold any assets yet. Buy stocks or crypto and they’ll appear here.
              </p>
            )}
          </>
        )}

        <div className="mt-8 rounded-2xl border border-[var(--accent-2)]/20 bg-[var(--accent-2)]/[0.05] p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-[var(--accent-2)]" />
            <span className="text-[13px] font-semibold text-[var(--text)]">What is Shield mode?</span>
          </div>
          <p className="text-[12px] text-[var(--text-2)] leading-relaxed">
            When you shield a holding, it&apos;s moved into a <span className="text-[var(--text)]">stable store</span> and its value is
            locked — it stops moving with the market, so a crash can&apos;t touch it. Turn Shield off and the holding goes right back
            to normal, tracking live prices again. Use the 🛡️ on any position to protect it instantly.
          </p>
          <p className="mt-2 text-[12px] text-[var(--text-2)] leading-relaxed">
            <span className="text-[var(--text)]">Auto-Shield</span> does it for you: set a floor and a ceiling, and it shields
            automatically when the price drops to your floor, then un-shields when it recovers to your ceiling — for both crypto and stocks.
          </p>
          <p className="mt-2 text-[10.5px] text-[var(--text-3)]">Not financial advice.</p>
        </div>
      </div>

      
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-3)]">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone || 'var(--text-3)' }} />{label}
      </div>
      <div className="mt-1 font-semibold text-[var(--text)] num tabular-nums">{value}</div>
    </div>
  );
}

function Section({ title, holdings }: { title: string; holdings: Holding[] }) {
  if (!holdings.length) return null;
  return (
    <div className="mt-6">
      <h2 className="text-[13px] font-semibold text-[var(--text-2)] mb-2 px-1">{title}</h2>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {holdings.map((h, i) => {
          const up = (h.pnl ?? 0) >= 0;
          const href = h.kind === 'crypto' ? `/dashboard/crypto/${h.symbol}` : `/dashboard/invest/asset/${h.symbol}`;
          return (
            <Link key={h.symbol} href={href} prefetch={false}
              className={`flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--inset)] transition-colors ${i > 0 ? 'border-t border-[var(--border)]' : ''}`}>
              <AssetLogo symbol={h.symbol} kind={h.kind === 'crypto' ? 'crypto' : 'stock'} size={40} className={h.kind === 'crypto' ? 'rounded-full shrink-0' : 'shrink-0'} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[var(--text)] truncate">{h.symbol}</span>
                  {h.shieldEnabled && <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />}
                </div>
                <div className="text-[11px] text-[var(--text-3)] truncate">
                  {h.quantity.toLocaleString('en-US', { maximumFractionDigits: 6 })} {h.kind === 'crypto' ? h.symbol : 'shares'}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold text-[var(--text)] num">{usd(h.value)}</div>
                {h.pnl != null && (
                  <div className={`text-[11px] font-medium num inline-flex items-center gap-0.5 ${up ? 'text-[#00C805]' : 'text-[#FF4D3D]'}`}>
                    {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {up ? '+' : ''}{usd(h.pnl)}{h.pnlPct != null ? ` (${h.pnlPct.toFixed(2)}%)` : ''}
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-3)] shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
