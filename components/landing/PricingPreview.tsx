'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const TIERS = [
  {
    name: 'Starter',
    price: '50',
    bonus: '+ $10 credited',
    desc: 'For your first chapter on the platform.',
    features: [
      'Spot crypto + foreign exchange',
      'SwiftBridge access',
      'Daily limit · $2,000',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    price: '300',
    bonus: '+ $60 credited',
    desc: 'For active hands and bigger lines.',
    popular: true,
    features: [
      'Everything in Starter',
      'Equities (US + HK)',
      'Daily limit · $10,000',
      'Priority SwiftBridge',
      'Live chat support',
    ],
  },
  {
    name: 'Elite',
    price: '1,500',
    bonus: '+ $400 credited',
    desc: 'For traders who run capital seriously.',
    features: [
      'Everything in Pro',
      'Daily limit · $50,000',
      'Custom FX rates',
      'API access',
      'Fast-track verification',
    ],
  },
  {
    name: 'Sovereign',
    price: '5,000',
    bonus: '+ $1,500 credited',
    desc: 'Concierge tier with a personal manager.',
    features: [
      'Everything in Elite',
      'Daily limit · $250,000',
      'Personal account manager',
      'Bespoke FX corridors',
      'OTC desk access',
    ],
  },
];

export default function PricingPreview() {
  return (
    <section id="pricing" className="relative py-32 bg-void overflow-hidden">
      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-x-10 mb-20">
          <div className="lg:col-span-7">
            <p className="text-[10px] uppercase tracking-[0.4em] text-champagne-300/70 mb-5">Tiers</p>
            <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-pearl-50 leading-[0.98]">
              Pay once.<br/>
              <em className="italic font-medium text-champagne-300/95">Keep</em> the perks.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pt-3 flex items-end">
            <p className="text-pearl-200/70 leading-relaxed text-base lg:text-lg">
              No subscriptions, no recurring charges, no expiry. Tiers are
              one-time purchases that earn you a sign-up credit and unlock
              perks for life.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-pearl-100/[0.06] rounded-2xl overflow-hidden border border-pearl-100/[0.06]">
          {TIERS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className={`relative bg-void p-8 lg:p-9 transition-colors hover:bg-charcoal/40 ${
                t.popular ? 'lg:bg-charcoal/30' : ''
              }`}
            >
              {t.popular && (
                <div className="absolute top-5 right-5 text-[9px] uppercase tracking-[0.2em] text-champagne-300 font-medium">
                  Recommended
                </div>
              )}
              <div className="font-serif text-2xl text-pearl-50 font-medium">{t.name}</div>
              <p className="mt-2 text-sm text-pearl-300/60 min-h-[42px]">{t.desc}</p>

              <div className="mt-7 mb-1 flex items-baseline gap-1.5">
                <span className="text-pearl-300/50 text-base">$</span>
                <span className="font-serif font-light text-5xl text-pearl-50 tracking-tight">{t.price}</span>
                <span className="text-pearl-300/45 text-xs">once</span>
              </div>
              <div className="text-[11px] text-champagne-300/85 font-medium mb-8 tracking-wide">{t.bonus}</div>

              <ul className="space-y-3 mb-9 min-h-[180px]">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-pearl-200/85">
                    <Check className="w-3.5 h-3.5 text-champagne-300/85 flex-shrink-0 mt-1" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard/tier"
                className={`block w-full text-center py-3 rounded-full font-medium text-sm transition-all ${
                  t.popular
                    ? 'bg-pearl-50 hover:bg-pearl-100 text-void'
                    : 'border border-pearl-100/15 hover:border-pearl-100/30 text-pearl-50 hover:bg-white/5'
                }`}
              >
                Choose {t.name}
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center mt-10 text-[11px] text-pearl-300/40">
          One-time. Bonus credited to your platform balance instantly upon approval.
        </p>
      </div>
    </section>
  );
}
