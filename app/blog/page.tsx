'use client';
import Link from 'next/link';
import { MarketingShell, C, Eyebrow } from '@/components/marketing/Shell';
import { CoverChart, CoverCoins, CoverBridge } from '@/components/marketing/Visuals';
export default function Page() {
  const posts = [
    { cover: <CoverChart accent={C.gold} />, tag: 'FX', title: 'How banks hide their markup in the USD/HKD rate', date: 'May 2026', read: '5 min' },
    { cover: <CoverChart accent="#2FA56B" />, tag: 'Investing', title: 'Fractional shares for the US/HK investor, explained plainly', date: 'Apr 2026', read: '4 min' },
    { cover: <CoverCoins />, tag: 'Crypto', title: 'Custodial vs self-custody: which fits how you trade', date: 'Mar 2026', read: '6 min' },
  ];
  return (
    <MarketingShell>
      <section className="max-w-[1180px] mx-auto px-5 sm:px-7 pt-16 sm:pt-24 pb-10">
        <Eyebrow>Blog</Eyebrow>
        <h1 className="font-satoshi text-[clamp(32px,5.2vw,56px)] font-black leading-[1.02] text-white">Notes from the desk.</h1>
        <p className="mt-3 text-[13px] text-[#5C6B80]">Last updated June 2026.</p>
        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {posts.map((p) => (
            <Link key={p.title} href="/blog" className="group rounded-2xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-colors" style={{ background: '#0E1B30' }}>
              <div className="relative h-44 overflow-hidden">
                {p.cover}
                <span className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-white/[0.12] text-white" style={{ background: 'rgba(8,18,31,0.85)' }}>{p.tag}</span>
              </div>
              <div className="p-5">
                <h2 className="font-satoshi text-[16px] font-bold text-white leading-snug">{p.title}</h2>
                <div className="mt-3 text-[12px] text-[#5C6B80]">{p.date} · {p.read} read</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
