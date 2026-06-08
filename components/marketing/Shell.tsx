'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowRight } from 'lucide-react';

/* ───────── Swifttrade palette (navy + metallic gold + muted teal,
   with one deliberately-off HK green and a NY orange as clashing accents).
   No purple. No cyan-to-blue gradient. ───────── */
export const C = {
  bg: '#0A1526',
  panel: '#0F1D33',
  panelAlt: '#0C1828',
  line: 'rgba(255,255,255,0.08)',
  gold: '#C4A052',
  goldSoft: '#D9BE84',
  teal: '#3B948C',
  hk: '#2FA56B',      // slightly-off HK green (clash)
  ny: '#D9743C',      // NY orange (clash)
  text: '#EAF0F8',
  sub: '#94A3B8',
  faint: '#5C6B80',
};

/* Real, license-free Unsplash photography */
export const IMG = (id: string, w = 1100) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

/* Grain + a single restrained light wash. No floating blur blobs. */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg,#0B1830 0%, ${C.bg} 42%, #07101E 100%)` }} />
      <div className="absolute top-0 right-0 w-[55%] h-[48%] opacity-[0.08]"
        style={{ background: `radial-gradient(55% 60% at 82% 0%, ${C.gold}, transparent 70%)` }} />
      {/* film grain */}
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
    </div>
  );
}

