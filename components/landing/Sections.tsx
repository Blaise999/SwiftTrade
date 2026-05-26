'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// HOW IT WORKS
// ─────────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: '01',
    title: 'Open the door',
    desc: 'Apply in under sixty seconds. Verify identity to lift limits and lower fees.',
    img: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80',
  },
  {
    n: '02',
    title: 'Fund the account',
    desc: 'Wire crypto on-chain or convert local cash through SwiftBridge in minutes.',
    img: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&fit=crop&w=1200&q=80',
  },
  {
    n: '03',
    title: 'Trade on three classes',
    desc: 'Move between BTC, EUR/USD and NVDA in the same session, the same wallet.',
    img: 'https://images.unsplash.com/photo-1591696205602-2f950c417cb9?auto=format&fit=crop&w=1200&q=80',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="relative py-32 bg-void overflow-hidden">
      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-x-10 mb-20">
          <div className="lg:col-span-7">
            <p className="text-[10px] uppercase tracking-[0.4em] text-champagne-300/70 mb-5">How it works</p>
            <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-pearl-50 leading-[0.98]">
              From signup<br/>to <em className="italic font-medium text-champagne-300/95">first trade.</em>
            </h2>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group"
            >
              <div className="relative aspect-[4/5] rounded-[20px] overflow-hidden border border-pearl-100/[0.07]">
                <Image src={s.img} alt={s.title} fill className="object-cover group-hover:scale-105 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent" />
                <div className="absolute top-5 left-5 font-mono text-xs text-champagne-300/80 tracking-wider">{s.n}</div>
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="font-serif font-medium text-pearl-50 text-2xl tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-pearl-200/70 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// TESTIMONIALS — quote-led, editorial
// ─────────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: 'SwiftBridge replaced three different OTC brokers I used to use. The desk is faster than any of them.',
    name: 'Wei-Lin Chang',
    role: 'Hedge Fund Trader',
    location: 'Singapore',
    avatar: 'https://i.pravatar.cc/200?img=20',
  },
  {
    quote: 'I run my entire personal book here now — crypto, forex, equities. The settlement on the bridge is honestly absurd.',
    name: 'Marcus Calloway',
    role: 'Swing Trader',
    location: 'London',
    avatar: 'https://i.pravatar.cc/200?img=12',
  },
  {
    quote: 'Converted INR savings to BTC during a tight window. The desk replied in 90 seconds and we settled in three minutes.',
    name: 'Priya Sundaram',
    role: 'Private Investor',
    location: 'Mumbai',
    avatar: 'https://i.pravatar.cc/200?img=44',
  },
  {
    quote: 'The Sovereign tier is white-glove. My account manager picks up in two rings and the OTC desk has saved me real money.',
    name: 'Diego Reyes',
    role: 'Portfolio Manager',
    location: 'São Paulo',
    avatar: 'https://i.pravatar.cc/200?img=14',
  },
  {
    quote: 'Mobile experience is genuinely better than the desktop incumbents. I trade NVDA, EUR/USD and ETH on a single screen.',
    name: 'Aria Khoo',
    role: 'Retail Trader',
    location: 'Manila',
    avatar: 'https://i.pravatar.cc/200?img=49',
  },
  {
    quote: 'Withdrawals come through within an hour. Every time. That alone is worth the upgrade fee.',
    name: 'Rachel Tang',
    role: 'Crypto Trader',
    location: 'Sydney',
    avatar: 'https://i.pravatar.cc/200?img=32',
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative py-32 bg-void overflow-hidden">
      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-x-10 mb-20">
          <div className="lg:col-span-7">
            <p className="text-[10px] uppercase tracking-[0.4em] text-champagne-300/70 mb-5">Members</p>
            <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-pearl-50 leading-[0.98]">
              The <em className="italic font-medium text-champagne-300/95">people</em><br/>
              we hold capital for.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pt-3 flex items-end">
            <p className="text-pearl-200/70 leading-relaxed text-base lg:text-lg">
              4.9 out of 5 across 12,400 reviews. Quietly, our members tell other members.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-pearl-100/[0.06] rounded-2xl overflow-hidden border border-pearl-100/[0.06]">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="bg-void p-8 lg:p-9"
            >
              <p className="font-serif font-light text-pearl-100 text-lg leading-[1.4] tracking-tight">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-7 pt-6 border-t border-pearl-100/[0.07] flex items-center gap-3">
                <Image
                  src={t.avatar}
                  alt={t.name}
                  width={42}
                  height={42}
                  className="rounded-full grayscale"
                />
                <div>
                  <div className="text-pearl-50 text-sm font-medium">{t.name}</div>
                  <div className="text-pearl-300/55 text-xs mt-0.5">{t.role} · {t.location}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// COMPANY — Hong Kong, refined
// ─────────────────────────────────────────────────────────────────
export function CompanySection() {
  return (
    <section id="company" className="relative py-32 bg-void overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-[0.15]">
        <Image
          src="https://images.unsplash.com/photo-1535139262971-c51845709a48?auto=format&fit=crop&w=2400&q=85"
          alt="Hong Kong waterfront"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-void via-void/85 to-void/30" />
      </div>

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-x-10 items-center">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 mb-7">
              <MapPin className="w-3.5 h-3.5 text-champagne-300/80" />
              <span className="text-[10px] uppercase tracking-[0.4em] text-champagne-300/80 font-medium">Hong Kong · 香港</span>
            </div>
            <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-pearl-50 leading-[0.98]">
              Built in Asia&apos;s<br/>
              <em className="italic font-medium text-champagne-300/95">financial</em> capital.
            </h2>
            <div className="mt-9 max-w-xl space-y-5 text-pearl-200/75 leading-relaxed text-base">
              <p>
                Swift Trade is licensed and registered in Hong Kong — the
                world&apos;s third-largest financial center. We hold SFC Type 1, 4
                and 9 licenses, maintain segregated client accounts at HSBC and
                Standard Chartered, and undergo SOC 2 audits annually.
              </p>
              <p>
                Our SwiftBridge desk operates twenty-four hours a day across
                nine time zones, with verified local banking partners in eighty-plus
                countries.
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lg:col-span-6 relative mt-12 lg:mt-0"
          >
            <div className="relative aspect-[4/5] rounded-[20px] overflow-hidden border border-pearl-100/[0.07]">
              <Image
                src="https://images.unsplash.com/photo-1559564484-0d39c5b69b1c?auto=format&fit=crop&w=1400&q=85"
                alt="Hong Kong central district"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void/80 via-transparent to-transparent" />
              <div className="absolute bottom-7 left-7 right-7">
                <div className="font-mono text-[10px] text-champagne-300/80 tracking-wider mb-3">Headquarters</div>
                <div className="font-serif font-medium text-pearl-50 text-2xl tracking-tight">Two IFC, 8 Finance Street</div>
                <div className="text-pearl-300/60 text-sm mt-1">Central, Hong Kong SAR · 香港特別行政區</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// CTA
// ─────────────────────────────────────────────────────────────────
export function CTASection() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(91,124,255,0.18), transparent 65%),' +
            'radial-gradient(ellipse 60% 40% at 20% 30%, rgba(0,232,143,0.08), transparent 60%),' +
            'linear-gradient(180deg, #050713 0%, #080D1C 50%, #050713 100%)',
        }}
      />

      <div className="relative max-w-[1100px] mx-auto px-5 sm:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.10] bg-white/[0.03] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E88F] animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#94A3B8]">
              Ready when you are
            </span>
          </div>
          <h2 className="text-[44px] sm:text-[56px] lg:text-[72px] font-bold tracking-tight text-white leading-[0.96]">
            Capital,{' '}
            <span className="bg-gradient-to-r from-[#00E88F] via-[#22D3EE] to-[#5B7CFF] bg-clip-text text-transparent italic">
              unbordered.
            </span>
          </h2>
          <p className="mt-6 text-[17px] text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
            60 seconds to open. A lifetime of access. Three markets, twelve
            currencies, one Swift Trade account.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/signup"
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-[15px] font-semibold text-[#050713] transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #00E88F 0%, #22D3EE 50%, #5B7CFF 100%)',
                boxShadow: '0 10px 32px -8px rgba(34,211,238,0.5)',
              }}
            >
              Open account
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-white/[0.12] hover:bg-white/[0.04] rounded-full text-[15px] font-medium text-white backdrop-blur-md transition-all"
            >
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
