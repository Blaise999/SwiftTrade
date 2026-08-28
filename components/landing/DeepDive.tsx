'use client';

import { useRef } from 'react';
import { AmbientMotion } from './AmbientMotion';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ShieldCheck, Globe, ArrowRight, Clock, Layers,
  AlertTriangle, Landmark, Repeat, LineChart,
} from 'lucide-react';

/* ══════════════ WHY SHIELD MODE ══════════════ */
export function WhyShield() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const drift = useTransform(scrollYProgress, [0, 1], [30, -30]);

  return (
    <section ref={ref} className="relative py-24 sm:py-32 overflow-hidden">
      <AmbientMotion variant="mesh" tone="green" opacity={0.20} src="/motion/shield-deep.webp" />
      <AmbientMotion variant="candles" tone="green" opacity={0.22} />
      <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6">
        <motion.div style={{ y: drift }}>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--t-sub)] mb-5">
            <ShieldCheck className="w-3.5 h-3.5 text-[color:var(--profit)]" />
            The case for Shield
          </div>
          <h2 className="text-[32px] sm:text-[52px] font-bold tracking-tight text-[color:var(--t-hi)] leading-[1.02] max-w-3xl">
            Selling to avoid a drawdown is{' '}
            <span className="text-[color:var(--loss)]">expensive.</span>{' '}
            Shield is the cheaper exit.
          </h2>
        </motion.div>

        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-5">
            <p className="text-[15.5px] leading-[1.75] text-[color:var(--t-sub)]">
              Here&apos;s the problem every retail investor eventually runs into. The market turns,
              you get nervous, and your only real lever is to <span className="text-[color:var(--t-hi)] font-semibold">sell</span>.
              But selling is a one-way door with three costs attached: you crystallise a taxable event,
              you eat the spread on the way out, and — the expensive one — you have to be right
              <em> twice</em>. Once about getting out, and again about getting back in.
            </p>
            <p className="text-[15.5px] leading-[1.75] text-[color:var(--t-sub)]">
              That second decision is where most people lose. The research on this is unambiguous:
              investors who trade around volatility tend to underperform the same portfolio left alone,
              because the re-entry point is almost always worse than the exit felt like it would be.
              Missing a handful of the strongest days — which cluster tightly around the worst ones —
              does most of the damage.
            </p>
            <p className="text-[15.5px] leading-[1.75] text-[color:var(--t-sub)]">
              Shield collapses that into <span className="text-[color:var(--t-hi)] font-semibold">one decision</span>.
              Flip it on and the position&apos;s recorded value locks where it stands. You haven&apos;t sold —
              you still hold the asset, you keep the position open, and you flip it back off when your
              conviction returns. No liquidation, no re-entry timing problem, no cash sitting on the
              sidelines quietly losing to inflation.
            </p>

            <div className="pt-2 grid sm:grid-cols-3 gap-3">
              {[
                ['Cost', '1% flat', 'Of position value, at activation. Quoted before you confirm.'],
                ['Term', 'Open-ended', 'No expiry. Un-shield whenever you like.'],
                ['Coverage', 'Per position', 'Shield one holding or all of them.'],
              ].map(([k, v, d]) => (
                <div key={k} className="rounded-xl border border-[color:var(--line)] p-4">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--t-sub)]">{k}</div>
                  <div className="mt-1.5 text-[17px] font-bold text-[color:var(--t-hi)]">{v}</div>
                  <div className="mt-1 text-[11.5px] text-[color:var(--t-sub)] leading-relaxed">{d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* the maths panel */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-6 sticky top-24">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--t-sub)]">
                <LineChart className="w-3.5 h-3.5" /> Worked example
              </div>
              <p className="mt-3 text-[12.5px] text-[color:var(--t-sub)] leading-relaxed">
                A $10,000 position. The market falls 12% over three weeks, then recovers.
              </p>
              <div className="mt-5 space-y-3">
                {[
                  ['Do nothing', '$8,800', 'Rides it down, rides it back.', 'var(--loss)'],
                  ['Sell at the bottom', '$8,800 → cash', 'Locks the loss. Re-entry is a coin flip.', 'var(--loss)'],
                  ['Shield at the start', '$9,900', 'Value held. $100 premium paid.', 'var(--profit)'],
                ].map(([label, val, note, tone]) => (
                  <div key={label} className="rounded-xl border p-3.5"
                    style={{ borderColor: 'color-mix(in srgb, ' + tone + ' 28%, transparent)' }}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12.5px] font-semibold text-[color:var(--t-hi)]">{label}</span>
                      <span className="text-[15px] font-bold tabular-nums" style={{ color: tone as string }}>{val}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-[color:var(--t-sub)]">{note}</div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[10.5px] leading-relaxed text-[color:var(--t-sub)] opacity-75">
                Illustrative figures for explanation only. Not a forecast, not a guarantee, and not
                investment advice. Shield locks a recorded position value — it does not remove
                investment risk, and it is not insurance or a deposit product.
              </p>
            </div>
          </div>
        </div>

        {/* who it's for */}
        <div className="mt-14 grid gap-3 sm:grid-cols-3">
          {[
            [AlertTriangle, 'Before a catalyst', 'Earnings, a Fed print, a token unlock. Shield the night before, unshield after the dust lands.'],
            [Clock, 'When you can\u2019t watch', 'Travelling, working, asleep through the Asian session. Shield holds the line while you\u2019re away.'],
            [Layers, 'Locking in a run', 'A position ran hard and you want to bank the level without triggering a sale.'],
          ].map(([Icon, t, d]: any, i) => (
            <motion.div key={t}
              initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.07 }}
              className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-5">
              <Icon className="w-5 h-5 text-[color:var(--profit)]" />
              <h3 className="mt-3 text-[15px] font-bold text-[color:var(--t-hi)]">{t}</h3>
              <p className="mt-1.5 text-[12.5px] text-[color:var(--t-sub)] leading-relaxed">{d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════ WHY SWIFTBRIDGE ══════════════ */
export function WhyBridge() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const drift = useTransform(scrollYProgress, [0, 1], [26, -26]);

  return (
    <section ref={ref} className="relative py-24 sm:py-32 overflow-hidden">
      <AmbientMotion variant="mesh" tone="violet" opacity={0.20} src="/motion/bridge-deep.webp" />
      <AmbientMotion variant="flow" tone="violet" opacity={0.38} />
      <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6">
        <motion.div style={{ y: drift }} className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--t-sub)] mb-5">
            <Globe className="w-3.5 h-3.5 text-[#7C5CFC]" />
            The case for SwiftBridge
          </div>
          <h2 className="text-[32px] sm:text-[52px] font-bold tracking-tight text-[color:var(--t-hi)] leading-[1.02]">
            Correspondent banking was built in the{' '}
            <span className="text-[color:var(--t-sub)]">1970s.</span> It shows.
          </h2>
        </motion.div>

        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-5">
            <p className="text-[15.5px] leading-[1.75] text-[color:var(--t-sub)]">
              When you wire money across a border, it doesn&apos;t travel. It gets recorded as a
              debit in one ledger, then relayed through a chain of correspondent banks — each of
              which holds a <span className="text-[color:var(--t-hi)] font-semibold">nostro account</span> with
              the next, each taking a cut and a day. Your money isn&apos;t moving. It&apos;s being
              re-attested, hop by hop, until someone on the other side agrees to credit it.
            </p>
            <p className="text-[15.5px] leading-[1.75] text-[color:var(--t-sub)]">
              That architecture is why a cross-Pacific transfer still quotes three to five business
              days and why the true cost is never the headline fee. The real spread hides in the FX
              conversion — typically 2–4% away from mid-market — plus intermediary charges deducted
              in transit that nobody quotes you upfront. The World Bank has put the global average
              cost of a remittance at roughly 6%. On $10,000, that&apos;s $600 that simply evaporates
              between two ledgers.
            </p>
            <p className="text-[15.5px] leading-[1.75] text-[color:var(--t-sub)]">
              SwiftBridge routes around the correspondent chain entirely. You pay into a verified
              local account in your own currency; we settle the other leg from local liquidity on
              the receiving side. There&apos;s no hop sequence to wait on, because nothing is being
              relayed — both legs are funded locally and reconciled against each other. That&apos;s
              why the number is <span className="text-[color:var(--t-hi)] font-semibold">seconds, not days</span>.
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-6">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--t-sub)]">
                <Landmark className="w-3.5 h-3.5" /> $10,000, New York to Hong Kong
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ['Traditional wire', '3–5 days', '~$250–600 all-in', 'var(--loss)'],
                  ['Card / remittance app', 'Same day', '~$300–500 all-in', 'var(--gold)'],
                  ['SwiftBridge', '~8 seconds', 'Rate locked at request', 'var(--profit)'],
                ].map(([label, time, cost, tone]) => (
                  <div key={label} className="rounded-xl border p-3.5"
                    style={{ borderColor: 'color-mix(in srgb, ' + tone + ' 28%, transparent)' }}>
                    <div className="text-[12.5px] font-semibold text-[color:var(--t-hi)]">{label}</div>
                    <div className="mt-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-[15px] font-bold tabular-nums" style={{ color: tone as string }}>{time}</span>
                      <span className="text-[11.5px] text-[color:var(--t-sub)]">{cost}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[10.5px] leading-relaxed text-[color:var(--t-sub)] opacity-75">
                Comparison figures are typical industry ranges for illustration, not quotes.
                Your SwiftBridge rate is shown and locked when you submit a request.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-3">
          {[
            [Repeat, 'Both directions', 'Local currency in, USD or crypto out — and back again. One corridor, either way.'],
            [Clock, 'No banking hours', 'Correspondent rails sleep on weekends. Local settlement doesn\u2019t.'],
            [Landmark, 'Verified counterparties', 'Every payout account is checked before it\u2019s issued to you. No P2P roulette.'],
          ].map(([Icon, t, d]: any, i) => (
            <motion.div key={t}
              initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.07 }}
              className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-5">
              <Icon className="w-5 h-5 text-[#7C5CFC]" />
              <h3 className="mt-3 text-[15px] font-bold text-[color:var(--t-hi)]">{t}</h3>
              <p className="mt-1.5 text-[12.5px] text-[color:var(--t-sub)] leading-relaxed">{d}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/dashboard/bridge" prefetch={false}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[color:var(--t-hi)] text-black font-bold text-[14px] hover:opacity-90 transition">
            Move money now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