/* Brand mark — gold ribbon, no glow */
export function Mark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="Swifttrade">
      <rect x="0.5" y="0.5" width="39" height="39" rx="9" fill="#0E1B30" stroke="rgba(255,255,255,0.10)" />
      <path d="M9 15 L18 10 L24 14 L31 10" stroke={C.gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 24 L16 27 L23 22 L31 26" stroke={C.teal} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Buttons — varied styles, no glow shadows */
export function BtnPrimary({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 px-5 py-3 rounded-lg text-[14.5px] font-bold transition-transform duration-150 hover:-translate-y-[1px] active:translate-y-0 ${className}`}
      style={{ background: C.gold, color: '#0A1526', border: '1px solid #A98A3F' }}>
      {children}
    </Link>
  );
}
export function BtnOutline({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-[14.5px] font-semibold text-white border border-white/15 hover:bg-white/[0.05] transition-colors">
      {children}
    </Link>
  );
}

const NAV = [
  { l: 'Stocks', h: '/stocks' },
  { l: 'Crypto', h: '/crypto' },
  { l: 'FX', h: '/fx' },
  { l: 'SwiftBridge', h: '/swiftbridge' },
  { l: 'Company', h: '/about' },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 16);
    on(); window.addEventListener('scroll', on);
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${scrolled ? 'border-b border-white/[0.07]' : 'border-b border-transparent'}`}
      style={{ background: scrolled ? 'rgba(10,21,38,0.9)' : 'transparent' }}>
      <div className="max-w-[1180px] mx-auto px-5 sm:px-7 h-[64px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Mark />
          <span className="font-satoshi font-black text-[18px] tracking-tight text-white">Swift<span style={{ color: C.gold }}>trade</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-[14px]">
          {NAV.map((n) => {
            const active = path === n.h;
            return (
              <Link key={n.l} href={n.h} className="relative py-1 text-[#C2CEDD] hover:text-white transition-colors">
                {n.l}
                {active && (
                  <svg className="absolute -bottom-0.5 left-0 w-full" height="4" viewBox="0 0 60 4" preserveAspectRatio="none">
                    <path d="M1 3 Q20 0 40 2 T59 1.5" stroke={C.gold} strokeWidth="2" fill="none" strokeLinecap="round" />
                  </svg>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/auth/login" className="text-[14px] text-[#C2CEDD] hover:text-white transition-colors">Log in</Link>
          <BtnPrimary href="/auth/signup">Open account <ArrowRight className="w-3.5 h-3.5" /></BtnPrimary>
        </div>
        <button className="md:hidden text-white" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="w-6 h-6" /></button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden" style={{ background: 'rgba(10,21,38,0.98)' }}>
          <div className="flex items-center justify-between px-5 h-[64px]">
            <div className="flex items-center gap-2.5"><Mark /><span className="font-satoshi font-black text-[18px] text-white">Swift<span style={{ color: C.gold }}>trade</span></span></div>
            <button onClick={() => setOpen(false)} aria-label="Close"><X className="w-6 h-6 text-white" /></button>
          </div>
          <div className="px-6 pt-6 flex flex-col gap-5 text-[21px] font-satoshi font-bold">
            {NAV.map((n) => <Link key={n.l} href={n.h} onClick={() => setOpen(false)} className="text-[#C2CEDD]">{n.l}</Link>)}
            <Link href="/auth/login" onClick={() => setOpen(false)} className="text-[#C2CEDD]">Log in</Link>
            <BtnPrimary href="/auth/signup" className="mt-1 justify-center">Open account</BtnPrimary>
          </div>
        </div>
      )}
    </header>
  );
}

/* Small live "market sentiment" chip that sometimes dips red */
function SentimentChip() {
  const [v, setV] = useState(58);
  useEffect(() => {
    const id = setInterval(() => setV((p) => Math.max(28, Math.min(82, p + Math.round((Math.random() - 0.5) * 9)))), 2600);
    return () => clearInterval(id);
  }, []);
  const mood = v >= 55 ? C.hk : v >= 45 ? C.gold : C.ny;
  const label = v >= 55 ? 'Greed' : v >= 45 ? 'Neutral' : 'Fear';
  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-[#92A2B8]">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: mood }} />
      Market sentiment <span className="font-semibold tabular-nums" style={{ color: mood }}>{v} · {label}</span>
    </span>
  );
}

export function MarketingFooter() {
  const cols: { h: string; l: [string, string][] }[] = [
    { h: 'Markets', l: [['Stocks & ETFs', '/stocks'], ['Crypto', '/crypto'], ['FX', '/fx'], ['SwiftBridge', '/swiftbridge']] },
    { h: 'Company', l: [['About', '/about'], ['Careers', '/careers'], ['Press', '/press'], ['Blog', '/blog']] },
    { h: 'Legal', l: [['Terms', '/policies/terms'], ['Privacy', '/policies/privacy'], ['Regulatory', '/policies/regulatory'], ['Disclosures', '/policies/disclosures']] },
  ];
  return (
    <footer className="border-t border-white/[0.07]" style={{ background: '#07101E' }}>
      <div className="max-w-[1180px] mx-auto px-5 sm:px-7 py-14">
        <div className="grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10">
          <div>
            <div className="flex items-center gap-2.5"><Mark /><span className="font-satoshi font-black text-[18px] text-white">Swift<span style={{ color: C.gold }}>trade</span></span></div>
            <p className="mt-4 text-[13.5px] leading-relaxed text-[#7E8DA3] max-w-xs">
              Trade US stocks, crypto and FX in one free account, and move money across borders with SwiftBridge. Built between New York and Hong Kong.
            </p>
            <div className="mt-5"><SentimentChip /></div>
            <div className="mt-5 flex gap-2.5 max-w-xs">
              <input placeholder="you@email.com" className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.10] px-3.5 py-2.5 text-[13px] text-white placeholder:text-[#5C6B80] outline-none focus:border-[#C4A052]/50" />
              <button className="rounded-lg px-4 text-[#0A1526] font-bold text-[13px]" style={{ background: C.gold }}>Notify me</button>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <div className="text-[12px] uppercase tracking-[0.16em] text-[#5C6B80] mb-4">{c.h}</div>
              <ul className="space-y-2.5">
                {c.l.map(([x, href]) => <li key={x}><Link href={href} className="text-[14px] text-[#C2CEDD] hover:text-white transition-colors">{x}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-white/[0.07] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[12px] text-[#5C6B80]">
          <p>Built by traders who got screwed by slow wires in NYC &amp; Central. Beta, under SEC review. Last updated June 2026.</p>
          <p>Designed in Central, HK. &copy; {new Date().getFullYear()} Swifttrade.</p>
        </div>
      </div>
    </footer>
  );
}

/* Page wrapper used by the landing and every sub-page */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mkt min-h-screen text-[#EAF0F8] overflow-x-hidden">
      <Backdrop />
      <MarketingNav />
      <main className="pt-[64px]">{children}</main>
      <MarketingFooter />
    </div>
  );
}

/* Shared bits for sub-pages */
export function Eyebrow({ children, color = C.gold }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="inline-flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] mb-4" style={{ color }}>
      <span className="w-6 h-px" style={{ background: color }} />{children}
    </div>
  );
}

export function PageHero({ eyebrow, title, sub, color = C.gold, img, alt }: {
  eyebrow: string; title: string; sub: string; color?: string; img?: string; alt?: string;
}) {
  return (
    <section className="max-w-[1180px] mx-auto px-5 sm:px-7 pt-16 sm:pt-24 pb-10">
      <div className={`grid ${img ? 'lg:grid-cols-2' : ''} gap-12 items-center`}>
        <div>
          <Eyebrow color={color}>{eyebrow}</Eyebrow>
          <h1 className="font-satoshi text-[clamp(34px,6vw,64px)] font-black leading-[0.98] text-white">{title}</h1>
          <p className="mt-5 text-[16px] leading-[1.7] text-[#9DB0CC] max-w-xl">{sub}</p>
        </div>
        {img && (
          <div className="overflow-hidden rounded-tl-[24px] rounded-br-[24px] rounded-tr-sm rounded-bl-sm border border-white/[0.10]">
            <img src={img} alt={alt || ''} loading="lazy" className="w-full h-[320px] object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
