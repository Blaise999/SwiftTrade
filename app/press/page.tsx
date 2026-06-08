'use client';
import { MarketingShell, C, Eyebrow, BtnPrimary } from '@/components/marketing/Shell';
export default function Page() {
  return (
    <MarketingShell>
      <section className="max-w-[900px] mx-auto px-5 sm:px-7 pt-16 sm:pt-24 pb-10">
        <Eyebrow>Press</Eyebrow>
        <h1 className="font-satoshi text-[clamp(32px,5.2vw,56px)] font-black leading-[1.02] text-white">Press &amp; media.</h1>
        <p className="mt-5 text-[16px] leading-[1.8] text-[#9DB0CC]">
          We are in beta and under SEC review, so we are not going to dress up coverage we don't have yet. When real stories run, they'll be linked here with screenshots. Until then, here is everything a reporter needs.
        </p>
        <div className="mt-9 grid sm:grid-cols-2 gap-5">
          {[
            ['Press kit', 'Logos, brand colours, founder headshots and product shots in one zip.'],
            ['Fact sheet', 'Founding date, HQs, licenses, leadership bios and current metrics.'],
            ['Media contact', 'press@swifttrade.com. We usually reply within a business day.'],
            ['Brand guidelines', 'How to write the name (one word, capital S) and use the mark.'],
          ].map(([h, p]) => (
            <div key={h} className="rounded-xl border border-white/[0.08] p-5" style={{ background: '#0E1B30' }}>
              <div className="font-satoshi font-bold text-white">{h}</div>
              <p className="mt-1.5 text-[14px] text-[#8A9BB3] leading-relaxed">{p}</p>
            </div>
          ))}
        </div>
        <div className="mt-9"><BtnPrimary href="mailto:press@swifttrade.com">Email the press desk</BtnPrimary></div>
      </section>
    </MarketingShell>
  );
}
