'use client';

import Link from 'next/link';
import { Twitter, Send, Github, Linkedin } from 'lucide-react';

const COLS = [
  {
    title: 'Markets',
    links: [
      { name: 'Digital assets',   href: '/dashboard/trade/crypto' },
      { name: 'Foreign exchange', href: '/dashboard/trade/fx'     },
      { name: 'Equities',         href: '/dashboard/trade/stocks' },
      { name: 'Tier programs',    href: '/dashboard/tier'         },
    ],
  },
  {
    title: 'Platform',
    links: [
      { name: 'SwiftBridge',     href: '/dashboard/bridge'         },
      { name: 'Wallet',          href: '/dashboard/wallet'         },
      { name: 'Self-custody',    href: '/dashboard/connect-wallet' },
      { name: 'API access',      href: '/docs/api'                 },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'About',     href: '/about'   },
      { name: 'Careers',   href: '/careers' },
      { name: 'Press kit', href: '/press'   },
      { name: 'Contact',   href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { name: 'Terms of service', href: '/legal/terms'   },
      { name: 'Privacy notice',   href: '/legal/privacy' },
      { name: 'AML policy',       href: '/legal/aml'     },
      { name: 'Risk disclosure',  href: '/legal/risk'    },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative bg-void border-t border-pearl-100/[0.04]">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-20">
        <div className="grid lg:grid-cols-12 gap-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-sapphire-400 to-sapphire-700 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-pearl-50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 17l6-6 4 4 8-8" />
                  <path d="M14 7h7v7" />
                </svg>
              </div>
              <div>
                <div className="font-serif font-medium text-pearl-50 text-lg tracking-tight">Swift Trade</div>
                <div className="text-[9px] text-pearl-300/60 tracking-[0.25em] uppercase mt-0.5">Hong Kong · Est. 2018</div>
              </div>
            </Link>

            <p className="mt-6 text-[14px] text-pearl-200/55 max-w-sm leading-relaxed">
              The private bank for global traders. Crypto, foreign exchange,
              equities — and a concierge desk to bridge any currency.
            </p>

            <div className="mt-7">
              <div className="text-[10px] uppercase tracking-[0.3em] text-pearl-300/40 mb-2">Address</div>
              <div className="text-pearl-200/70 text-sm leading-relaxed">
                Two IFC, 8 Finance Street<br/>
                Central, Hong Kong SAR
              </div>
            </div>

            <div className="mt-7 flex items-center gap-2">
              {[
                { icon: Twitter,  href: 'https://twitter.com/swifttrade' },
                { icon: Send,     href: 'https://t.me/swifttrade'        },
                { icon: Linkedin, href: 'https://linkedin.com/company/swifttrade' },
                { icon: Github,   href: 'https://github.com/swifttrade'  },
              ].map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full border border-pearl-100/10 hover:border-pearl-100/30 flex items-center justify-center text-pearl-300/60 hover:text-pearl-50 transition-colors"
                >
                  <s.icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {COLS.map((c) => (
              <div key={c.title}>
                <h4 className="text-[10px] uppercase tracking-[0.3em] text-pearl-300/50 mb-4 font-medium">{c.title}</h4>
                <ul className="space-y-3">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-sm text-pearl-200/65 hover:text-pearl-50 transition-colors">
                        {l.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance row */}
        <div className="mt-16 pt-8 border-t border-pearl-100/[0.05]">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-7">
            {['SFC Type 1', 'SFC Type 4', 'SFC Type 9', 'ISO 27001', 'SOC 2 Type II', 'PCI-DSS L1', 'GDPR', 'CCPA'].map(b => (
              <span key={b} className="text-[10px] uppercase tracking-wider text-pearl-300/45 px-3 py-1 rounded-full border border-pearl-100/10">
                {b}
              </span>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-pearl-300/40">
            <p>© {new Date().getFullYear()} Swift Trade Holdings Ltd. All rights reserved.</p>
            <p className="text-center md:text-right max-w-xl">
              Trading involves risk. Past performance is not indicative of future results. Read our risk disclosure before opening a position.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
