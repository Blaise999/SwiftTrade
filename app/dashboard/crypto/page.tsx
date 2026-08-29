'use client';

import { AssetLogo } from '@/components/AssetLogo';
import { trace } from '@/lib/trace';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, TrendingUp, TrendingDown, ChevronRight, Sparkles, Eye, EyeOff, ArrowDownLeft, Repeat, X } from 'lucide-react';
import { useStore } from '@/lib/supabase/store-supabase';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { n, fmtUSD, fmtPct } from '@/lib/calc';

/* ── Crypto catalog (seed prices; live feed overrides when COINGECKO_API_KEY is set) ── */
import { COINS, CAT_LABELS, byCat, topMoversCrypto as topMovers, popularCrypto as popular, getCoin, fmtCryptoPrice as fmtPrice, type Coin, type CryptoCat } from '@/lib/crypto-catalog';
const catRows: CryptoCat[] = ['layer1', 'defi', 'meme', 'exchange', 'gaming', 'stable'];

const section = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] as any } }),
};

export default function CryptoHome() {
  const { user, refreshUser } = useStore();
  const [hide, setHide] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [holdings, setHoldings] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const [refetchTick, setRefetchTick] = useState(0);
  useRefetchOnFocus(() => setRefetchTick((t) => t + 1));
  const [live, setLive] = useState<Record<string, { price: number; change: number }>>({});
  // live crypto prices (Binance, keyless), refreshed every 30s
  useEffect(() => {
    const syms = COINS.map((c: Coin) => c.symbol).join(',');
    const load = () => fetch(`/api/crypto/prices?symbols=${syms}`, { cache: 'no-store' })
      .then(r => r.json()).then(j => { if (j?.prices) setLive(j.prices); }).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  const liveCoin = (c: any) => ({ ...c, price: live[c.symbol?.toUpperCase()]?.price ?? c.price, change: live[c.symbol?.toUpperCase()]?.change ?? c.change });

  useEffect(() => { setMounted(true); if (user?.id) refreshUser(); /* eslint-disable-next-line */ }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const r = await fetch(`/api/holdings?userId=${user.id}&market=crypto`, { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        trace('crypto-page', 'fetched /api/holdings', { userId: user.id, count: j?.holdings?.length ?? 'none', raw: j });
        if (Array.isArray(j?.holdings)) {
          // /api/holdings already returns LIVE price + value — use them directly (no re-valuation flash)
          const withVal = j.holdings.map((h: any) => {
            const meta = COINS.find((c: Coin) => c.symbol === String(h.symbol).toUpperCase());
            const lp = live[String(h.symbol).toUpperCase()];
            const price = n(h.price) || lp?.price || meta?.price || n(h.avgPrice) || 0;   // server live first
            const avg = n(h.avgPrice) || price;
            return { ...h, price, avgPrice: avg, change: n(h.change) || lp?.change || meta?.change || 0, value: n(h.value) || n(h.quantity) * price };
          });
          trace('crypto-page', 'setHoldings', { count: withVal.length, symbols: withVal.map((h: any) => h.symbol) });
          setHoldings(withVal);
        }
      } catch {} finally { setReady(true); }
    })();
  }, [user?.id, refetchTick]);

  useEffect(() => { if (searchOpen) setTimeout(() => searchRef.current?.focus(), 60); }, [searchOpen]);

  const cryptoBalance = useMemo(() => holdings.reduce((s, h: any) => s + n(h.value), 0), [holdings]);
  const totalCost = useMemo(() => holdings.reduce((s, h: any) => s + n(h.quantity) * n(h.avgPrice), 0), [holdings]);
  const dayPnl = useMemo(() => holdings.reduce((s, h: any) => { const v = n(h.value); const c = n(h.change); return s + (v - v / (1 + c / 100)); }, 0), [holdings]);
  const totalPnl = cryptoBalance - totalCost;
  const totalPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const dayPct = (cryptoBalance - dayPnl) > 0 ? (dayPnl / (cryptoBalance - dayPnl)) * 100 : 0;
  const up = totalPnl >= 0;
  const dayUp = dayPnl >= 0;

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return COINS.filter((c: Coin) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)).slice(0, 24);
  }, [query]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden pb-28">
      <div className="w-full max-w-2xl mx-auto px-3 sm:px-4">

        {/* Header */}
        <div className="flex items-center justify-between pt-5 mb-1">
          <p className="text-[13px] text-[var(--text-2)]">{greeting},{' '}
            <span className="text-[var(--text)] font-semibold">{user?.firstName || 'Trader'}</span>
          </p>
          <button onClick={() => setSearchOpen(true)} aria-label="Search crypto"
            className="w-9 h-9 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--inset)] transition-colors active:scale-95">
            <Search className="w-4 h-4 text-[var(--text-2)]" />
          </button>
        </div>

        {/* Hero balance card */}
        <motion.div variants={section} initial="hidden" animate="show" custom={0}
          className="relative mt-3 overflow-hidden rounded-3xl border border-white/[0.07] bg-[var(--inset)] p-5">
          <div className={`pointer-events-none absolute -top-24 -right-10 w-72 h-72 rounded-full blur-[90px] opacity-40 ${up ? 'bg-[#00C805]/30' : 'bg-[#FF4D3D]/25'}`} />
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-3)]">Crypto balance</span>
              <button onClick={() => setHide(!hide)} className="text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors">
                {hide ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="mt-1.5 text-[clamp(34px,11vw,48px)] leading-none font-extrabold text-[var(--text)] tracking-tight tabular-nums">
              {hide ? '••••••' : !ready ? <span className="inline-block h-8 w-44 rounded-lg bg-[var(--card)] animate-pulse align-middle" /> : fmtUSD(cryptoBalance)}
            </div>
            {!ready ? (
              <div className="mt-2 h-4 w-36 rounded bg-[var(--card)] animate-pulse" />
            ) : cryptoBalance > 0 ? (
              <>
                <div className={`mt-2 flex items-center gap-1.5 text-[14px] font-semibold tabular-nums ${dayUp ? 'text-[#00C805]' : 'text-[#FF4D3D]'}`}>
                  {dayUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {hide ? '••••' : <>{dayUp ? '+' : '−'}{fmtUSD(Math.abs(dayPnl))}</>}
                  <span className="text-[var(--text-3)] font-normal">({dayUp ? '+' : ''}{dayPct.toFixed(2)}%) today</span>
                </div>
                <div className={`mt-1 flex items-center gap-1.5 text-[12.5px] font-medium tabular-nums ${up ? 'text-[#00C805]' : 'text-[#FF4D3D]'}`}>
                  {hide ? '••••' : <>{up ? '▲ +' : '▼ −'}{fmtUSD(Math.abs(totalPnl))}</>}
                  <span className="text-[var(--text-3)] font-normal">({up ? '+' : ''}{totalPct.toFixed(2)}%) all-time P&L</span>
                </div>
              </>
            ) : (
              <div className="mt-2 text-[13px] text-[var(--text-3)]">No crypto yet — buy a coin below or use SwiftBridge</div>
            )}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div variants={section} initial="hidden" animate="show" custom={1} className="mt-4 grid grid-cols-3 gap-2.5">
          <Link href="/dashboard/deposit" prefetch={false}
            className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-[#00C805]/10 border border-[#00C805]/20 hover:bg-[#00C805]/15 transition-all active:scale-[0.97]">
            <ArrowDownLeft className="w-[18px] h-[18px] text-[#00C805]" />
            <span className="text-[12px] text-[var(--text)] font-medium">Add cash</span>
          </Link>
          <Link href="/dashboard/bridge" prefetch={false}
            className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 hover:bg-[#7C5CFC]/15 transition-all active:scale-[0.97]">
            <Repeat className="w-[18px] h-[18px] text-[var(--accent-2)]" />
            <span className="text-[12px] text-[var(--text)] font-medium">SwiftBridge</span>
          </Link>
          <button onClick={() => setSearchOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--inset)] transition-all active:scale-[0.97]">
            <Search className="w-[18px] h-[18px] text-[var(--text-2)]" />
            <span className="text-[12px] text-[var(--text)] font-medium">Search</span>
          </button>
        </motion.div>

        {/* Your holdings */}
        {holdings.length > 0 && (
          <motion.section variants={section} initial="hidden" animate="show" custom={2} className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-bold text-[var(--text)] tracking-tight">Your holdings</h2>
              <span className="text-[11px] text-[var(--text-3)]">{holdings.length} coin{holdings.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden divide-y divide-white/[0.05]">
              {holdings.map((h: any) => {
                const sym = String(h.symbol).toUpperCase();
                const value = n(h.value);
                const cost = n(h.costBasis ?? n(h.quantity) * n(h.avgPrice));
                const pnl = value - cost;
                const pct = cost > 0 ? (pnl / cost) * 100 : 0;
                const gain = pnl >= 0;
                return (
                  <Link key={sym} href={`/dashboard/crypto/${sym}`} prefetch={false}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-[var(--inset)] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <AssetLogo symbol={sym} kind="crypto" size={40} className="rounded-full" />
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-[var(--text)] truncate">{sym}</div>
                        <div className="text-[11px] text-[var(--text-3)] truncate">{Number(h.quantity).toFixed(6)} {sym}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[14px] font-semibold text-[var(--text)] tabular-nums">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className={`text-[12px] tabular-nums font-medium ${gain ? 'text-[#00C805]' : 'text-[#FF4D3D]'}`}>
                        {gain ? '+' : ''}${Math.abs(pnl).toFixed(2)} ({gain ? '+' : ''}{pct.toFixed(2)}%)
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.section>
        )}

        <CryptoRail custom={3} title="Top movers" items={topMovers.map(liveCoin)} right={<SeeAll onClick={() => setSearchOpen(true)} label="Search" />} />
        <CryptoRail custom={4} title="Popular crypto" items={popular.map(liveCoin)} right={<span />} />

        {/* Buy Bitcoin highlight (mirrors the S&P 500 block) */}
        <motion.section variants={section} initial="hidden" animate="show" custom={5} className="mt-8">
          <div className="rounded-2xl border border-[#F7931A]/20 bg-gradient-to-br from-[#F7931A]/[0.08] to-transparent p-4 mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-[#F7931A]" />
              <h2 className="text-[16px] font-bold text-[var(--text)] tracking-tight">New to crypto?</h2>
            </div>
            <p className="text-[12.5px] text-[var(--text-2)] leading-relaxed">
              Bitcoin and Ethereum are the two largest cryptocurrencies by market cap. You can buy any amount —
              you don&apos;t need to buy a whole coin. Or use SwiftBridge to convert your local currency straight into crypto.
            </p>
          </div>
          <div className="space-y-2.5">
            {COINS.slice(0, 2).map((c: Coin) => <CryptoWideCard key={c.symbol} coin={liveCoin(c)} />)}
          </div>
        </motion.section>

        {/* Category rows */}
        {catRows.map((cat, i) => {
          const list = byCat(cat);
          if (!list.length) return null;
          return <CryptoRail key={cat} custom={7 + i} title={CAT_LABELS[cat]} items={list.map(liveCoin)} right={<span />} />;
        })}

        <div className="h-10" />
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-[var(--surface)]/95 backdrop-blur-sm">
          <div className="w-full max-w-2xl mx-auto px-4 pt-5">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-2xl bg-[var(--card)] border border-[var(--border)] px-4 py-3">
                <Search className="w-4 h-4 text-[var(--text-3)]" />
                <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search coins…"
                  className="flex-1 bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--text-3)]" />
              </div>
              <button onClick={() => { setSearchOpen(false); setQuery(''); }} className="p-2 text-[var(--text-3)] hover:text-[var(--text)]"><X className="w-5 h-5" /></button>
            </div>
            <div className="mt-4 space-y-1.5">
              {results.map((c: Coin) => (
                <Link key={c.symbol} href={`/dashboard/crypto/${c.symbol}`} onClick={() => setSearchOpen(false)}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[var(--card)] border border-[var(--border)] px-4 py-3 hover:bg-[var(--inset)]">
                  <div className="flex items-center gap-3">
                    <AssetLogo symbol={c.symbol} kind="crypto" size={36} className="rounded-full" />
                    <div><div className="font-semibold text-[var(--text)] text-sm">{c.symbol}</div><div className="text-[11px] text-[var(--text-3)]">{c.name}</div></div>
                  </div>
                  <div className="text-right"><div className="text-sm font-semibold tabular-nums">${fmtPrice(c.price)}</div>
                    <div className={`text-[11px] ${c.change >= 0 ? 'text-[#00C805]' : 'text-[#FF4D3D]'}`}>{c.change >= 0 ? '+' : ''}{c.change}%</div></div>
                </Link>
              ))}
              {query && results.length === 0 && <div className="text-center text-[var(--text-3)] text-sm py-8">No coins match “{query}”.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── card + rail (crypto twins of EtfCard/Rail) ── */
function CryptoCard({ coin }: { coin: Coin }) {
  const up = coin.change >= 0;
  return (
    <Link href={`/dashboard/crypto/${coin.symbol}`} prefetch={false}
      className="group relative shrink-0 snap-start min-w-[200px] w-[200px] sm:w-[220px] min-h-[152px] flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--inset)] hover:border-[var(--border-strong)] transition-all p-4 active:scale-[0.98]">
      <div className="flex items-center justify-between mb-3">
        <AssetLogo symbol={coin.symbol} kind="crypto" size={38} className="rounded-full" />
        <span className="shrink-0 text-[9px] uppercase tracking-wider rounded px-1.5 py-0.5 tag-stock">Crypto</span>
      </div>
      <div className="mb-3">
        <div className="text-[15px] font-semibold text-[var(--text)] tracking-tight truncate">{coin.symbol}</div>
        <div className="text-[11px] text-[var(--text-3)] truncate">{coin.name}</div>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-[20px] font-bold text-[var(--text)] tabular-nums leading-none">${fmtPrice(coin.price)}</div>
        <div className={`flex items-center gap-0.5 text-[12px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${up ? 'text-[#00C805] bg-[#00C805]/10' : 'text-[#FF4D3D] bg-[#FF4D3D]/10'}`}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {up ? '+' : ''}{coin.change.toFixed(2)}%
        </div>
      </div>
    </Link>
  );
}

function CryptoWideCard({ coin }: { coin: Coin }) {
  const up = coin.change >= 0;
  return (
    <Link href={`/dashboard/crypto/${coin.symbol}`} prefetch={false}
      className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3.5 hover:bg-[var(--inset)] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <AssetLogo symbol={coin.symbol} kind="crypto" size={44} className="rounded-full" />
        <div className="min-w-0"><div className="text-[15px] font-semibold text-[var(--text)]">{coin.symbol}</div><div className="text-[12px] text-[var(--text-3)] truncate">{coin.name}</div></div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[15px] font-bold text-[var(--text)] tabular-nums">${fmtPrice(coin.price)}</div>
        <div className={`text-[12px] font-semibold ${up ? 'text-[#00C805]' : 'text-[#FF4D3D]'}`}>{up ? '+' : ''}{coin.change.toFixed(2)}%</div>
      </div>
    </Link>
  );
}

function CryptoRail({ title, items, right, custom = 0 }: { title: string; items: Coin[]; right?: React.ReactNode; custom?: number }) {
  return (
    <motion.section variants={section} initial="hidden" animate="show" custom={custom} className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-bold text-[var(--text)] tracking-tight">{title}</h2>
        {right}
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1 snap-x">
        {items.map((c: Coin) => <CryptoCard key={c.symbol} coin={c} />)}
      </div>
    </motion.section>
  );
}

function SeeAll({ onClick, label }: { onClick: () => void; label: string }) {
  return <button onClick={onClick} className="inline-flex items-center gap-0.5 text-[12px] font-medium text-[var(--text-2)] hover:text-[var(--text)]">{label}<ChevronRight className="w-3.5 h-3.5" /></button>;
}
function SeeAllLink({ href, label }: { href: string; label: string }) {
  return <Link href={href} prefetch={false} className="inline-flex items-center gap-0.5 text-[12px] font-medium text-[var(--text-2)] hover:text-[var(--text)]">{label}<ChevronRight className="w-3.5 h-3.5" /></Link>;
}
