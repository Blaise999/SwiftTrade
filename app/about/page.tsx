'use client';
import Link from 'next/link';
import { MarketingShell, C, IMG, Eyebrow, BtnPrimary } from '@/components/marketing/Shell';
export default function Page() {
  return (
    <MarketingShell>
      <section className="max-w-[900px] mx-auto px-5 sm:px-7 pt-16 sm:pt-24 pb-8">
        <Eyebrow>About</Eyebrow>
        <h1 className="font-satoshi text-[clamp(32px,5.4vw,58px)] font-black leading-[1] text-white">Founded in 2020, between two trading floors.</h1>
        <p className="mt-6 text-[16.5px] leading-[1.8] text-[#9DB0CC]">
          We started Swifttrade in 2020 after one too many transfers that cost too much and landed too late. One of us was moving money between a New York paycheck and a Hong Kong mortgage; the other was watching clients eat 3% on every FX leg. The pitch was simple: one account for US stocks, crypto and FX, and cross-border transfers that actually arrive while you are still holding your phone.
        </p>
        <p className="mt-5 text-[16.5px] leading-[1.8] text-[#9DB0CC]">
          We got plenty wrong first. Our v1 transfer flow broke on weekends. We under-priced the first plan and had to redo it. We shipped a chart nobody used. We kept the lessons and kept going.
        </p>
      </section>
      <section className="max-w-[1180px] mx-auto px-5 sm:px-7 py-10">
        <div className="overflow-hidden rounded-tl-[24px] rounded-br-[24px] rounded-tr-sm rounded-bl-sm border border-white/[0.10]">
          <img src={IMG('photo-1486406146926-c627a92ad1ab', 1400)} alt="Hong Kong skyline" loading="lazy" className="w-full h-[300px] object-cover" />
        </div>
      </section>
      <section className="max-w-[1180px] mx-auto px-5 sm:px-7 py-10 grid md:grid-cols-2 gap-6">
        {[
          { img: 'photo-1500648767791-00dcc994a43e', n: 'Alex Chen', r: 'Co-founder, CEO', b: 'ex-Goldman Sachs (HK), ex-Robinhood (NY). Built clearing tooling before deciding to fix the consumer side.' },
          { img: 'photo-1521119989659-a83eee488004', n: 'Dana Whitfield', r: 'Co-founder, CTO', b: 'Payments infra and crypto custody. Has wired money internationally enough times to take it personally.' },
        ].map((p) => (
          <div key={p.n} className="rounded-2xl border border-white/[0.08] p-6 flex gap-5" style={{ background: '#0E1B30' }}>
            <img src={IMG(p.img, 300)} alt={p.n} loading="lazy" className="w-20 h-20 rounded-xl object-cover border border-white/[0.10]" />
            <div>
              <div className="text-white font-semibold text-[16px]">{p.n}</div>
              <div className="text-[13px] mb-2" style={{ color: C.gold }}>{p.r}</div>
              <p className="text-[13.5px] text-[#8A9BB3] leading-relaxed">{p.b}</p>
            </div>
          </div>
        ))}
      </section>
      <section className="max-w-[1180px] mx-auto px-5 sm:px-7 py-10 grid sm:grid-cols-2 gap-6">
        {[['New York', '64 Spring St, SoHo, New York, NY 10012'], ['Hong Kong', '18/F, Tower 2, Central, Hong Kong']].map(([c, a]) => (
          <div key={c} className="rounded-xl border border-white/[0.08] p-6" style={{ background: '#0E1B30' }}>
            <div className="font-satoshi font-bold text-white">{c}</div>
            <p className="mt-1.5 text-[14px] text-[#8A9BB3]">{a}</p>
          </div>
        ))}
      </section>
      <section className="max-w-[1180px] mx-auto px-5 sm:px-7 pb-20 pt-6">
        <div className="rounded-2xl border border-white/[0.08] px-7 py-12 text-center" style={{ background: '#0E1B30' }}>
          <h2 className="font-satoshi text-[clamp(24px,3.6vw,38px)] font-black text-white">Come trade with us.</h2>
          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            <BtnPrimary href="/auth/signup">Open account free</BtnPrimary>
            <Link href="/careers" className="inline-flex items-center px-5 py-3 rounded-lg text-[14.5px] font-semibold text-white border border-white/15 hover:bg-white/[0.05]">We're hiring</Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
