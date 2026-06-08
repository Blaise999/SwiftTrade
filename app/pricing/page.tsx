'use client';
import Link from 'next/link';
import { MarketingShell, C, Eyebrow, BtnPrimary } from '@/components/marketing/Shell';
export default function Page() {
  return (
    <MarketingShell>
      <section className="max-w-[820px] mx-auto px-5 sm:px-7 pt-20 sm:pt-28 pb-12 text-center">
        <Eyebrow color={C.gold}>Pricing</Eyebrow>
        <h1 className="font-satoshi text-[clamp(40px,9vw,96px)] font-black leading-none text-white">It's free.</h1>
        <p className="mt-6 text-[16.5px] leading-[1.8] text-[#9DB0CC]">
          No account fee. No monthly tier. No "upgrade to unlock." Open it, hold it, and trade US stocks with zero commission. The whole product is on the table from day one.
        </p>
      </section>
      <section className="max-w-[760px] mx-auto px-5 sm:px-7 pb-20">
        <div className="space-y-3">
          {[
            ['$0', 'to open, hold and close your account'],
            ['$0', 'commission on US stocks and ETFs'],
            ['Flat fee', 'on FX, shown before you confirm. Not buried in the rate'],
            ['Tight spread', 'on crypto trades, displayed live'],
            ['Interest', 'we earn on idle cash, the standard brokerage model'],
            ['No PFOF', 'on HK listings, and we tell you where US flow routes'],
          ].map(([k, v]) => (
            <div key={v} className="flex items-start gap-4 rounded-xl border border-white/[0.08] px-5 py-4" style={{ background: '#0E1B30' }}>
              <span className="font-satoshi font-black shrink-0 w-24" style={{ color: C.gold }}>{k}</span>
              <span className="text-[14.5px] text-[#9DB0CC]">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-9 text-center"><BtnPrimary href="/auth/signup">Open free account</BtnPrimary></div>
      </section>
    </MarketingShell>
  );
}
