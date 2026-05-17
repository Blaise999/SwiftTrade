'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

type Row = { symbol: string; name: string; price: string; change: string; up: boolean; logo?: string; volume?: string };

const CRYPTO: Row[] = [
  { symbol: 'BTC',   name: 'Bitcoin',   price: '67,420.32', change: '+2.42%', up: true,  volume: '$28.4B', logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' },
  { symbol: 'ETH',   name: 'Ethereum',  price: '3,512.18',  change: '+1.84%', up: true,  volume: '$14.2B', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { symbol: 'SOL',   name: 'Solana',    price: '142.07',    change: '-0.91%', up: false, volume: '$3.8B',  logo: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  { symbol: 'BNB',   name: 'BNB',       price: '598.21',    change: '+1.07%', up: true,  volume: '$1.7B',  logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  { symbol: 'XRP',   name: 'XRP',       price: '0.6241',    change: '+0.84%', up: true,  volume: '$1.4B',  logo: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  { symbol: 'ADA',   name: 'Cardano',   price: '0.5128',    change: '-1.42%', up: false, volume: '$640M',  logo: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
];

const FOREX: Row[] = [
  { symbol: 'EUR/USD', name: 'Euro · US Dollar',        price: '1.0832',   change: '+0.12%', up: true,  volume: '$6.7T' },
  { symbol: 'GBP/USD', name: 'Pound · US Dollar',       price: '1.2641',   change: '-0.08%', up: false, volume: '$1.1T' },
  { symbol: 'USD/JPY', name: 'US Dollar · Yen',         price: '154.21',   change: '+0.34%', up: true,  volume: '$1.0T' },
  { symbol: 'USD/HKD', name: 'US Dollar · HK Dollar',   price: '7.8108',   change: '+0.02%', up: true,  volume: '$420B' },
  { symbol: 'USD/CNY', name: 'US Dollar · Yuan',        price: '7.2418',   change: '-0.04%', up: false, volume: '$310B' },
  { symbol: 'XAU/USD', name: 'Gold · US Dollar',        price: '2,328.10', change: '+0.45%', up: true,  volume: '$180B' },
];

const STOCKS: Row[] = [
  { symbol: 'AAPL',  name: 'Apple Inc.',         price: '189.45', change: '+1.13%', up: true,  volume: '$8.2B',  logo: 'https://logo.clearbit.com/apple.com' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',         price: '237.16', change: '-2.07%', up: false, volume: '$14.6B', logo: 'https://logo.clearbit.com/tesla.com' },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',       price: '892.34', change: '+3.41%', up: true,  volume: '$22.1B', logo: 'https://logo.clearbit.com/nvidia.com' },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',    price: '421.55', change: '+0.62%', up: true,  volume: '$5.4B',  logo: 'https://logo.clearbit.com/microsoft.com' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',    price: '178.92', change: '+0.81%', up: true,  volume: '$6.8B',  logo: 'https://logo.clearbit.com/amazon.com' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',      price: '162.84', change: '+0.94%', up: true,  volume: '$4.2B',  logo: 'https://logo.clearbit.com/google.com' },
];

const TABS = [
  { id: 'crypto', name: 'Digital assets', rows: CRYPTO, count: '350+ pairs'   },
  { id: 'forex',  name: 'Foreign exchange', rows: FOREX,  count: '60+ pairs'  },
  { id: 'stocks', name: 'Equities', rows: STOCKS, count: '5,000+ symbols'     },
];

export default function MarketPreview() {
  const [active, setActive] = useState('crypto');
  const tab = TABS.find(t => t.id === active)!;
  return (
    <section id="markets" className="relative py-28 bg-void overflow-hidden">
      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-x-10 mb-12">
          <div className="lg:col-span-7">
            <p className="text-[10px] uppercase tracking-[0.4em] text-champagne-300/70 mb-5">Markets</p>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-pearl-50 leading-[1.05]">
              Three asset classes.<br/>
              <em className="italic font-medium text-champagne-300/95">One</em> custody account.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pt-3 flex items-end">
            <p className="text-pearl-200/70 leading-relaxed text-base lg:text-lg max-w-md">
              Trade Bitcoin alongside Apple, the Yen alongside Solana — without
              a treasury operation behind you. We built it for the rest of us.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-pearl-100/[0.07] mb-10">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                active === t.id ? 'text-pearl-50' : 'text-pearl-300/60 hover:text-pearl-100'
              }`}
            >
              <span className="relative z-10">{t.name}</span>
              <span className={`relative z-10 ml-2 text-[10px] tracking-wide ${active === t.id ? 'text-pearl-300/70' : 'text-pearl-300/40'}`}>
                {t.count}
              </span>
              {active === t.id && (
                <motion.span
                  layoutId="markets-underline"
                  className="absolute -bottom-px left-0 right-0 h-px bg-champagne-400"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="border border-pearl-100/[0.06] rounded-2xl overflow-hidden bg-charcoal/30 backdrop-blur-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              {tab.rows.map((r, i) => (
                <Link
                  key={r.symbol}
                  href={`/dashboard/trade/${tab.id}`}
                  className={`grid grid-cols-12 px-6 py-5 hover:bg-pearl-50/[0.02] transition-colors group ${
                    i !== tab.rows.length - 1 ? 'border-b border-pearl-100/[0.04]' : ''
                  }`}
                >
                  <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
                    {r.logo ? (
                      <div className="relative w-9 h-9 rounded-full bg-pearl-50/[0.04] border border-pearl-100/[0.06] overflow-hidden flex-shrink-0">
                        <Image src={r.logo} alt={r.symbol} fill className="object-contain p-1.5" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sapphire-400/40 to-sapphire-700/40 border border-pearl-100/[0.06] flex items-center justify-center text-[10px] font-mono text-pearl-100 flex-shrink-0">
                        {r.symbol.split('/')[0].slice(0,3)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-pearl-50 truncate">{r.symbol}</div>
                      <div className="text-xs text-pearl-300/50 truncate">{r.name}</div>
                    </div>
                  </div>
                  <div className="col-span-3 text-right font-mono text-pearl-50 self-center text-sm">
                    ${r.price}
                  </div>
                  <div className={`col-span-2 text-right font-mono self-center text-sm ${r.up ? 'text-profit' : 'text-loss'}`}>
                    {r.change}
                  </div>
                  <div className="hidden sm:block sm:col-span-2 text-right text-pearl-300/45 self-center text-sm font-mono">
                    {r.volume}
                  </div>
                  <div className="col-span-2 sm:col-span-1 text-right self-center">
                    <ArrowUpRight className="w-4 h-4 text-pearl-300/40 group-hover:text-champagne-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all inline" />
                  </div>
                </Link>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 text-center text-xs text-pearl-300/40">
          Demonstration prices · open an account to see real-time markets
        </div>
      </div>
    </section>
  );
}
