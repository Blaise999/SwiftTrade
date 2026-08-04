'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Crown, Zap, Rocket, Shield } from 'lucide-react';
import { useStore } from '@/lib/supabase/store-supabase';

export type TierDef = {
  code: 'starter' | 'trader' | 'elite';
  name: string;
  price: number;
  tagline: string;
  icon: any;
  accent: string;
  perks: string[];
  featured?: boolean;
};

export const TIERS: TierDef[] = [
  {
    code: 'starter', name: 'Starter', price: 500, tagline: 'Get in the game', icon: Rocket, accent: '#5B9BFF',
    perks: [
      'US stocks, ETFs & crypto trading',
      '$10,000 daily trading limit',
      'SwiftBridge access (standard queue)',
      'Standard email support',
    ],
  },
  {
    code: 'trader', name: 'Trader', price: 1000, tagline: 'Trade like a pro', icon: Zap, accent: '#00E676', featured: true,
    perks: [
      'Everything in Starter',
      'FX trading unlocked',
      '$50,000 daily trading limit',
      'Shield mode on every position',
      'Priority support',
    ],
  },
  {
    code: 'elite', name: 'Elite', price: 2000, tagline: 'The whole vault', icon: Crown, accent: '#9B7CFF',
    perks: [
      'Everything in Trader',
      'Unlimited trading limits',
      'Auto-Shield + SwiftBridge priority',
      'Lowest fees on the platform',
      'VIP concierge (24/7)',
    ],
  },
];

export default function TierPage() {
  const { user } = useStore();
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const uid = (user as any)?.id;
    if (!uid) return;
    fetch(`/api/tier-purchases?userId=${uid}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        const approved = (j?.purchases || j?.data || []).find((p: any) => p.status === 'approved' || p.status === 'active');
        if (approved) setCurrent(approved.tier_code || approved.tierCode);
      }).catch(() => {});
  }, [(user as any)?.id]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden pb-28">
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 pt-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--accent)] mb-2">
            <Shield className="w-3.5 h-3.5" /> Membership
          </div>
          <h1 className="text-[26px] sm:text-[30px] font-extrabold text-[var(--text)] tracking-tight">Choose your tier</h1>
          <p className="text-[13px] text-[var(--text-2)] mt-1.5 max-w-md mx-auto">
            Unlock higher limits, more markets, and premium protection. One-time upgrade — the higher the tier, the more you can do.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {TIERS.map((t, i) => {
            const Icon = t.icon;
            const owned = current === t.code;
            return (
              <motion.div
                key={t.code}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i, duration: 0.45 }}
                className={`relative flex flex-col rounded-3xl border p-5 ${
                  t.featured
                    ? 'border-[var(--accent)]/40 bg-[var(--accent)]/[0.05]'
                    : 'border-[var(--border)] bg-[var(--card)]'
                }`}
                style={t.featured ? { boxShadow: '0 20px 60px -30px rgba(0,230,118,0.5)' } : undefined}
              >
                {t.featured && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-[var(--accent)] text-[#04140A]">
                    Most popular
                  </span>
                )}
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${t.accent}1a`, color: t.accent }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-[17px] font-bold text-[var(--text)]">{t.name}</div>
                <div className="text-[12px] text-[var(--text-3)]">{t.tagline}</div>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-[30px] font-extrabold text-[var(--text)] tabular-nums leading-none">${t.price.toLocaleString()}</span>
                  <span className="text-[12px] text-[var(--text-3)] mb-1">one-time</span>
                </div>

                <ul className="mt-4 space-y-2 flex-1">
                  {t.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-[12.5px] text-[var(--text-2)]">
                      <Check className="w-4 h-4 mt-[1px] shrink-0" style={{ color: t.accent }} />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>

                {owned ? (
                  <div className="mt-5 w-full py-3 rounded-2xl bg-[var(--inset)] text-[var(--text-2)] text-[13px] font-semibold text-center">
                    ✓ Your current tier
                  </div>
                ) : (
                  <Link
                    href={`/dashboard/tier/checkout?tier=${t.code}`}
                    className={`mt-5 w-full py-3 rounded-2xl text-[14px] font-bold text-center transition active:translate-y-px ${
                      t.featured ? 'text-[#04140A] glow-up' : 'text-white'
                    }`}
                    style={{ background: t.accent }}
                  >
                    Get {t.name}
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11px] text-[var(--text-3)]">
          Upgrades are reviewed by our desk and activated once payment is confirmed. Prices in USD.
        </p>
      </div>
    </div>
  );
}
