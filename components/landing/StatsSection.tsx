'use client';

import { motion } from 'framer-motion';

const PRESS = ['Bloomberg', 'Financial Times', 'Reuters', 'Forbes', 'CoinDesk', 'TechCrunch'];

export function TrustBar() {
  return (
    <section className="relative bg-void border-y border-pearl-100/[0.04]">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-12">
        <div className="text-center mb-7">
          <p className="text-[10px] uppercase tracking-[0.4em] text-pearl-300/50 font-medium">In the press</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-5 lg:gap-x-20">
          {PRESS.map((p) => (
            <span key={p} className="font-serif text-pearl-200/35 hover:text-pearl-100/70 transition-colors text-xl lg:text-2xl tracking-tight font-light cursor-default">
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const STATS = [
  { v: '$1.4B+', l: 'Volume traded', sub: 'Last 12 months' },
  { v: '180k+',  l: 'Members',       sub: 'Across 80+ countries' },
  { v: '4m 12s', l: 'SwiftBridge',   sub: 'Avg settlement time' },
  { v: '99.99%', l: 'Uptime',        sub: 'Past 365 days' },
];

export default function StatsSection() {
  return (
    <section className="relative py-24 bg-void overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-sapphire-500/8 blur-[160px] rounded-full pointer-events-none" />

      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8">
        <div className="grid md:grid-cols-4 gap-px bg-pearl-100/[0.06] rounded-2xl overflow-hidden border border-pearl-100/[0.06]">
          {STATS.map((s, i) => (
            <motion.div
              key={s.l}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-void p-8 lg:p-10"
            >
              <div className="font-serif text-4xl lg:text-5xl font-light text-pearl-50 tracking-tight">
                {s.v}
              </div>
              <div className="mt-4 text-sm text-pearl-200/85">{s.l}</div>
              <div className="text-[11px] text-pearl-300/50 mt-1">{s.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const BADGES = [
  { v: 'SFC Type 1, 4, 9',     l: 'Hong Kong SFC' },
  { v: 'ISO 27001',            l: 'Info security' },
  { v: 'SOC 2 Type II',        l: 'Audited annually' },
  { v: 'PCI-DSS Level 1',      l: 'Card security' },
  { v: 'GDPR + CCPA',          l: 'Data rights' },
  { v: 'AICPA',                l: 'Compliance' },
];

export function ComplianceBadges() {
  return (
    <section className="relative py-24 bg-void">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.4em] text-champagne-300/70 font-medium mb-4">Custodian-grade</p>
          <h3 className="font-serif text-3xl md:text-5xl font-light text-pearl-50 tracking-tight">
            Six layers between<br/>
            <em className="italic font-medium text-champagne-300/95">your money</em> and the world.
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-pearl-100/[0.06] rounded-2xl overflow-hidden border border-pearl-100/[0.06]">
          {BADGES.map((b, i) => (
            <motion.div
              key={b.v}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-void p-7 group hover:bg-charcoal/40 transition-colors"
            >
              <div className="font-serif font-light text-pearl-50 text-xl tracking-tight mb-1.5">{b.v}</div>
              <div className="text-[11px] text-pearl-300/60 uppercase tracking-wider">{b.l}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
