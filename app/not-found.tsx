'use client';
import Link from 'next/link';
import { MarketingShell, C, BtnPrimary } from '@/components/marketing/Shell';
export default function NotFound() {
  return (
    <MarketingShell>
      <section className="max-w-[760px] mx-auto px-5 sm:px-7 pt-24 pb-28 text-center">
        <div className="font-satoshi text-[clamp(64px,16vw,140px)] font-black leading-none text-white">404</div>
        <p className="mt-2 font-satoshi text-[20px] font-bold" style={{ color: C.ny }}>This page got stopped out.</p>
        <p className="mt-4 text-[15px] text-[#9DB0CC] max-w-md mx-auto">No position here. The link either expired, moved, or never filled. Let's get you back to a market that's open.</p>
        <div className="mt-8 flex justify-center gap-3 flex-wrap">
          <BtnPrimary href="/">Back home</BtnPrimary>
          <Link href="/swiftbridge" className="inline-flex items-center px-5 py-3 rounded-lg text-[14.5px] font-semibold text-white border border-white/15 hover:bg-white/[0.05]">See SwiftBridge</Link>
        </div>
      </section>
    </MarketingShell>
  );
}
