'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, Clock } from 'lucide-react';

export default function SwiftBridgeShowcase() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(231,198,106,0.06), transparent 70%),' +
              'linear-gradient(180deg, #050713 0%, #080D1C 100%)',
          }}
        />
      </div>

      <div className="max-w-[1280px] mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* LEFT — copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E7C66A]/30 bg-[#E7C66A]/[0.06] mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E7C66A] animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#E7C66A]">
                SwiftBridge
              </span>
            </div>

            <h2 className="text-[36px] sm:text-[44px] lg:text-[52px] font-bold tracking-tight text-white leading-[1.02]">
              Local money.
              <br />
              <span className="bg-gradient-to-r from-[#E7C66A] via-[#F5C542] to-[#E7C66A] bg-clip-text text-transparent">
                Global access.
              </span>
            </h2>

            <p className="mt-5 text-[16px] text-[#94A3B8] leading-relaxed max-w-xl">
              Pay in NGN, GHS, PHP, INR, BRL or any of 12 supported local
              currencies. Receive USDT, BTC, ETH or USD into your Swift Trade
              wallet in minutes. Compliance handled. No bank wire needed.
            </p>

            <div className="mt-7 space-y-3">
              {[
                { i: Zap,    t: 'Settles in 4–15 minutes during business hours' },
                { i: Shield, t: 'Audited custody · Compliant in 12 jurisdictions' },
                { i: Clock,  t: 'No SWIFT wire, no correspondent banks, no surprises' },
              ].map(item => (
                <div key={item.t} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E7C66A]/[0.08] border border-[#E7C66A]/20 flex items-center justify-center shrink-0">
                    <item.i className="w-4 h-4 text-[#E7C66A]" />
                  </div>
                  <p className="text-[14px] text-[#CBD5E1] leading-relaxed pt-1.5">{item.t}</p>
                </div>
              ))}
            </div>

            <Link
              href="/auth/signup"
              className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[14.5px] font-semibold text-[#050713] bg-gradient-to-r from-[#E7C66A] to-[#F5C542] hover:brightness-110 transition-all active:scale-[0.98]"
            >
              Try SwiftBridge
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* RIGHT — animated route mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
          >
            <BridgeRoute />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function BridgeRoute() {
  return (
    <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0D1324] via-[#0B1020] to-[#080A15] p-6 sm:p-8 shadow-2xl shadow-black/40 overflow-hidden">
      {/* You send */}
      <div className="mb-4">
        <p className="text-[10.5px] uppercase tracking-[0.18em] text-[#94A3B8] mb-1.5">You send</p>
        <div className="flex items-baseline gap-3">
          <span className="text-[32px] sm:text-[38px] font-bold text-white tabular-nums leading-none">₦2,000,000</span>
          <span className="text-[13px] text-[#64748B]">NGN</span>
        </div>
      </div>

      {/* Animated route */}
      <div className="relative my-7 py-5">
        <svg width="100%" height="56" viewBox="0 0 400 56" preserveAspectRatio="none" className="overflow-visible">
          <defs>
            <linearGradient id="route-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00E88F" />
              <stop offset="50%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#5B7CFF" />
            </linearGradient>
            <filter id="dot-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M 20 28 L 380 28"
            stroke="url(#route-line)"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
            opacity="0.45"
          />
          <motion.circle
            r="5"
            fill="#00E88F"
            filter="url(#dot-glow)"
            initial={{ cx: 20 }}
            animate={{ cx: [20, 200, 380, 20] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
        {/* Labels */}
        <div className="absolute inset-0 flex items-center justify-between text-[10px] uppercase tracking-[0.15em]">
          <div className="text-center">
            <div className="w-6 h-6 mx-auto rounded-full bg-[#00E88F]/15 border border-[#00E88F]/30 mb-1.5" />
            <span className="text-[#00E88F]">Nigeria</span>
          </div>
          <div className="text-center">
            <div className="w-6 h-6 mx-auto rounded-full bg-[#22D3EE]/15 border border-[#22D3EE]/30 mb-1.5" />
            <span className="text-[#22D3EE]">Hong Kong</span>
          </div>
          <div className="text-center">
            <div className="w-6 h-6 mx-auto rounded-full bg-[#5B7CFF]/15 border border-[#5B7CFF]/30 mb-1.5" />
            <span className="text-[#5B7CFF]">Your Wallet</span>
          </div>
        </div>
      </div>

      {/* You receive */}
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.18em] text-[#94A3B8] mb-1.5">You receive</p>
        <div className="flex items-baseline gap-3">
          <span className="text-[32px] sm:text-[38px] font-bold tabular-nums leading-none bg-gradient-to-r from-[#00E88F] to-[#22D3EE] bg-clip-text text-transparent">
            1,284.42
          </span>
          <span className="text-[13px] text-[#64748B]">USDT · TRC-20</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-5 border-t border-white/[0.05] flex items-center justify-between text-[12px]">
        <span className="text-[#94A3B8]">ETA</span>
        <span className="text-white font-medium tabular-nums">~4 minutes</span>
      </div>
    </div>
  );
}
