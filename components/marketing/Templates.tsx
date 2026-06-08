'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Plus, Minus } from 'lucide-react';
import { MarketingShell, C, Eyebrow, PageHero, BtnPrimary, BtnOutline } from '@/components/marketing/Shell';

export type Block = { h: string; p: string; img?: string; bullets?: string[] };
export type Spec = { k: string; v: string };
export type SpecGroup = { title: string; items: Spec[] };
export type Faq = { q: string; a: string };

/* ── Section heading ── */
export function SectionHead({ eyebrow, color = C.gold, title, sub }: { eyebrow?: string; color?: string; title: string; sub?: string }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <Eyebrow color={color}>{eyebrow}</Eyebrow>}
      <h2 className="font-satoshi text-[clamp(26px,3.6vw,44px)] font-black leading-[1.04] text-white">{title}</h2>
      {sub && <p className="mt-4 text-[15.5px] leading-[1.7] text-[#9DB0CC]">{sub}</p>}
    </div>
  );
}

/* ── Spec table (lots of detail, "ugly but useful") ── */
export function SpecGrid({ groups }: { groups: SpecGroup[] }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
      {groups.map((g) => (
        <div key={g.title} className="rounded-xl border border-white/[0.08] overflow-hidden" style={{ background: '#0E1B30' }}>
          <div className="px-5 py-3 border-b border-white/[0.07] text-[12px] uppercase tracking-[0.14em] text-[#8A9BB3]">{g.title}</div>
          <dl className="divide-y divide-white/[0.05]">
            {g.items.map((it) => (
              <div key={it.k} className="flex items-start justify-between gap-4 px-5 py-3">
                <dt className="text-[13.5px] text-[#8A9BB3]">{it.k}</dt>
                <dd className="text-[13.5px] text-white text-right font-medium">{it.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

/* ── Comparison table ── */
export function CompareTable({ cols, rows, highlight = 0 }: { cols: string[]; rows: [string, ...string[]][]; highlight?: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="w-full text-left border-collapse min-w-[640px]">
        <thead>
          <tr style={{ background: '#0E1B30' }}>
            <th className="px-5 py-3.5 text-[12px] uppercase tracking-[0.12em] text-[#8A9BB3] font-medium"></th>
            {cols.map((c, i) => (
              <th key={c} className="px-5 py-3.5 text-[13px] font-bold" style={{ color: i === highlight ? C.gold : '#C2CEDD' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-t border-white/[0.06]">
              <td className="px-5 py-3.5 text-[13.5px] text-[#9DB0CC]">{r[0]}</td>
              {r.slice(1).map((cell, i) => (
                <td key={i} className="px-5 py-3.5 text-[13.5px]" style={{ color: i === highlight ? '#FFFFFF' : '#8A9BB3', fontWeight: i === highlight ? 600 : 400, background: i === highlight ? 'rgba(196,160,82,0.05)' : 'transparent' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── FAQ (native details/summary, no JS, accessible) ── */
export function FAQ({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-white/[0.07] rounded-xl border border-white/[0.08]" style={{ background: '#0E1B30' }}>
      {items.map((f) => (
        <details key={f.q} className="group px-5">
          <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none">
            <span className="text-[15px] font-semibold text-white">{f.q}</span>
            <Plus className="w-4 h-4 shrink-0 text-[#8A9BB3] group-open:hidden" />
            <Minus className="w-4 h-4 shrink-0 text-[#8A9BB3] hidden group-open:block" />
          </summary>
          <p className="pb-4 text-[14px] leading-[1.7] text-[#9DB0CC]">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/* ── Rich product page ── */
export function ProductPage({
  eyebrow, color, title, sub, lead, heroImg, blocks, specs, faqs, ctaTitle, ctaHref = '/auth/signup',
}: {
  eyebrow: string; color: string; title: string; sub: string; lead?: string; heroImg: string;
  blocks: Block[]; specs?: SpecGroup[]; faqs?: Faq[]; ctaTitle: string; ctaHref?: string;
}) {
  return (
    <MarketingShell>
      <PageHero eyebrow={eyebrow} title={title} sub={sub} color={color} img={heroImg} alt={eyebrow} />

      {lead && (
        <section className="max-w-[820px] mx-auto px-5 sm:px-7 pb-4">
          <p className="text-[17px] leading-[1.85] text-[#B6C3D6]">{lead}</p>
        </section>
      )}

      <section className="max-w-[1180px] mx-auto px-5 sm:px-7 py-12 sm:py-16 space-y-20">
        {blocks.map((b, i) => {
          const flip = i % 2 === 1;
          return (
            <div key={b.h} className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <motion.div initial={{ opacity: 0, x: flip ? 24 : -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-70px' }} transition={{ duration: 0.5 }}
                className={flip ? 'lg:order-2' : ''}>
                <h2 className="font-satoshi text-[clamp(24px,3vw,36px)] font-bold leading-[1.08] text-white">{b.h}</h2>
                <p className="mt-4 text-[15.5px] leading-[1.75] text-[#9DB0CC] max-w-md">{b.p}</p>
                {b.bullets && (
                  <ul className="mt-5 space-y-2.5">
                    {b.bullets.map((x) => <li key={x} className="flex items-start gap-2.5 text-[14.5px] text-[#D6DEEC]"><Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />{x}</li>)}
                  </ul>
                )}
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-70px' }} transition={{ duration: 0.55 }}
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

      {specs && (
        <section className="max-w-[1180px] mx-auto px-5 sm:px-7 py-10">
          <SectionHead eyebrow="The detail" color={color} title="Everything, on the record." sub="The specifics most sites bury. Here they are in one place." />
          <div className="mt-8"><SpecGrid groups={specs} /></div>
        </section>
      )}

      {faqs && (
        <section className="max-w-[900px] mx-auto px-5 sm:px-7 py-12">
          <SectionHead color={color} title="Questions, answered straight." />
          <div className="mt-8"><FAQ items={faqs} /></div>
        </section>
      )}

      <section className="max-w-[1180px] mx-auto px-5 sm:px-7 pb-20 pt-6">
        <div className="rounded-2xl border border-white/[0.08] px-7 py-12 text-center" style={{ background: '#0E1B30' }}>
          <h2 className="font-satoshi text-[clamp(24px,3.6vw,40px)] font-black text-white">{ctaTitle}</h2>
          <p className="mt-3 text-[14px] text-[#8A9BB3]">Free to open. No SSN until you fund. 90 seconds.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <BtnPrimary href={ctaHref}>Open free account <ArrowRight className="w-4 h-4" /></BtnPrimary>
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
