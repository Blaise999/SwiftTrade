'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { MarketingShell, C, Eyebrow, PageHero, BtnPrimary, BtnOutline } from '@/components/marketing/Shell';

export type Block = { h: string; p: string; img?: string; bullets?: string[] };

export function ProductPage({
  eyebrow, color, title, sub, heroImg, blocks, ctaTitle, ctaHref = '/auth/signup',
}: {
  eyebrow: string; color: string; title: string; sub: string; heroImg: string;
  blocks: Block[]; ctaTitle: string; ctaHref?: string;
}) {
  return (
    <MarketingShell>
      <PageHero eyebrow={eyebrow} title={title} sub={sub} color={color} img={heroImg} alt={eyebrow} />
      <section className="max-w-[1180px] mx-auto px-5 sm:px-7 py-12 sm:py-16 space-y-20">
        {blocks.map((b, i) => {
          const flip = i % 2 === 1;
          return (
            <div key={b.h} className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <motion.div initial={{ opacity: 0, x: flip ? 24 : -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-70px' }} transition={{ duration: 0.55 }}
                className={flip ? 'lg:order-2' : ''}>
                <h2 className="font-satoshi text-[clamp(24px,3vw,36px)] font-bold leading-[1.08] text-white">{b.h}</h2>
                <p className="mt-4 text-[15.5px] leading-[1.7] text-[#9DB0CC] max-w-md">{b.p}</p>
                {b.bullets && (
                  <ul className="mt-5 space-y-2.5">
                    {b.bullets.map((x) => <li key={x} className="flex items-start gap-2.5 text-[14.5px] text-[#D6DEEC]"><Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />{x}</li>)}
                  </ul>
                )}
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-70px' }} transition={{ duration: 0.6 }}
                className={flip ? 'lg:order-1' : ''}>
                {b.img ? (
                  <div className="overflow-hidden rounded-tr-[24px] rounded-bl-[24px] rounded-tl-sm rounded-br-sm border border-white/[0.10]">
                    <img src={b.img} alt={b.h} loading="lazy" className="w-full h-[300px] object-cover" />
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/[0.08] p-6" style={{ background: '#0E1B30' }}>
                    <div className="h-px w-12 mb-4" style={{ background: color }} />
                    <p className="text-[14px] text-[#8A9BB3] leading-relaxed">{b.p}</p>
                  </div>
                )}
              </motion.div>
            </div>
          );
        })}
      </section>
      <section className="max-w-[1180px] mx-auto px-5 sm:px-7 pb-20">
        <div className="rounded-2xl border border-white/[0.08] px-7 py-12 text-center" style={{ background: '#0E1B30' }}>
          <h2 className="font-satoshi text-[clamp(24px,3.6vw,40px)] font-black text-white">{ctaTitle}</h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <BtnPrimary href={ctaHref}>Open account free <ArrowRight className="w-4 h-4" /></BtnPrimary>
            <BtnOutline href="/">Back home</BtnOutline>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

export function LegalPage({ title, updated, blocks }: { title: string; updated: string; blocks: { h: string; p: string }[] }) {
  return (
    <MarketingShell>
      <section className="max-w-[820px] mx-auto px-5 sm:px-7 pt-16 sm:pt-24 pb-20">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="font-satoshi text-[clamp(30px,5vw,52px)] font-black text-white leading-[1.02]">{title}</h1>
        <p className="mt-3 text-[13px] text-[#5C6B80]">Last updated {updated}. This is a plain-language summary, not the full filed document.</p>
        <div className="mt-10 space-y-9">
          {blocks.map((b) => (
            <div key={b.h}>
              <h2 className="font-satoshi text-[18px] font-bold text-white border-l-2 pl-3" style={{ borderColor: C.gold }}>{b.h}</h2>
              <p className="mt-3 text-[15px] leading-[1.8] text-[#9DB0CC]">{b.p}</p>
            </div>
          ))}
        </div>
        <p className="mt-12 text-[13px] text-[#5C6B80]">Questions? Email <span style={{ color: C.teal }}>legal@swifttrade.com</span>. Full filed documents are available on request and at account opening.</p>
      </section>
    </MarketingShell>
  );
}
