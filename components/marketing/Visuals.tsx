'use client';

/* ─────────────────────────────────────────────────────────────
   Hand-built pictorial views. No stock photos, no AI imagery:
   product-style mockups and illustrations drawn in SVG/JSX,
   matching the navy / gold / teal identity.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useState } from 'react';
import { C } from '@/components/marketing/Shell';

const PANEL = 'var(--panel)';
const PANEL2 = 'var(--bg)';
const LINE = 'var(--line)';

function Frame({ children, h = 340 }: { children: React.ReactNode; h?: number }) {
  return (
    <div className="relative overflow-hidden rounded-tr-[24px] rounded-bl-[24px] rounded-tl-sm rounded-br-sm border"
      style={{ borderColor: 'var(--line-strong)', background: PANEL2, minHeight: h }}>
      {children}
    </div>
  );
}

/* deterministic candles so SSR and client match */
function candles(seed: number, n: number) {
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const out: { o: number; c: number; h: number; l: number }[] = [];
  let price = 50;
  for (let i = 0; i < n; i++) {
    const drift = (rnd() - 0.46) * 9;
    const o = price; const c = Math.max(12, Math.min(88, price + drift));
    const h = Math.max(o, c) + rnd() * 4; const l = Math.min(o, c) - rnd() * 4;
    out.push({ o, c, h, l }); price = c;
  }
  return out;
}

/* ── STOCKS: trading terminal mock ── */
export function TerminalVisual() {
  const data = candles(77, 26);
  const W = 560, H = 200, cw = W / data.length;
  return (
    <Frame>
      {/* window chrome */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" /><span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" /><span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-[color:var(--t-hi)] font-semibold">NVDA</span>
          <span className="text-[color:var(--t-faint)]">NASDAQ</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'color-mix(in srgb, var(--profit) 15%, transparent)', color: C.hk }}>+3.12%</span>
        </div>
        <div className="text-[11px] text-[color:var(--t-faint)] tabular-nums">1D · 15m</div>
      </div>
      {/* chart */}
      <div className="px-3 pt-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {[40, 80, 120, 160].map((y) => <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="var(--wash-strong)" />)}
          {data.map((d, i) => {
            const up = d.c >= d.o;
            const x = i * cw + cw * 0.5;
            const y = (v: number) => H - (v / 100) * H;
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={y(d.h)} y2={y(d.l)} stroke={up ? C.hk : C.ny} strokeWidth="1.4" />
                <rect x={x - cw * 0.28} width={cw * 0.56} y={y(Math.max(d.o, d.c))} height={Math.max(3, Math.abs(y(d.o) - y(d.c)))} fill={up ? C.hk : C.ny} rx="1" />
              </g>
            );
          })}
        </svg>
      </div>
      {/* order strip */}
      <div className="grid grid-cols-3 gap-px border-t mx-0 mt-2" style={{ borderColor: LINE, background: LINE }}>
        {[['Buy $25', C.hk], ['Sell', C.ny], ['Recurring', C.gold]].map(([t, c]) => (
          <div key={t as string} className="py-3 text-center text-[12.5px] font-semibold" style={{ background: PANEL, color: c as string }}>{t}</div>
        ))}
      </div>
    </Frame>
  );
}

