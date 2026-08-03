'use client';

import { AssetLogo } from '@/components/AssetLogo';
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
  const [stocks, setStocks] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [autoCfg, setAutoCfg] = useState<Holding | null>(null);
  const [floor, setFloor] = useState('');
  const [ceiling, setCeiling] = useState('');

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

  // run auto-shield with the same prices we display, so it stays consistent
  useEffect(() => {
    const uid = (user as any)?.id;
    if (!uid || (crypto.length + stocks.length) === 0) return;
    const prices: Record<string, number> = {};
    for (const h of [...crypto, ...stocks]) prices[h.symbol.toUpperCase()] = Number(h.price) || 0;
    fetch('/api/positions/auto-shield', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid, prices }),
    }).then(r => r.json()).then(j => { if (j?.changes?.length) load(); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crypto.length, stocks.length]);

  const openAuto = (h: Holding) => {
    setAutoCfg(h);
    setFloor(h.shieldOnBelow != null ? String(h.shieldOnBelow) : '');
    setCeiling(h.shieldOffAbove != null ? String(h.shieldOffAbove) : '');
  };
  const saveAuto = async (enabled: boolean) => {
    const uid = (user as any)?.id; const h = autoCfg;
    if (!uid || !h) return;
    await fetch('/api/positions/shield-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid, symbol: h.symbol, kind: h.kind, enabled, floor, ceiling }),
    }).catch(() => {});
    setAutoCfg(null); load();
  };

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
            <Section title="Crypto" holdings={crypto} busy={busy} onShield={toggleShield} onAuto={openAuto} />
            <Section title="Stocks & ETFs" holdings={stocks} busy={busy} onShield={toggleShield} onAuto={openAuto} />
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

      {autoCfg && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setAutoCfg(null)} />
          <div className="relative w-full sm:w-[400px] bg-[var(--card)] border border-[var(--border)] rounded-t-3xl sm:rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-[15px] font-semibold text-[var(--text)]">Auto-Shield · {autoCfg.symbol}</h3>
            </div>
            <p className="text-[12px] text-[var(--text-3)] mb-4">
              Shields automatically when the price falls to your floor, and returns to the market when it recovers to your ceiling.
            </p>
            <label className="text-[11px] text-[var(--text-3)]">Shield when price drops to (floor)</label>
            <div className="mt-1 mb-3 flex items-center rounded-xl bg-[var(--inset)] border border-[var(--border)] px-3">
              <span className="text-[var(--text-3)]">$</span>
              <input value={floor} onChange={e => setFloor(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="e.g. 60000"
                className="flex-1 bg-transparent outline-none px-2 py-2.5 text-[var(--text)] tabular-nums" />
            </div>
            <label className="text-[11px] text-[var(--text-3)]">Un-shield when price rises to (ceiling)</label>
            <div className="mt-1 mb-4 flex items-center rounded-xl bg-[var(--inset)] border border-[var(--border)] px-3">
              <span className="text-[var(--text-3)]">$</span>
              <input value={ceiling} onChange={e => setCeiling(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="e.g. 72000"
                className="flex-1 bg-transparent outline-none px-2 py-2.5 text-[var(--text)] tabular-nums" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => saveAuto(true)}
                className="flex-1 py-3 rounded-2xl bg-[var(--accent)] text-[#04140A] font-bold">Enable Auto-Shield</button>
              <button onClick={() => saveAuto(false)}
                className="px-4 py-3 rounded-2xl border border-[var(--border)] text-[var(--text-2)]">Turn off</button>
            </div>
          </div>
        </div>
      )}
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

function Section({
  title, holdings, busy, onShield, onAuto,
}: { title: string; holdings: Holding[]; busy: string | null; onShield: (h: Holding) => void; onAuto: (h: Holding) => void }) {
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
              <AssetLogo symbol={h.symbol} kind={h.kind === 'crypto' ? 'crypto' : 'stock'} size={40} className={h.kind === 'crypto' ? 'rounded-full shrink-0' : 'shrink-0'} />
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
                onClick={() => onAuto(h)}
                title="Auto-Shield settings"
                className={`shrink-0 h-9 px-2.5 rounded-xl border text-[11px] font-medium transition ${
                  h.autoShieldEnabled
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text)]'
                }`}>Auto</button>
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
