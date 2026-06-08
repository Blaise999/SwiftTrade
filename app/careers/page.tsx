'use client';
import { MarketingShell, C, Eyebrow } from '@/components/marketing/Shell';
import { ChevronRight } from 'lucide-react';
export default function Page() {
  const roles = [
    { t: 'Senior Frontend Engineer', team: 'Product', loc: 'Remote (US/EU)', pay: '$160k–$210k' },
    { t: 'Payments Infrastructure Lead', team: 'SwiftBridge', loc: 'New York / London', pay: '$190k–$240k' },
    { t: 'Compliance Analyst', team: 'Risk', loc: 'Hong Kong', pay: 'HK$650k–HK$900k' },
    { t: 'Product Designer', team: 'Design', loc: 'Remote (Global)', pay: '$130k–$170k' },
  ];
  return (
    <MarketingShell>
      <section className="max-w-[1180px] mx-auto px-5 sm:px-7 pt-16 sm:pt-24 pb-8">
        <Eyebrow>Careers</Eyebrow>
        <h1 className="font-satoshi text-[clamp(32px,5.2vw,56px)] font-black leading-[1.02] text-white max-w-2xl">Help us move money at light speed.</h1>
        <p className="mt-5 text-[16px] leading-[1.7] text-[#9DB0CC] max-w-xl">Remote-first, async by default, small team that ships. We hire for judgement and curiosity over pedigree. Salary ranges are listed because guessing wastes everyone's time.</p>
      </section>
      <section className="max-w-[1180px] mx-auto px-5 sm:px-7 pb-20">
        <div className="space-y-3">
          {roles.map((r) => (
            <a key={r.t} href="mailto:jobs@swifttrade.com?subject=Application" className="group flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] px-5 py-4 hover:border-white/20 transition-colors" style={{ background: '#0E1B30' }}>
              <div>
                <div className="text-[15.5px] font-semibold text-white">{r.t}</div>
                <div className="text-[12.5px] text-[#5C6B80] mt-0.5">{r.team} · {r.loc} · <span style={{ color: C.gold }}>{r.pay}</span></div>
              </div>
              <span className="inline-flex items-center gap-1 text-[13px] text-[#9DB0CC] group-hover:text-white">Apply <ChevronRight className="w-4 h-4" /></span>
            </a>
          ))}
        </div>
        <p className="mt-8 text-[13.5px] text-[#5C6B80]">No perfect match? Email <span style={{ color: C.teal }}>jobs@swifttrade.com</span> with what you'd want to build.</p>
      </section>
    </MarketingShell>
  );
}