/* ── HKEX dual-listing visual ── */
export function DualMarketVisual() {
  const rows = [
    ['AAPL', 'NASDAQ', '$228.31', '+0.46%', true],
    ['NVDA', 'NASDAQ', '$132.90', '+3.12%', true],
    ['0700.HK', 'HKEX', 'HK$384.20', '-0.70%', false],
    ['9988.HK', 'HKEX', 'HK$78.55', '+1.10%', true],
    ['VOO', 'NYSE', '$512.40', '+0.30%', true],
  ];
  return (
    <Frame>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: LINE }}>
        <span className="text-[12px] uppercase tracking-[0.14em] text-[color:var(--t-sub)]">One watchlist, two exchanges</span>
        <span className="text-[11px] text-[color:var(--t-faint)]">delayed 15s</span>
      </div>
      <div className="divide-y" style={{ borderColor: LINE }}>
        {rows.map(([s, m, p, d, up]) => (
          <div key={s as string} className="flex items-center justify-between px-4 py-3" style={{ borderColor: 'var(--wash-strong)' }}>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg grid place-items-center text-[10px] font-bold border"
                style={{ borderColor: (m === 'HKEX' ? C.gold : C.teal) + '55', color: m === 'HKEX' ? C.gold : C.teal, background: 'var(--wash)' }}>
                {(s as string).slice(0, 2)}
              </span>
              <div>
                <div className="text-[13.5px] font-semibold text-[color:var(--t-hi)]">{s}</div>
                <div className="text-[10.5px] text-[color:var(--t-faint)]">{m}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[13px] text-[color:var(--t-hi)] tabular-nums font-medium">{p}</div>
              <div className="text-[11px] tabular-nums" style={{ color: up ? C.hk : C.ny }}>{d}</div>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ── CRYPTO: custody toggle + coins ── */
export function CryptoVisual() {
  return (
    <Frame>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: LINE }}>
        <span className="text-[12px] uppercase tracking-[0.14em] text-[color:var(--t-sub)]">Custody</span>
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: LINE }}>
          <span className="px-3 py-1 text-[11px] font-semibold text-[color:var(--on-accent)]" style={{ background: C.gold }}>Swifttrade</span>
          <span className="px-3 py-1 text-[11px] text-[color:var(--t-sub)]" style={{ background: PANEL }}>My wallet</span>
        </div>
      </div>
      <div className="p-4 space-y-2.5">
        {[
          ['BTC', 'Bitcoin', '$67,482', '+1.84%', '#F7931A', true],
          ['ETH', 'Ethereum', '$3,521', '-0.90%', '#627EEA', false],
          ['SOL', 'Solana', '$174.60', '+4.05%', '#14F195', true],
        ].map(([k, n, p, d, col, up]) => (
          <div key={k as string} className="flex items-center justify-between rounded-xl border px-3.5 py-3" style={{ borderColor: LINE, background: PANEL }}>
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg grid place-items-center text-[11px] font-bold text-[color:var(--t-hi)]" style={{ background: (col as string) + '22', border: `1px solid ${(col as string)}55` }}>{(k as string).slice(0, 2)}</span>
              <div>
                <div className="text-[13.5px] font-semibold text-[color:var(--t-hi)]">{k}</div>
                <div className="text-[10.5px] text-[color:var(--t-faint)]">{n}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[13px] text-[color:var(--t-hi)] tabular-nums font-medium">{p}</div>
              <div className="text-[11px] tabular-nums" style={{ color: up ? C.hk : C.ny }}>{d}</div>
            </div>
          </div>
        ))}
        <div className="rounded-xl border px-3.5 py-3 flex items-center justify-between" style={{ borderColor: 'color-mix(in srgb, var(--gold) 30%, transparent)', background: 'color-mix(in srgb, var(--gold) 5%, transparent)' }}>
          <span className="text-[12px] text-[color:var(--gold-light)]">Withdraw on-chain</span>
          <span className="text-[11px] text-[color:var(--t-sub)]">network fee shown first</span>
        </div>
      </div>
    </Frame>
  );
}

