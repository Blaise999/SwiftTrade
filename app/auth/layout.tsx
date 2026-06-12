'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MarketingNav, Backdrop, Mark, C } from '@/components/marketing/Shell';
import { SkylineVisual } from '@/components/marketing/Visuals';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mkt min-h-screen text-[#EAF0F8] flex flex-col">
      <Backdrop />

      {/* slim top bar */}
      <header className="h-[64px] flex items-center border-b border-white/[0.06]">
        <div className="w-full max-w-[1180px] mx-auto px-5 sm:px-7 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark />
            <span className="font-satoshi font-black text-[18px] tracking-tight text-white">Swift<span style={{ color: C.gold }}>trade</span></span>
          </Link>
          <Link href="/" className="text-[13.5px] text-[#8A9BB3] hover:text-white transition-colors">Back to site</Link>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* ── LEFT brand panel (desktop) ── */}
        <div className="hidden lg:flex lg:w-[46%] xl:w-1/2 relative overflow-hidden border-r border-white/[0.06]">
          <div className="relative z-10 flex flex-col justify-between p-12 xl:p-14 w-full">
            <div />
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-md">
              <div className="inline-flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] mb-5" style={{ color: C.gold }}>
                <span className="w-6 h-px" style={{ background: C.gold }} />New York · Hong Kong
              </div>
              <h2 className="font-satoshi text-[clamp(28px,3vw,40px)] font-black leading-[1.04] text-white">
                US stocks, crypto and FX.<br />One free account.
              </h2>
              <p className="mt-4 text-[14.5px] leading-[1.7] text-[#8A9BB3]">
                Zero commission on US equities, 350+ crypto pairs, mid-market FX, and SwiftBridge transfers that settle in about 8 seconds.
              </p>
              <div className="mt-8"><SkylineVisual h={210} /></div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[11.5px] text-[#5C6B80]">
                <span>SEC-registered broker-dealer</span>
                <span>FINRA member</span>
                <span>HK SFC VA platform</span>
                <span>HKMA stablecoin issuer</span>
              </div>
            </motion.div>
            <p className="text-[11.5px] text-[#5C6B80]">Founded 2020 · Built by traders who hate slow wires.</p>
          </div>
        </div>

        {/* ── RIGHT form area ── */}
        <div className="flex-1 flex items-start lg:items-center justify-center px-5 py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
