'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown, ArrowUpRight } from 'lucide-react';

const FLOW = [
  { n: '01', title: 'Choose your jurisdiction', desc: 'Select from 80+ supported markets. Specify the local amount and the digital asset you wish to receive.' },
  { n: '02', title: 'Receive payout instructions', desc: 'Our concierge desk replies within minutes with a verified local bank, mobile-money or e-wallet account.' },
  { n: '03', title: 'Settle locally, upload proof', desc: 'Send the local transfer through your usual rails. Upload a screenshot of confirmation. That is all.' },
  { n: '04', title: 'Crypto credited, instantly tradable', desc: 'Verification, settlement, and credit happen in minutes. Trade or withdraw to any wallet on any chain.' },
];

const COUNTRIES = [
  { code: 'hk', name: 'Hong Kong',     ccy: 'HKD' },
  { code: 'sg', name: 'Singapore',     ccy: 'SGD' },
  { code: 'jp', name: 'Japan',         ccy: 'JPY' },
  { code: 'kr', name: 'South Korea',   ccy: 'KRW' },
  { code: 'cn', name: 'China',         ccy: 'CNY' },
  { code: 'tw', name: 'Taiwan',        ccy: 'TWD' },
  { code: 'in', name: 'India',         ccy: 'INR' },
  { code: 'ph', name: 'Philippines',   ccy: 'PHP' },
  { code: 'id', name: 'Indonesia',     ccy: 'IDR' },
  { code: 'th', name: 'Thailand',      ccy: 'THB' },
  { code: 'vn', name: 'Vietnam',       ccy: 'VND' },
  { code: 'my', name: 'Malaysia',      ccy: 'MYR' },
  { code: 'au', name: 'Australia',     ccy: 'AUD' },
  { code: 'ae', name: 'UAE',           ccy: 'AED' },
  { code: 'gb', name: 'United Kingdom',ccy: 'GBP' },
  { code: 'us', name: 'United States', ccy: 'USD' },
];

