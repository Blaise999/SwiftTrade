'use client';

const TICKER = [
  { s: 'BTC',     p: '67,420.32',  c: '+2.42%', up: true  },
  { s: 'ETH',     p: '3,512.18',   c: '+1.84%', up: true  },
  { s: 'SOL',     p: '142.07',     c: '-0.91%', up: false },
  { s: 'BNB',     p: '598.21',     c: '+1.07%', up: true  },
  { s: 'EUR/USD', p: '1.0832',     c: '+0.12%', up: true  },
  { s: 'GBP/USD', p: '1.2641',     c: '-0.08%', up: false },
  { s: 'USD/JPY', p: '154.21',     c: '+0.34%', up: true  },
  { s: 'USD/HKD', p: '7.8108',     c: '+0.02%', up: true  },
  { s: 'USD/CNY', p: '7.2418',     c: '-0.04%', up: false },
  { s: 'AAPL',    p: '189.45',     c: '+1.13%', up: true  },
  { s: 'TSLA',    p: '237.16',     c: '-2.07%', up: false },
  { s: 'NVDA',    p: '892.34',     c: '+3.41%', up: true  },
  { s: 'MSFT',    p: '421.55',     c: '+0.62%', up: true  },
  { s: '^HSI',    p: '20,124.6',   c: '+0.85%', up: true  },
  { s: 'XAU/USD', p: '2,328.10',   c: '+0.45%', up: true  },
];

export default function TickerBar() {
  const all = [...TICKER, ...TICKER, ...TICKER];
  return (
    <div className="bg-void border-b border-pearl-100/[0.04] overflow-hidden relative">
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-void to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-void to-transparent z-10" />
      <div className="flex animate-ticker py-2.5 whitespace-nowrap">
        {all.map((t, i) => (
          <div key={i} className="flex items-center gap-2.5 px-7 text-[11px]">
            <span className="text-pearl-300/50 tracking-wide">{t.s}</span>
            <span className="text-pearl-50 font-mono">{t.p}</span>
            <span className={`font-mono ${t.up ? 'text-profit' : 'text-loss'}`}>{t.c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
