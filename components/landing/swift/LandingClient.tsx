'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Play, X, Check, Zap, ShieldCheck, TrendingUp, LineChart, Lock, Landmark, Server, BadgeCheck } from 'lucide-react';
import { MarketingShell, C, Eyebrow, BtnPrimary, BtnOutline } from '@/components/marketing/Shell';
import { SectionHead, SpecGrid, CompareTable, FAQ } from '@/components/marketing/Templates';
import { HeroVisual, TerminalVisual, CryptoVisual, FxVisual } from '@/components/marketing/Visuals';
import { NewsWall } from '@/components/landing/NewsWall';
import { ShieldVsMarket } from '@/components/landing/ShieldVsMarket';
import { LiveHeatmap, StatBand, BentoGrid, Corridor, MobileStrip } from '@/components/landing/MoreSections';
import { MarqueeTicker, MarketMood, BridgeRates, ParallaxQuote } from '@/components/landing/TraderSections';
import { WhyShield, WhyBridge } from '@/components/landing/DeepDive';

function CountUp({ to, prefix = '', suffix = '', decimals = 0 }: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0; const s = performance.now();
    const tick = (t: number) => { const p = Math.min(1, (t - s) / 1300); setV(to * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref}>{prefix}{v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

const SEED = [
  { s: 'AAPL', m: 'NASDAQ', p: 228.31, d: 0.46 }, { s: 'NVDA', m: 'NASDAQ', p: 132.9, d: 3.12 },
  { s: '0700.HK', m: 'HKEX', p: 384.2, d: -0.7 }, { s: 'BTC', m: 'Crypto', p: 67482, d: 1.84 },
  { s: 'USD/HKD', m: 'FX', p: 7.81, d: 0.02 }, { s: '9988.HK', m: 'HKEX', p: 78.55, d: 1.1 },
  { s: 'ETH', m: 'Crypto', p: 3521, d: -0.9 }, { s: 'TSLA', m: 'NASDAQ', p: 251.4, d: -1.12 },
  { s: 'VOO', m: 'NYSE', p: 512.4, d: 0.3 }, { s: 'SOL', m: 'Crypto', p: 174.6, d: 4.05 },
];
function Ticker() {
  const [rows, setRows] = useState(SEED);
  useEffect(() => {
    const id = setInterval(() => setRows((p) => p.map((r) => ({ ...r, p: r.p + (Math.random() - 0.5) * (r.p * 0.0008), d: r.d + (Math.random() - 0.5) * 0.05 }))), 1700);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="relative w-full overflow-hidden border-y border-[color:var(--line)]" style={{ background: 'var(--panel-alt)' }}>
      <div className="flex gap-7 py-2.5 whitespace-nowrap" style={{ width: 'max-content', animation: 'st-tk 42s linear infinite' }}>
        {[...rows, ...rows].map((r, i) => {
          const up = r.d >= 0;
          return (
            <span key={i} className="inline-flex items-center gap-2 text-[12.5px]">
              <span className="text-[color:var(--t-faint)] text-[10px] uppercase tracking-wide">{r.m}</span>
              <span className="text-[color:var(--t-body)] font-medium">{r.s}</span>
              <span className="text-[color:var(--t-hi)] tabular-nums font-semibold">{r.p < 10 ? r.p.toFixed(4) : r.p.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
              <span className="tabular-nums" style={{ color: up ? C.hk : C.ny }}>{up ? '+' : ''}{r.d.toFixed(2)}%</span>
            </span>
          );
        })}
      </div>
      <style>{`@keyframes st-tk{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

function SketchArrow({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 60" fill="none">
      <path d="M6 40 C50 8 120 12 196 26" stroke={C.gold} strokeWidth="2.4" strokeLinecap="round" fill="none" strokeDasharray="0.1 7" opacity="0.9" />
      <path d="M186 18 L200 27 L184 33" stroke={C.gold} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export default function LandingClient() {
  const [demo, setDemo] = useState(false);
  return (
    <MarketingShell>
      <Hero onDemo={() => setDemo(true)} />
      <Ticker />
      <Stats />
      <MarketsIntro />
      <Markets />
      <WhatYouCanTrade />
      <MarqueeTicker />
      <LiveHeatmap />
      <StatBand />
      <NewsWall />
      <MarketMood />
      <BentoGrid />
      <ParallaxQuote />
      <Bridge />
      <Corridor />
      <WhyBridge />
      <BridgeRates />
      <ShieldVsMarket />
      <WhyShield />
      <MobileStrip />
      <Security />
      <FreeModel />
      <Steps />
      <Compare />
      <Faqs />
      <Founder />
      <Voices />
      <CTA />

      {demo && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-5" onClick={() => setDemo(false)}>
          <div className="relative w-full max-w-2xl rounded-xl border border-[color:var(--line)] p-7" style={{ background: 'var(--panel)' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDemo(false)} className="absolute top-4 right-4 text-[color:var(--t-sub)] hover:text-[color:var(--t-hi)]"><X className="w-5 h-5" /></button>
            <div className="aspect-video rounded-lg grid place-items-center border border-[color:var(--line)]" style={{ background: 'var(--bg)' }}>
              <div className="text-center">
                <div className="mx-auto w-14 h-14 rounded-full grid place-items-center mb-3" style={{ background: C.gold }}><Play className="w-6 h-6 text-[color:var(--on-accent)] ml-0.5" /></div>
                <p className="font-satoshi text-lg font-bold text-[color:var(--t-hi)]">Product tour: place a trade, then send the proceeds home</p>
                <p className="text-[13px] text-[color:var(--t-sub)] mt-1">Buy NVDA, sell into USD, bridge to HKD. Replace with your real screen capture before launch.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </MarketingShell>
  );
}

/* ── HERO: markets-led, free, SwiftBridge as a "plus" ── */
function Hero({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="max-w-[1180px] mx-auto px-5 sm:px-7 pt-14 sm:pt-20 pb-8">
      <div className="grid lg:grid-cols-[1.08fr_0.92fr] gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--wash)] px-3 py-1.5 text-[12px] text-[color:var(--t-body)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.hk }} /> Beta, under SEC review
          </div>
          <h1 className="font-satoshi font-black tracking-[-0.025em] leading-[0.98] text-[color:var(--t-hi)] text-[clamp(38px,6.6vw,66px)]">
            Trade US stocks, crypto and FX.<br />
            <span className="relative inline-block">
              Free.
              <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 120 10" preserveAspectRatio="none">
                <path d="M2 6 Q40 1 70 4 T118 3" stroke={C.gold} strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 text-[17px] leading-[1.6] text-[color:var(--t-body)] max-w-xl font-medium">
            One account for the markets you actually use. And when money needs to cross the Pacific, SwiftBridge moves USD to HKD in about 8 seconds.
          </p>
          <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--t-sub)] max-w-lg">
            SEC-registered broker-dealer. FINRA member. HK SFC VA platform. HKMA stablecoin issuer.
          </p>

          {/* what you trade, at a glance */}
          <div className="mt-6 flex flex-wrap gap-2">
            {['5,000+ US stocks', '350+ crypto pairs', '50+ FX pairs', 'HKEX listings', 'Fractional from $1'].map((x) => (
              <span key={x} className="text-[12px] px-2.5 py-1 rounded-md border border-[color:var(--line)] text-[color:var(--t-body)]" style={{ background: 'var(--wash)' }}>{x}</span>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <div>
              <BtnPrimary href="/auth/signup">Open free account <ArrowRight className="w-4 h-4" /></BtnPrimary>
              <div className="mt-1.5 text-[12px] text-[color:var(--t-faint)] pl-1">90 seconds. No SSN until you fund.</div>
            </div>
            <button onClick={onDemo} className="inline-flex items-center gap-2 text-[14.5px] font-semibold text-[color:var(--t-hi)] hover:text-[color:var(--gold-light)] transition-colors">
              <span className="grid place-items-center w-7 h-7 rounded-full border border-[color:var(--line-strong)]"><Play className="w-3 h-3 ml-0.5" /></span>
              Watch the 35s tour
            </button>
          </div>

          <div className="mt-8 flex items-center gap-3 text-[12px] text-[color:var(--t-faint)]">
            <span>Partners</span><span className="h-3 w-px bg-[color:var(--wash-strong)]" />
            {['Plaid', 'Circle', 'HKMA FPS'].map((b) => <span key={b} className="text-[color:var(--t-sub)] font-semibold">{b}</span>)}
          </div>
        </div>

        <div className="relative lg:translate-y-[6px]">
          <HeroVisual />
          <SketchArrow className="hidden lg:block absolute -top-7 -left-6 w-40 rotate-[-6deg]" />
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const items = [
    { v: 1.4, suffix: 'M+', label: 'US trades placed', dec: 1 },
    { v: 680, suffix: 'k', label: 'HK / Asia trades last month', dec: 0, off: true },
    { v: 5000, prefix: '', suffix: '+', label: 'US tickers, plus HKEX', dec: 0 },
    { v: 350, suffix: '+', label: 'crypto pairs', dec: 0, off: true },
    { v: 8, prefix: '~', suffix: 's', label: 'avg SwiftBridge settle', dec: 0 },
    { v: 0, prefix: '$', suffix: '', label: 'to open and hold', dec: 0 },
  ];
  return (
    <section className="max-w-[1180px] mx-auto px-5 sm:px-7 py-12">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-5">
        {items.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
            className={(m as any).off ? 'lg:translate-y-3' : ''}>
            <div className="font-satoshi text-[clamp(22px,2.6vw,32px)] font-black text-[color:var(--t-hi)] leading-none">
              <CountUp to={m.v} prefix={m.prefix || ''} suffix={m.suffix || ''} decimals={m.dec} />
            </div>
            <div className="mt-2 text-[12px] text-[color:var(--t-sub)] leading-snug">{m.label}</div>
            <div className="mt-3 h-px w-9" style={{ background: i % 2 ? C.teal : C.gold }} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function MarketsIntro() {
  return (
    <section className="max-w-[1180px] mx-auto px-5 sm:px-7 pt-10">
      <SectionHead eyebrow="Three markets, one free account"
        title="Stocks, crypto and FX are the point. SwiftBridge is the bonus."
        sub="The core of Swifttrade is trading: US equities with zero commission, 350+ crypto pairs with visible spreads, and FX at the mid-market rate with the fee disclosed before you confirm. All from one balance, one statement, one tax view. SwiftBridge handles the moment you need that money on the other side of the world." />
    </section>
  );
}

/* ── MARKET sections (rich, equal weight; markets first) ── */
function MarketRow({ flip, href, eyebrow, color, title, body, body2, bullets, visual }: {
  flip?: boolean; href: string; eyebrow: string; color: string; title: string; body: string; body2?: string; bullets: string[]; visual: React.ReactNode;
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
      <motion.div initial={{ opacity: 0, x: flip ? 24 : -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-70px' }} transition={{ duration: 0.5 }}
        className={flip ? 'lg:order-2' : ''}>
        <Eyebrow color={color}>{eyebrow}</Eyebrow>
        <h3 className="font-satoshi text-[clamp(26px,3.4vw,42px)] font-bold leading-[1.04] text-[color:var(--t-hi)]">{title}</h3>
        <p className="mt-4 text-[15.5px] leading-[1.7] text-[color:var(--t-sub)] max-w-md">{body}</p>
        {body2 && <p className="mt-3 text-[15.5px] leading-[1.7] text-[color:var(--t-sub)] max-w-md">{body2}</p>}
        <ul className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {bullets.map((b) => <li key={b} className="flex items-start gap-2.5 text-[14px] text-[color:var(--t-body)]"><Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />{b}</li>)}
        </ul>
        <Link href={href} className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold group" style={{ color }}>
          Explore {eyebrow} <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-70px' }} transition={{ duration: 0.55 }}
        className={`relative ${flip ? 'lg:order-1' : ''}`}>
        {visual}
      </motion.div>
    </div>
  );
}

function Markets() {
  return (
    <section className="max-w-[1180px] mx-auto px-5 sm:px-7 py-14 sm:py-18 space-y-20">
      <MarketRow flip
        href="/stocks" eyebrow="Stocks" color={C.hk}
        title="5,000+ US tickers, plus the HK names most brokers can't offer."
        body="Trade NYSE and NASDAQ alongside HKEX listings such as 0700.HK and 9988.HK from a single balance. Fractional ownership from one dollar, scheduled recurring buys, and extended-hours access when news breaks outside the session."
        body2="At tax time you get a clean 1099-B for US filing and clear cost-basis records, so April is paperwork instead of panic."
        bullets={['$0 commission on US stocks', 'Fractional shares from $1', 'US listings and HKEX names', 'Recurring auto-invest', 'Extended-hours trading', '1099-B at tax time']}
        visual={<TerminalVisual />}
      />
      <MarketRow
        href="/crypto" eyebrow="Crypto" color={C.ny}
        title="350+ coins. Keep the keys if you want them."
        body="Trade BTC, ETH, SOL and 350+ pairs with spreads that hold under volatility. Settle to your Swifttrade balance for speed, or connect a self-custody wallet and hold your own keys. Switch whenever you like."
        body2="On-chain withdrawals clear in minutes across major networks, with the network fee shown before you sign. No lock-ins, no games."
        bullets={['350+ pairs, deep liquidity', 'Custodial or self-custody', 'On-chain withdrawals in minutes', 'Major networks supported', 'Tight, visible spreads', 'Trade from $1']}
        visual={<CryptoVisual />}
      />
      <MarketRow flip
        href="/fx" eyebrow="FX" color={C.gold}
        title="The exchange rate the banks won't show you."
        body="USD/HKD, EUR/USD, GBP/USD and 50+ pairs at the true mid-market rate, with a flat fee disclosed before you confirm. The rate you see quoted publicly, not a marked-up house rate."
        body2="Set limit orders that fire at your target rate, or schedule recurring conversions for rent and payroll across borders."
        bullets={['Mid-market rate, flat visible fee', 'Live comparison vs your bank', '50+ pairs including USD/HKD', 'Limit orders and rate alerts', 'Recurring conversions', 'No hidden spread']}
        visual={<FxVisual />}
      />
    </section>
  );
}

function WhatYouCanTrade() {
  const groups = [
    { title: 'Stocks & ETFs', items: [
      { k: 'US listings', v: '5,000+' }, { k: 'HKEX listings', v: 'Yes' }, { k: 'Fractional', v: 'From $1' },
      { k: 'Commission (US)', v: '$0' }, { k: 'Recurring buys', v: 'Yes' }, { k: 'Extended hours', v: 'Yes' },
      { k: 'Settlement', v: 'T+1' }, { k: 'Tax doc', v: '1099-B' },
    ]},
    { title: 'Crypto', items: [
      { k: 'Pairs', v: '350+' }, { k: 'Networks', v: 'BTC, ETH, SOL +' }, { k: 'Self-custody', v: 'Optional' },
      { k: 'Min trade', v: '$1' }, { k: 'On-chain withdrawal', v: 'Yes' }, { k: 'Spread', v: 'Shown live' },
    ]},
    { title: 'FX', items: [
      { k: 'Pairs', v: '50+' }, { k: 'Rate', v: 'Mid-market' }, { k: 'Fee', v: 'Flat, upfront' },
      { k: 'Limit orders', v: 'Yes' }, { k: 'Recurring', v: 'Yes' }, { k: 'Corridors', v: 'USD/HKD/SGD/EUR/GBP' },
    ]},
    { title: 'SwiftBridge', items: [
      { k: 'Typical settle', v: '~8 seconds' }, { k: 'Compliance', v: 'GENIUS Act' }, { k: 'Rails', v: 'Regulated stablecoin' },
      { k: 'Corridors', v: 'NY / HK / SG' }, { k: 'Fee', v: 'Shown upfront' },
    ]},
    { title: 'Account', items: [
      { k: 'Minimum', v: '$0' }, { k: 'Funding (US)', v: 'Plaid / ACH / wire' }, { k: 'Funding (HK)', v: 'FPS' },
      { k: 'Apps', v: 'iOS, Android, web' }, { k: '2FA', v: 'Required' }, { k: 'Support', v: '24/5 chat' },
    ]},
    { title: 'Markets coverage', items: [
      { k: 'US equities', v: 'NYSE, NASDAQ' }, { k: 'Hong Kong', v: 'HKEX' }, { k: 'Crypto', v: '24/7' },
      { k: 'FX', v: '24/5' }, { k: 'Order types', v: 'Market, limit, recurring' },
    ]},
  ];
  return (
    <section className="border-y border-[color:var(--line)]" style={{ background: 'var(--panel-alt)' }}>
      <div className="max-w-[1180px] mx-auto px-5 sm:px-7 py-16 sm:py-20">
        <SectionHead eyebrow="What you can trade" title="The whole menu, on one page." sub="No digging through help docs to find out what's supported. Here it is." />
        <div className="mt-9"><SpecGrid groups={groups} /></div>
      </div>
    </section>
  );
}

/* ── SwiftBridge: peer-level, framed as a bonus ── */
function Bridge() {
  return (
    <section className="max-w-[1180px] mx-auto px-5 sm:px-7 py-16 sm:py-20">
      <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-12 items-center">
        <div>
          <Eyebrow color={C.teal}>SwiftBridge</Eyebrow>
          <h2 className="font-satoshi text-[clamp(26px,3.6vw,44px)] font-bold leading-[1.04] text-[color:var(--t-hi)]">And when you need it across borders.</h2>
          <p className="mt-5 text-[15.5px] leading-[1.7] text-[color:var(--t-sub)] max-w-md">
            Trading is the day-to-day. SwiftBridge is for the moment you want the money somewhere else: send New York to Hong Kong to Singapore on regulated stablecoin rails, roughly 8 seconds, GENIUS Act compliant, with the rate and fee shown before you press send.
          </p>
          <p className="mt-3 text-[15.5px] leading-[1.7] text-[color:var(--t-sub)] max-w-md">
            Old wires took two days and three banks. This doesn't. But it's one feature in the account, not the whole pitch.
          </p>
          <div className="mt-7 flex gap-3">
            <Link href="/swiftbridge" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-[14.5px] font-semibold text-[color:var(--t-hi)] border border-[color:var(--line-strong)] hover:bg-[color:var(--wash-strong)] transition-colors">How it works <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>
        <div className="relative rounded-2xl border border-[color:var(--line)] overflow-hidden" style={{ background: 'var(--panel)' }}>
          <svg viewBox="0 0 600 240" className="w-full">
            {[['New York', 90, 150, C.ny], ['Hong Kong', 330, 90, C.gold], ['Singapore', 500, 170, C.teal]].map(([n, x, y, c]: any, i) => (
              <g key={n}>
                {i < 2 && (() => {
                  const nx = [90, 330, 500][i + 1], ny = [150, 90, 170][i + 1];
                  const d = `M${x} ${y} Q${(x + nx) / 2} ${Math.min(y, ny) - 50} ${nx} ${ny}`;
                  return (<g><path d={d} stroke={C.gold} strokeWidth="1.5" strokeOpacity="0.45" strokeDasharray="4 5" fill="none" /><motion.circle r="4" fill="#fff" animate={{ offsetDistance: ['0%', '100%'] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }} style={{ offsetPath: `path("${d}")` } as any} /></g>);
                })()}
                <circle cx={x} cy={y} r="6" fill={c} />
                <text x={x} y={y + 24} textAnchor="middle" fill="var(--t-body)" fontSize="13" fontWeight="600">{n}</text>
              </g>
            ))}
          </svg>
          <div className="grid grid-cols-3 gap-px border-t border-[color:var(--line)]" style={{ background: 'var(--wash-strong)' }}>
            {[['~8s', 'typical settle'], ['Upfront', 'fee shown'], ['Mid-market', 'real rate']].map(([k, v]) => (
              <div key={k} className="px-4 py-4" style={{ background: 'var(--panel)' }}>
                <div className="font-satoshi text-base font-bold text-[color:var(--t-hi)]">{k}</div>
                <div className="text-[11px] text-[color:var(--t-faint)] mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Security() {
  const cards = [
    { i: Landmark, c: C.gold, h: 'Regulated, not "trust us"', p: 'SEC-registered broker-dealer and FINRA member in the US. SFC-licensed VA platform and HKMA stablecoin authorisation in Hong Kong. License numbers and PDFs are published at launch.' },
    { i: Lock, c: C.teal, h: 'Your access, locked down', p: 'Two-factor authentication is required, sessions expire, and withdrawals can be address-whitelisted. We never ask for your password or seed phrase.' },
    { i: Server, c: C.hk, h: 'Custody done carefully', p: 'Crypto held in a mix of cold and warm storage with strict withdrawal controls. Connect a self-custody wallet any time if you would rather hold your own keys.' },
    { i: BadgeCheck, c: C.ny, h: 'Funds and proof', p: 'Eligible US securities covered by SIPC where applicable. Stablecoin reserves subject to attestation. We run a public bug-bounty and post incident notes when something breaks.' },
  ];
  return (
    <section className="max-w-[1180px] mx-auto px-5 sm:px-7 py-16 sm:py-20">
      <SectionHead eyebrow="Security & trust" title="Money apps should be boring about safety." sub="Here is exactly how your account and your assets are protected. No vague badges." />
      <div className="mt-9 grid md:grid-cols-2 gap-5">
        {cards.map((x) => (
          <div key={x.h} className="rounded-2xl border border-[color:var(--line)] p-6" style={{ background: 'var(--panel)' }}>
            <div className="w-11 h-11 rounded-xl grid place-items-center mb-4 border border-[color:var(--line)]" style={{ background: 'var(--wash)' }}>
              <x.i className="w-5 h-5" style={{ color: x.c }} />
            </div>
            <h3 className="font-satoshi text-[17px] font-bold text-[color:var(--t-hi)]">{x.h}</h3>
            <p className="mt-2 text-[14px] leading-[1.7] text-[color:var(--t-sub)]">{x.p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── FREE model (replaces pricing tiers) ── */
function FreeModel() {
  return (
    <section className="border-y border-[color:var(--line)]" style={{ background: 'var(--panel-alt)' }}>
      <div className="max-w-[1180px] mx-auto px-5 sm:px-7 py-16 sm:py-20">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-12 items-start">
          <div>
            <Eyebrow color={C.gold}>Pricing, in one word</Eyebrow>
            <h2 className="font-satoshi text-[clamp(28px,4vw,48px)] font-black leading-[1.02] text-[color:var(--t-hi)]">It's free.</h2>
            <p className="mt-5 text-[15.5px] leading-[1.75] text-[color:var(--t-sub)] max-w-md">
              No monthly fee. No tiers. No "upgrade to unlock." Open it, hold it, and trade US stocks with zero commission. The whole product is on the table from day one.
            </p>
            <p className="mt-4 text-[15.5px] leading-[1.75] text-[color:var(--t-sub)] max-w-md">
              Free does not mean we earn nothing, and we would rather state the model plainly than hide it. Here is exactly how the business works.
            </p>
            <div className="mt-7"><BtnPrimary href="/auth/signup">Open free account <ArrowRight className="w-4 h-4" /></BtnPrimary></div>
          </div>
          <div className="space-y-3">
            {[
              ['$0', 'to open, hold, and close your account'],
              ['$0', 'commission on US stocks and ETFs'],
              ['Flat fee', 'on FX, shown before you confirm. Not buried in the rate'],
              ['Tight spread', 'on crypto trades, displayed live'],
              ['Interest', 'we earn on idle cash, the standard brokerage model'],
              ['No PFOF', 'on HK listings, and we tell you where US flow routes'],
            ].map(([k, v]) => (
              <div key={v} className="flex items-start gap-4 rounded-xl border border-[color:var(--line)] px-5 py-3.5" style={{ background: 'var(--panel)' }}>
                <span className="font-satoshi font-black text-[color:var(--t-hi)] shrink-0 w-24" style={{ color: C.gold }}>{k}</span>
                <span className="text-[14px] text-[color:var(--t-sub)]">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const s = [
    { t: 'Open in 90 seconds', d: 'Email and basic details. Identity verification is only required before you fund. No minimum balance.', i: Zap, c: C.gold },
    { t: 'Verify and fund', d: 'Plaid, ACH or wire for US banks. FPS for Hong Kong. Most accounts verify in minutes.', i: ShieldCheck, c: C.teal },
    { t: 'Trade the markets', d: 'US stocks, 350+ crypto pairs, 50+ FX pairs, all from one balance.', i: TrendingUp, c: C.hk },
    { t: 'Move it or grow it', d: 'Bridge to HKD when you need to, or set recurring buys and track P&L honestly.', i: LineChart, c: C.ny },
  ];
  return (
    <section className="max-w-[1180px] mx-auto px-5 sm:px-7 py-16 sm:py-20">
      <SectionHead title="From download to your first trade." sub="No 12-step onboarding. Four steps, most of them you can do before your coffee lands." />
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {s.map((x, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
            <div className="w-12 h-12 rounded-xl grid place-items-center mb-4 border border-[color:var(--line)]" style={{ background: 'var(--wash)' }}>
              <x.i className="w-5 h-5" style={{ color: x.c }} />
            </div>
            <div className="font-satoshi text-[13px] font-black mb-1" style={{ color: x.c }}>0{i + 1}</div>
            <h3 className="font-satoshi text-[17px] font-bold text-[color:var(--t-hi)]">{x.t}</h3>
            <p className="mt-1.5 text-[14px] text-[color:var(--t-sub)] leading-relaxed">{x.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Compare() {
  return (
    <section className="max-w-[1180px] mx-auto px-5 sm:px-7 py-12 sm:py-16">
      <SectionHead eyebrow="The honest comparison" title="Against your bank and your old broker." sub="Rounded, real-world numbers for a typical US/HK user. Your mileage varies." />
      <div className="mt-8">
        <CompareTable
          cols={['Swifttrade', 'High-street bank', 'Legacy broker']}
          highlight={0}
          rows={[
            ['US stock commission', '$0', 'n/a', '$0 to $6.95'],
            ['FX rate on USD/HKD', 'Mid-market + flat fee', 'Marked up ~2 to 3%', 'Marked up ~1%'],
            ['USD to HKD transfer', '~8 seconds', '1 to 2 business days', '1 to 3 business days'],
            ['Crypto', '350+ pairs, self-custody option', 'None', 'Limited or none'],
            ['Fractional shares', 'From $1', 'No', 'Sometimes'],
            ['HKEX access', 'Yes', 'Sometimes', 'Sometimes'],
            ['Account fee', '$0', 'Varies', '$0 to monthly'],
          ]}
        />
      </div>
    </section>
  );
}

function Faqs() {
  const items = [
    { q: 'Is it really free?', a: 'Yes. No account fee, no monthly tier, and $0 commission on US stocks and ETFs. We make money on a flat FX fee shown before you confirm, a tight crypto spread shown live, and interest on idle cash, which is the standard brokerage model.' },
    { q: 'Do I need a US Social Security Number to sign up?', a: 'No, not to open and explore. You will need to complete identity verification (which may include an SSN for US tax reporting) before you fund and trade. HK users verify with local ID and FPS.' },
    { q: 'Which markets can I trade?', a: 'Over 5,000 US stocks and ETFs across NYSE and NASDAQ, HKEX-listed names like 0700 and 9988, 350+ crypto pairs, and 50+ FX pairs including USD/HKD. Crypto trades 24/7, FX 24/5, equities during market and extended hours.' },
    { q: 'How fast is SwiftBridge, really?', a: 'Typically around 8 seconds on regulated stablecoin rails for supported corridors (New York, Hong Kong, Singapore). It is GENIUS Act compliant and the rate and fee are shown before you send. It is one feature of the account, not a separate app.' },
    { q: 'Can I hold my own crypto keys?', a: 'Yes. Keep funds with us for speed, or connect a self-custody wallet and hold your own keys. You can switch at any time and withdraw on-chain in minutes.' },
    { q: 'How are my money and assets protected?', a: 'Eligible US securities are covered by SIPC where applicable. Crypto is held in a mix of cold and warm storage with strict withdrawal controls. Stablecoin reserves are subject to attestation, and we run a public bug-bounty.' },
    { q: 'What about taxes?', a: 'US users get a 1099-B for reportable activity along with clear cost-basis records. You remain responsible for filing in every jurisdiction that applies to you.' },
    { q: 'Are you actually licensed?', a: 'We operate as an SEC-registered broker-dealer and FINRA member in the US, and an SFC-licensed VA platform with HKMA stablecoin authorisation in Hong Kong. We are in beta and under SEC review; license numbers and PDFs are on the Regulatory page at launch.' },
  ];
  return (
    <section className="max-w-[900px] mx-auto px-5 sm:px-7 py-12 sm:py-16">
      <SectionHead title="Questions, answered straight." />
      <div className="mt-8"><FAQ items={items} /></div>
    </section>
  );
}

function Founder() {
  return (
    <section className="max-w-[1180px] mx-auto px-5 sm:px-7 py-10">
      <div className="rounded-2xl border border-[color:var(--line)] p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-6" style={{ background: 'var(--panel)' }}>
        <span className="w-20 h-20 rounded-xl grid place-items-center font-satoshi text-[22px] font-black shrink-0 border" style={{ background: 'var(--slate)', color: C.goldSoft, borderColor: 'color-mix(in srgb, var(--gold) 35%, transparent)' }}>AC</span>
        <div>
          <Eyebrow>Who's building this</Eyebrow>
          <p className="font-serif-accent text-[19px] sm:text-[22px] leading-snug text-[color:var(--t-hi)]">
            &ldquo;We built the account we always wanted as traders: US and Hong Kong markets in one place, free to use, with transfers that settle while you watch.&rdquo;
          </p>
          <div className="mt-3 text-[14px] text-[color:var(--t-hi)] font-semibold">Alex Chen <span className="text-[color:var(--t-faint)] font-normal">· ex-Goldman HK &amp; Robinhood NY</span></div>
          <Link href="/about" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: C.gold }}>Read our story <ArrowUpRight className="w-3.5 h-3.5" /></Link>
        </div>
      </div>
    </section>
  );
}

function Voices() {
  const t = [
    { q: 'Cut my FX cost vs HSBC by about 4.8%. First time the rate matched what I saw on Google.', n: 'Marcus T.', r: 'Trader, Central HK', at: '@marcustrades' },
    { q: 'Funded with Plaid, bought fractional NVDA, sent rent to HK. All before lunch.', n: 'Priya N.', r: 'PM, Brooklyn NY', at: 'in/priya-n' },
    { q: 'Self-custody connect actually works. I keep my own keys and still trade here.', n: 'Daniel K.', r: 'Builder, Singapore', at: '@dk_onchain' },
  ];
  return (
    <section className="py-14 sm:py-18">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-7">
        <h2 className="font-satoshi text-[clamp(26px,4vw,42px)] font-black text-[color:var(--t-hi)] max-w-md">What early users say.</h2>
        <div className="mt-9 grid md:grid-cols-3 gap-5">
          {t.map((x, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
              className={`rounded-2xl border border-[color:var(--line)] p-6 ${i === 1 ? 'md:translate-y-5' : i === 2 ? 'md:translate-y-2' : ''}`} style={{ background: 'var(--panel)' }}>
              <p className="text-[15px] leading-[1.6] text-[color:var(--t-hi)]">&ldquo;{x.q}&rdquo;</p>
              <div className="mt-5 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full grid place-items-center text-[13px] font-bold" style={{ background: 'var(--slate)', color: C.goldSoft, border: '1px solid var(--line)' }}>{x.n.split(' ').map((p) => p[0]).join('')}</span>
                <div>
                  <div className="text-[14px] font-semibold text-[color:var(--t-hi)]">{x.n}</div>
                  <div className="text-[12px] text-[color:var(--t-faint)]">{x.r} · <span style={{ color: C.teal }}>{x.at}</span></div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="max-w-[1180px] mx-auto px-5 sm:px-7 py-16 sm:py-24">
      <div className="rounded-2xl border border-[color:var(--line)] px-7 py-14 sm:py-18 text-center" style={{ background: 'var(--panel)' }}>
        <h2 className="font-satoshi text-[clamp(30px,5vw,56px)] font-black leading-[1.02] text-[color:var(--t-hi)]">Open the account. Trade the markets.</h2>
        <p className="mt-4 text-[15px] text-[color:var(--t-sub)] max-w-md mx-auto">Free to open, no SSN until you fund, and the whole product unlocked from minute one.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <BtnPrimary href="/auth/signup">Open free account <ArrowRight className="w-4 h-4" /></BtnPrimary>
          <BtnOutline href="/stocks">Browse the markets</BtnOutline>
        </div>
      </div>
    </section>
  );
}