export default function SwiftBridgeShowcase() {
  return (
    <section id="bridge" className="relative py-32 bg-void overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-[0.10]">
        <Image
          src="https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=2400&q=80"
          alt=""
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-void via-void/85 to-void" />
      </div>
      <div className="absolute -top-20 right-0 w-[600px] h-[600px] bg-sapphire-500/10 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-champagne-500/8 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="grid lg:grid-cols-12 gap-x-10 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-7"
          >
            <p className="text-[10px] uppercase tracking-[0.4em] text-champagne-300/80 mb-5">SwiftBridge — flagship feature</p>
            <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-pearl-50 leading-[0.98]">
              Local money,<br/>
              <em className="italic font-medium text-champagne-300/95">global</em> markets.
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-5 lg:pt-4 flex items-end"
          >
            <p className="text-pearl-200/75 leading-relaxed text-base lg:text-lg">
              SwiftBridge isn&apos;t peer-to-peer. It&apos;s a concierge — staffed
              by humans, paying out through verified institutional rails. Pay
              in your home currency. Receive USDT, USDC, BTC, ETH, or any
              listed asset, on any chain.
            </p>
          </motion.div>
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          {/* LEFT — Flow */}
          <div className="lg:col-span-7">
            <div className="border-t border-pearl-100/[0.07]">
              {FLOW.map((f, i) => (
                <motion.div
                  key={f.n}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="group grid grid-cols-12 gap-6 py-8 border-b border-pearl-100/[0.07] hover:bg-pearl-50/[0.01] transition-colors -mx-2 px-2 rounded"
                >
                  <div className="col-span-2 lg:col-span-1">
                    <div className="font-mono text-xs text-champagne-400/70 tracking-wider">{f.n}</div>
                  </div>
                  <div className="col-span-10 lg:col-span-11">
                    <h3 className="font-serif text-2xl lg:text-[28px] font-light text-pearl-50 tracking-tight leading-tight">{f.title}</h3>
                    <p className="mt-3 text-pearl-200/65 leading-relaxed text-[15px] max-w-xl">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Link
              href="/dashboard/bridge"
              className="group inline-flex items-center gap-2 px-6 py-3.5 mt-8 bg-pearl-50 hover:bg-pearl-100 rounded-full text-void font-medium transition-all hover:-translate-y-0.5"
            >
              Begin a bridge request
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* RIGHT — Visual mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lg:col-span-5 relative lg:sticky lg:top-28"
          >
            <div className="relative bg-gradient-to-br from-charcoal/90 to-obsidian/95 border border-pearl-100/[0.07] rounded-[20px] p-7 backdrop-blur-2xl shadow-card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.25em] text-pearl-300/50 mb-1">Bureau de change</div>
                  <div className="font-serif font-medium text-pearl-50 text-lg">SwiftBridge</div>
                </div>
                <span className="text-[10px] text-profit/90 flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse" />
                  Open
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[9px] uppercase tracking-[0.2em] text-pearl-300/50 font-medium">From</label>
                  <div className="mt-1.5 flex items-center gap-3 p-3.5 bg-pearl-50/[0.03] border border-pearl-100/[0.08] rounded-xl">
                    <Image src="https://flagcdn.com/w80/sg.png" alt="SG" width={32} height={20} className="rounded" />
                    <span className="font-medium text-pearl-50 text-sm">Singapore</span>
                    <span className="ml-auto text-pearl-300/50 text-xs font-mono">SGD</span>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-[0.2em] text-pearl-300/50 font-medium">You send</label>
                  <div className="mt-1.5 flex items-baseline gap-2 p-3.5 bg-pearl-50/[0.03] border border-pearl-100/[0.08] rounded-xl">
                    <span className="text-pearl-300/40 text-sm">S$</span>
                    <span className="font-serif font-light text-3xl text-pearl-50 tracking-tight">12,500</span>
                    <span className="text-pearl-300/40 text-sm">.00</span>
                  </div>
                </div>
                <div className="flex items-center justify-center py-1">
                  <div className="w-7 h-7 rounded-full bg-pearl-100/[0.04] border border-pearl-100/[0.08] flex items-center justify-center">
                    <ArrowDown className="w-3 h-3 text-pearl-300/60" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-[0.2em] text-champagne-300/70 font-medium">You receive</label>
                  <div className="mt-1.5 flex items-baseline gap-2 p-3.5 bg-champagne-400/[0.05] border border-champagne-400/25 rounded-xl">
                    <span className="text-champagne-300/70 text-xs">≈</span>
                    <span className="font-serif font-light text-3xl text-champagne-200 tracking-tight">9,182</span>
                    <span className="text-champagne-300/60 text-sm">.45 USDT</span>
                  </div>
                </div>
              </div>

              <button className="w-full mt-5 py-3 bg-pearl-50 hover:bg-pearl-100 text-void font-medium rounded-xl transition-colors text-sm">
                Continue
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-pearl-300/50">
                Avg settlement <span className="text-pearl-50 font-mono">4 minutes</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Country list */}
        <div className="mt-28 pt-14 border-t border-pearl-100/[0.07]">
          <div className="grid lg:grid-cols-12 gap-10 mb-10">
            <div className="lg:col-span-5">
              <p className="text-[10px] uppercase tracking-[0.4em] text-champagne-300/70 mb-4">16 of 80+ markets</p>
              <h3 className="font-serif text-3xl md:text-4xl font-light tracking-tight text-pearl-50">
                Wherever you bank, we&apos;ll meet you there.
              </h3>
            </div>
            <div className="lg:col-span-7">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-pearl-100/[0.05] rounded-xl overflow-hidden border border-pearl-100/[0.05]">
                {COUNTRIES.map((c) => (
                  <div key={c.code} className="flex items-center gap-3 p-3.5 bg-void hover:bg-charcoal/40 transition-colors">
                    <Image
                      src={`https://flagcdn.com/w40/${c.code}.png`}
                      alt={c.name}
                      width={26}
                      height={18}
                      className="rounded flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-pearl-50 text-[12px] font-medium truncate leading-tight">{c.name}</div>
                      <div className="text-pearl-300/45 text-[10px] font-mono">{c.ccy}</div>
                    </div>
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