/* ── FX: live rate comparison ── */
export function FxVisual() {
  const [r, setR] = useState(7.8132);
  useEffect(() => { const id = setInterval(() => setR((v) => +(v + (Math.random() - 0.5) * 0.002).toFixed(4)), 1800); return () => clearInterval(id); }, []);
  return (
    <Frame>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: LINE }}>
        <span className="text-[12px] uppercase tracking-[0.14em] text-[color:var(--t-sub)]">USD &#8594; HKD · $10,000</span>
        <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: C.hk }}><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.hk }} />live</span>
      </div>
      <div className="p-4 space-y-2.5">
        {[
          { n: 'Swifttrade', rate: r, fee: '$4 flat', out: 10000 * r - 4 * r, best: true },
          { n: 'High-street bank', rate: r * 0.974, fee: '"free"', out: 10000 * r * 0.974, best: false },
          { n: 'Legacy remitter', rate: r * 0.989, fee: '$25', out: 10000 * r * 0.989 - 25 * r, best: false },
        ].map((x) => (
          <div key={x.n} className="rounded-xl border px-4 py-3.5" style={{ borderColor: x.best ? 'color-mix(in srgb, var(--gold) 45%, transparent)' : LINE, background: x.best ? 'color-mix(in srgb, var(--gold) 6%, transparent)' : PANEL }}>
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: x.best ? '#fff' : 'var(--t-sub)', fontWeight: x.best ? 600 : 400 }}>{x.n}</span>
              <span className="font-satoshi text-[15px] font-bold tabular-nums" style={{ color: x.best ? C.gold : 'var(--t-sub)' }}>{x.rate.toFixed(4)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-[color:var(--t-faint)]">fee {x.fee}</span>
              <span className="tabular-nums" style={{ color: x.best ? C.hk : 'var(--t-faint)' }}>you get HK${Math.round(x.out).toLocaleString()}</span>
            </div>
          </div>
        ))}
        <div className="text-[11px] text-[color:var(--t-faint)] pt-1">Illustrative. Bank markups vary; check yours against the live rate.</div>
      </div>
    </Frame>
  );
}

