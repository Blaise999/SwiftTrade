'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Shield, ShieldCheck, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useStore } from '@/lib/supabase/store-supabase';

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
};

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export default function PortfolioPage() {
  const { user } = useStore();
  const userId = (user as any)?.id as string | undefined;
  const cash = num((user as any)?.balance_available ?? (user as any)?.balance);

  const [crypto, setCrypto] = useState<Holding[]>([]);
  const [stocks, setStocks] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

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
        const price = num(p.avgPrice);
        return {
          symbol: String(p.symbol).toUpperCase(), kind: 'crypto', quantity: qty,
          price, value: num(qty * price), pnl: null, pnlPct: null,
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
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const toggleShield = async (h: Holding) => {
    if (!userId) return;
    const next = !h.shieldEnabled;
    setBusy(h.symbol);
    // optimistic
    const set = h.kind === 'crypto' ? setCrypto : setStocks;
    set(prev => prev.map(x => x.symbol === h.symbol ? { ...x, shieldEnabled: next } : x));
    try {
      if (h.kind === 'crypto') {
        await fetch('/api/portfolio', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, symbol: h.symbol, updates: { shieldEnabled: next } }),
        });
      } else {
        await fetch('/api/positions/shield', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, symbol: h.symbol, enabled: next }),
        });
      }
    } catch {
      set(prev => prev.map(x => x.symbol === h.symbol ? { ...x, shieldEnabled: !next } : x)); // revert
    } finally {
      setBusy(null);
    }
  };

  const cryptoValue = useMemo(() => crypto.reduce((s, h) => s + h.value, 0), [crypto]);
  const stockValue = useMemo(() => stocks.reduce((s, h) => s + h.value, 0), [stocks]);
  const total = cash + cryptoValue + stockValue;
  const shieldCount = [...crypto, ...stocks].filter(h => h.shieldEnabled).length;

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text)]">
      <div className="mx-auto max-w-4xl px-4 lg:px-6 pt-6 pb-28">

        {/* Header / totals */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6">
          <div className="text-[12px] uppercase tracking-wide text-[var(--text-3)]">Total net worth</div>
          <div className="mt-1 text-[38px] leading-none font-bold gradient-text num">{usd(total)}</div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <Tile label="Cash" value={usd(cash)} icon={<Wallet className="w-4 h-4" />} />
            <Tile label="Crypto" value={usd(cryptoValue)} />
            <Tile label="Stocks" value={usd(stockValue)} />
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
            <Section title="Crypto" holdings={crypto} busy={busy} onShield={toggleShield} />
            <Section title="Stocks & ETFs" holdings={stocks} busy={busy} onShield={toggleShield} />
            {crypto.length === 0 && stocks.length === 0 && (
              <p className="mt-8 text-center text-[var(--text-3)] text-sm">
                You don’t hold any assets yet. Buy stocks or crypto and they’ll appear here.
              </p>
            )}
          </>
        )}

        <p className="mt-8 text-[11px] text-[var(--text-3)] leading-relaxed text-center">
          Shield locks in the current value of a single holding. It applies per stock and per coin —
          toggle it on the position you want to protect. Not financial advice.
        </p>
      </div>
    </div>
  );
}

function Tile({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[var(--inset)] p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-3)]">{icon}{label}</div>
      <div className="mt-1 font-semibold text-[var(--text)] num">{value}</div>
    </div>
  );
}

function Section({
  title, holdings, busy, onShield,
}: { title: string; holdings: Holding[]; busy: string | null; onShield: (h: Holding) => void }) {
  if (!holdings.length) return null;
  return (
    <div className="mt-6">
      <h2 className="text-[13px] font-semibold text-[var(--text-2)] mb-2 px-1">{title}</h2>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {holdings.map((h, i) => {
          const up = (h.pnl ?? 0) >= 0;
          return (
            <div key={h.symbol}
              className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-[var(--border)]' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-[var(--inset)] border border-[var(--border)] flex items-center justify-center shrink-0">
                <span className="text-[12px] font-bold text-[var(--text)]">{h.symbol.slice(0, 3)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[var(--text)] truncate">{h.symbol}</span>
                  {h.shieldEnabled && <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-2)] shrink-0" />}
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
              <button
                onClick={() => onShield(h)}
                disabled={busy === h.symbol}
                title={h.shieldEnabled ? 'Shield on — tap to remove' : 'Shield this position'}
                className={`shrink-0 h-9 w-9 rounded-xl border flex items-center justify-center transition ${
                  h.shieldEnabled
                    ? 'border-[var(--accent-2)] text-[var(--accent-2)] bg-[var(--accent-2)]/10'
                    : 'border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text)] hover:border-[var(--border-strong)]'
                } disabled:opacity-50`}>
                {h.shieldEnabled ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
