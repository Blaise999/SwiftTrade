'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

const PILLARS = [
  {
    n: '01',
    title: 'A trading floor without the floor.',
    desc: 'Crypto, foreign exchange and global equities — under one custody account, on one screen, with one set of fees. We removed the friction. The volatility is on you.',
    img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1400&q=80',
  },
  {
    n: '02',
    title: 'Concierge, not crowdsourced.',
    desc: 'SwiftBridge is staffed by humans, paying out through verified institutional rails in 80+ markets. No haggling. No P2P. Just a desk that picks up the phone.',
    img: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80',
  },
  {
    n: '03',
    title: 'Your keys. Your custody.',
    desc: 'Connect any self-custody wallet. Withdraw to any chain at any time. You hold the assets — we just clear the trades.',
    img: 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?auto=format&fit=crop&w=1400&q=80',
  },
];

const SMALL = [
  { t: 'Sub-50ms execution',     d: 'Co-located matching engine in HK, NY, LDN.' },
  { t: 'Cold-storage primary',   d: '95% of client funds held offline at all times.' },
  { t: 'Segregated treasury',    d: 'Funds at HSBC and Standard Chartered, not commingled.' },
  { t: 'Quarterly proof of reserves', d: 'Public attestation by an independent auditor.' },
  { t: 'API-first architecture', d: 'REST and WebSocket endpoints for algorithmic accounts.' },
  { t: 'Time-zone-agnostic desk',d: 'Operations staffed continuously across nine zones.' },
];

export default function FeaturesSection() {
  return (
    <section id="why" className="relative py-32 bg-void overflow-hidden">
      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="grid lg:grid-cols-12 gap-x-10 mb-20">
          <div className="lg:col-span-7">
            <p className="text-[10px] uppercase tracking-[0.4em] text-champagne-300/70 mb-5">Why Swift Trade</p>
            <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-pearl-50 leading-[0.98]">
              Built for serious<br/>
              <em className="italic font-medium text-champagne-300/95">capital.</em>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pt-3 flex items-end">
            <p className="text-pearl-200/70 leading-relaxed text-base lg:text-lg">
              No fluff. No fees printed in fine print. No surprises buried
              in tooltips. Markets that work, tools that respond, a desk
              that answers.
            </p>
          </div>
        </div>

        {/* PILLARS — editorial alternating layout */}
        <div className="space-y-32">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`grid lg:grid-cols-12 gap-10 items-center ${i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}
            >
              <div className="lg:col-span-7">
                <div className="relative aspect-[16/10] rounded-[20px] overflow-hidden border border-pearl-100/[0.07] group">
                  <Image src={p.img} alt={p.title} fill className="object-cover group-hover:scale-105 transition-transform duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-void/50 via-transparent to-transparent" />
                  <div className="absolute top-5 left-5 font-mono text-xs text-champagne-300/80 tracking-wider">{p.n}</div>
                </div>
              </div>
              <div className="lg:col-span-5">
                <h3 className="font-serif text-3xl md:text-4xl font-light tracking-tight text-pearl-50 leading-[1.1]">{p.title}</h3>
                <p className="mt-5 text-pearl-200/70 leading-relaxed text-[15px] lg:text-base">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* SMALL spec list */}
        <div className="mt-32 pt-14 border-t border-pearl-100/[0.07]">
          <div className="grid lg:grid-cols-12 gap-10 mb-10">
            <div className="lg:col-span-5">
              <p className="text-[10px] uppercase tracking-[0.4em] text-champagne-300/70 mb-4">Engineering</p>
              <h3 className="font-serif text-3xl md:text-4xl font-light tracking-tight text-pearl-50">
                Boring infrastructure.<br/><em className="italic font-medium text-champagne-300/95">Exciting</em> trades.
              </h3>
            </div>
            <div className="lg:col-span-7">
              <div className="grid sm:grid-cols-2 gap-x-10 gap-y-7">
                {SMALL.map((s) => (
                  <div key={s.t}>
                    <div className="font-medium text-pearl-50 mb-1.5">{s.t}</div>
                    <div className="text-sm text-pearl-300/60 leading-relaxed">{s.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