/* ── SwiftBridge transfer receipt ── */
export function BridgeReceiptVisual() {
  return (
    <Frame>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[12px] uppercase tracking-[0.14em] text-[color:var(--t-sub)]">Transfer receipt</span>
          <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold" style={{ background: 'color-mix(in srgb, var(--profit) 15%, transparent)', color: C.hk }}>Settled · 7.4s</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border p-4" style={{ borderColor: LINE, background: PANEL }}>
          <div>
            <div className="text-[11px] text-[color:var(--t-faint)]">From · New York</div>
            <div className="font-satoshi text-[20px] font-bold text-[color:var(--t-hi)] tabular-nums mt-0.5">$2,500.00</div>
            <div className="text-[11px] text-[color:var(--t-sub)]">USD</div>
          </div>
          <svg width="54" height="22" viewBox="0 0 54 22" fill="none">
            <path d="M2 11 H44" stroke={C.teal} strokeWidth="2" strokeLinecap="round" strokeDasharray="1 6" />
            <path d="M40 4 L50 11 L40 18" stroke={C.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <div className="text-right">
            <div className="text-[11px] text-[color:var(--t-faint)]">To · Hong Kong</div>
            <div className="font-satoshi text-[20px] font-bold tabular-nums mt-0.5" style={{ color: C.gold }}>HK$19,520</div>
            <div className="text-[11px] text-[color:var(--t-sub)]">HKD</div>
          </div>
        </div>
        <dl className="mt-4 divide-y rounded-xl border overflow-hidden" style={{ borderColor: LINE }}>
          {[['Rate', '7.8132 mid-market'], ['Fee', '$4.00 flat, shown upfront'], ['Rails', 'Regulated stablecoin · GENIUS Act'], ['Reference', 'SB-2026-0611-8841']].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-4 py-2.5 text-[12.5px]" style={{ background: PANEL, borderColor: 'var(--wash-strong)' }}>
              <dt className="text-[color:var(--t-faint)]">{k}</dt><dd className="text-[color:var(--t-body)]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Frame>
  );
}

/* ── Hero: composite product view ── */
export function HeroVisual() {
  const data = candles(31, 22);
  const W = 520, H = 150, cw = W / data.length;
  const [btc, setBtc] = useState(67482);
  useEffect(() => { const id = setInterval(() => setBtc((v) => v + (Math.random() - 0.48) * 35), 1600); return () => clearInterval(id); }, []);
  return (
    <div className="relative">
      <Frame h={420}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: LINE }}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" /><span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" /><span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            {['Stocks', 'Crypto', 'FX', 'Bridge'].map((t, i) => (
              <span key={t} className={i === 0 ? 'text-[color:var(--t-hi)] font-semibold border-b pb-0.5' : 'text-[color:var(--t-faint)]'} style={i === 0 ? { borderColor: C.gold } : undefined}>{t}</span>
            ))}
          </div>
          <span className="text-[10px] text-[color:var(--t-faint)]">delayed 15s</span>
        </div>
        <div className="px-4 pt-3 flex items-end justify-between">
          <div>
            <div className="text-[11px] text-[color:var(--t-faint)]">Portfolio</div>
            <div className="font-satoshi text-[26px] font-black text-[color:var(--t-hi)] tabular-nums leading-tight">$48,210.55</div>
            <div className="text-[12px] font-semibold tabular-nums" style={{ color: C.hk }}>+$612.40 · +1.29% today</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[color:var(--t-faint)]">BTC / USD</div>
            <div className="font-satoshi text-[17px] font-bold text-[color:var(--t-hi)] tabular-nums">${btc.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
          </div>
        </div>
        <div className="px-3 pt-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
            {[30, 60, 90, 120].map((y) => <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="var(--wash-strong)" />)}
            {data.map((d, i) => {
              const up = d.c >= d.o; const x = i * cw + cw * 0.5;
              const y = (v: number) => H - (v / 100) * H;
              return (
                <g key={i}>
                  <line x1={x} x2={x} y1={y(d.h)} y2={y(d.l)} stroke={up ? C.hk : C.ny} strokeWidth="1.3" />
                  <rect x={x - cw * 0.27} width={cw * 0.54} y={y(Math.max(d.o, d.c))} height={Math.max(2.5, Math.abs(y(d.o) - y(d.c)))} fill={up ? C.hk : C.ny} rx="1" />
                </g>
              );
            })}
          </svg>
        </div>
        <div className="mx-4 mt-2 mb-4 rounded-xl border p-3 flex items-center justify-between" style={{ borderColor: 'color-mix(in srgb, var(--electric) 35%, transparent)', background: 'color-mix(in srgb, var(--electric) 6%, transparent)' }}>
          <div className="flex items-center gap-2.5">
            <svg width="30" height="16" viewBox="0 0 30 16" fill="none"><path d="M2 8 H22" stroke={C.teal} strokeWidth="2" strokeLinecap="round" strokeDasharray="1 5" /><path d="M19 3 L26 8 L19 13" stroke={C.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
            <span className="text-[12px] text-[color:var(--t-body)]">SwiftBridge · NY &#8594; HK</span>
          </div>
          <span className="text-[11.5px] font-semibold" style={{ color: C.hk }}>settled in 7.4s</span>
        </div>
      </Frame>
    </div>
  );
}

/* ── Skyline illustration (NY + HK) for About ── */
export function SkylineVisual({ h = 280 }: { h?: number }) {
  return (
    <div className="relative overflow-hidden rounded-tl-[24px] rounded-br-[24px] rounded-tr-sm rounded-bl-sm border" style={{ borderColor: 'var(--line-strong)', background: PANEL2 }}>
      <svg viewBox="0 0 800 280" className="w-full" style={{ height: h }} preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--panel-alt)" /><stop offset="100%" stopColor="var(--bg)" />
          </linearGradient>
        </defs>
        <rect width="800" height="280" fill="url(#sky)" />
        {/* stars */}
        {Array.from({ length: 26 }).map((_, i) => (
          <circle key={i} cx={(i * 137) % 800} cy={((i * 53) % 90) + 12} r={i % 3 ? 0.8 : 1.3} fill="var(--gold)" opacity={0.5} />
        ))}
        {/* NY skyline (left, orange-tinted) */}
        <g fill="var(--panel)" stroke="color-mix(in srgb, var(--loss) 35%, transparent)" strokeWidth="1">
          <rect x="30" y="120" width="34" height="160" /><rect x="72" y="90" width="26" height="190" />
          <rect x="106" y="140" width="40" height="140" /><polygon points="160,280 160,110 174,80 188,110 188,280" />
          <rect x="196" y="150" width="30" height="130" /><rect x="234" y="100" width="22" height="180" />
          <rect x="262" y="165" width="44" height="115" />
        </g>
        {/* spire */}
        <line x1="174" y1="80" x2="174" y2="58" stroke="var(--loss)" strokeWidth="2" />
        {/* HK skyline (right, gold-tinted) */}
        <g fill="var(--panel)" stroke="color-mix(in srgb, var(--gold) 40%, transparent)" strokeWidth="1">
          <rect x="500" y="130" width="36" height="150" /><rect x="544" y="95" width="28" height="185" />
          <polygon points="580,280 580,120 596,96 612,120 612,280" />
          <rect x="620" y="150" width="42" height="130" /><rect x="670" y="110" width="24" height="170" />
          <rect x="700" y="160" width="48" height="120" /><rect x="754" y="135" width="26" height="145" />
        </g>
        <line x1="596" y1="96" x2="596" y2="72" stroke="var(--gold)" strokeWidth="2" />
        {/* bridge arc between cities */}
        <path d="M190 120 Q400 26 600 118" stroke="var(--electric)" strokeWidth="1.6" strokeDasharray="2 7" fill="none" opacity="0.8" />
        <circle cx="190" cy="120" r="3.5" fill="var(--loss)" /><circle cx="600" cy="118" r="3.5" fill="var(--gold)" />
        {/* water reflections */}
        {[330, 370, 410, 450].map((x, i) => <line key={x} x1={x} y1={250 + i * 6} x2={x + 36} y2={250 + i * 6} stroke="color-mix(in srgb, var(--electric) 30%, transparent)" strokeWidth="1.4" />)}
        <text x="60" y="40" fill="var(--t-sub)" fontSize="12" fontWeight="600" fontFamily="Satoshi, sans-serif">NEW YORK</text>
        <text x="660" y="40" fill="var(--t-sub)" fontSize="12" fontWeight="600" fontFamily="Satoshi, sans-serif">HONG KONG</text>
      </svg>
    </div>
  );
}

/* ── small abstract covers for blog cards ── */
export function CoverChart({ accent = C.gold }: { accent?: string }) {
  const data = candles(13, 16); const W = 320, H = 150, cw = W / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none" style={{ background: PANEL2 }}>
      {data.map((d, i) => {
        const up = d.c >= d.o; const x = i * cw + cw * 0.5; const y = (v: number) => H - (v / 100) * H;
        return (<g key={i}><line x1={x} x2={x} y1={y(d.h)} y2={y(d.l)} stroke={up ? C.hk : C.ny} strokeWidth="1.3" opacity="0.85" /><rect x={x - cw * 0.26} width={cw * 0.52} y={y(Math.max(d.o, d.c))} height={Math.max(3, Math.abs(y(d.o) - y(d.c)))} fill={up ? C.hk : C.ny} rx="1" opacity="0.85" /></g>);
      })}
      <path d={`M0 ${H - 26} Q${W / 2} ${H - 64} ${W} ${H - 38}`} stroke={accent} strokeWidth="2" fill="none" strokeDasharray="1 6" />
    </svg>
  );
}
export function CoverCoins() {
  return (
    <svg viewBox="0 0 320 150" className="w-full h-full" preserveAspectRatio="none" style={{ background: PANEL2 }}>
      {[['#F7931A', 80, 75, 34], ['#627EEA', 168, 58, 26], ['#14F195', 240, 92, 22]].map(([c, x, y, r]: any, i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill={`${c}18`} stroke={`${c}66`} strokeWidth="1.5" />
          <circle cx={x} cy={y} r={(r as number) * 0.55} fill="none" stroke={`${c}99`} strokeWidth="1.5" strokeDasharray="3 4" />
        </g>
      ))}
      <path d="M40 130 H280" stroke={C.teal} strokeWidth="1.5" strokeDasharray="1 6" />
    </svg>
  );
}
export function CoverBridge() {
  return (
    <svg viewBox="0 0 320 150" className="w-full h-full" preserveAspectRatio="none" style={{ background: PANEL2 }}>
      <path d="M30 110 Q160 28 290 104" stroke={C.gold} strokeWidth="2" strokeDasharray="2 7" fill="none" />
      <circle cx="30" cy="110" r="5" fill={C.ny} /><circle cx="290" cy="104" r="5" fill={C.gold} />
      <circle cx="160" cy="64" r="3.5" fill="#fff" />
      {[60, 100, 140, 180, 220, 260].map((x) => <line key={x} x1={x} y1={132} x2={x + 22} y2={132} stroke="color-mix(in srgb, var(--electric) 40%, transparent)" strokeWidth="1.4" />)}
    </svg>
  );
}
