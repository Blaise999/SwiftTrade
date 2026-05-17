// lib/etf-data.ts
//
// Curated ETF universe for the Swift Trade investing experience.
// Alpaca trades these as `us_equity`; this file is our classification
// layer (asset_type / category / metadata) on top of that.
//
// Prices here are seed/placeholder values used for first paint; the live
// quote layer overrides them when market data is available.

export type EtfCategory =
  | 'sp500'
  | 'nasdaq_100'
  | 'total_market'
  | 'dividend'
  | 'sector'
  | 'bond'
  | 'international';

export type Etf = {
  symbol: string;
  name: string;
  category: EtfCategory;
  tracks: string;
  expenseRatio: number;       // % e.g. 0.03 = 0.03%
  dividendYield?: number;     // % placeholder
  description: string;
  seedPrice: number;
  seedChangePct: number;
  fractionable: boolean;
  beginnerFriendly?: boolean;
};

export const ETFS: Etf[] = [
  // ─── S&P 500 ───
  {
    symbol: 'VOO', name: 'Vanguard S&P 500 ETF', category: 'sp500',
    tracks: 'S&P 500 Index', expenseRatio: 0.03, dividendYield: 1.31,
    description:
      'Holds the 500 large-cap U.S. companies in the S&P 500. One of the lowest-cost ways to own the broad U.S. market.',
    seedPrice: 512.34, seedChangePct: 0.42, fractionable: true, beginnerFriendly: true,
  },
  {
    symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', category: 'sp500',
    tracks: 'S&P 500 Index', expenseRatio: 0.0945, dividendYield: 1.27,
    description:
      'The oldest and most heavily traded S&P 500 ETF. Deep liquidity makes it popular for both investors and traders.',
    seedPrice: 557.81, seedChangePct: 0.39, fractionable: true, beginnerFriendly: true,
  },
  {
    symbol: 'IVV', name: 'iShares Core S&P 500 ETF', category: 'sp500',
    tracks: 'S&P 500 Index', expenseRatio: 0.03, dividendYield: 1.29,
    description:
      'BlackRock\u2019s low-cost S&P 500 fund. A core long-term holding for broad U.S. equity exposure.',
    seedPrice: 559.12, seedChangePct: 0.40, fractionable: true, beginnerFriendly: true,
  },
  {
    symbol: 'SPLG', name: 'SPDR Portfolio S&P 500 ETF', category: 'sp500',
    tracks: 'S&P 500 Index', expenseRatio: 0.02, dividendYield: 1.30,
    description:
      'The lowest-expense-ratio S&P 500 ETF here, designed for cost-conscious long-term investors.',
    seedPrice: 65.47, seedChangePct: 0.41, fractionable: true, beginnerFriendly: true,
  },

  // ─── Nasdaq 100 ───
  {
    symbol: 'QQQ', name: 'Invesco QQQ Trust', category: 'nasdaq_100',
    tracks: 'Nasdaq-100 Index', expenseRatio: 0.20, dividendYield: 0.57,
    description:
      'Tracks the 100 largest non-financial companies on the Nasdaq \u2014 heavily weighted toward technology.',
    seedPrice: 478.92, seedChangePct: 0.88, fractionable: true,
  },

  // ─── Total Market ───
  {
    symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', category: 'total_market',
    tracks: 'CRSP US Total Market Index', expenseRatio: 0.03, dividendYield: 1.32,
    description:
      'Owns essentially the entire U.S. stock market \u2014 large, mid, and small-cap \u2014 in a single fund.',
    seedPrice: 273.55, seedChangePct: 0.37, fractionable: true, beginnerFriendly: true,
  },

  // ─── Dividend ───
  {
    symbol: 'SCHD', name: 'Schwab US Dividend Equity ETF', category: 'dividend',
    tracks: 'Dow Jones U.S. Dividend 100', expenseRatio: 0.06, dividendYield: 3.48,
    description:
      'Focuses on quality U.S. companies with a track record of paying sustainable dividends.',
    seedPrice: 27.84, seedChangePct: -0.18, fractionable: true,
  },
  {
    symbol: 'VYM', name: 'Vanguard High Dividend Yield ETF', category: 'dividend',
    tracks: 'FTSE High Dividend Yield Index', expenseRatio: 0.06, dividendYield: 2.78,
    description:
      'Holds U.S. companies with above-average dividend yields, weighted by market cap.',
    seedPrice: 128.41, seedChangePct: 0.12, fractionable: true,
  },

  // ─── Sector / Tech ───
  {
    symbol: 'XLK', name: 'Technology Select Sector SPDR Fund', category: 'sector',
    tracks: 'Technology Select Sector Index', expenseRatio: 0.09, dividendYield: 0.61,
    description:
      'Concentrated exposure to the technology companies within the S&P 500.',
    seedPrice: 232.07, seedChangePct: 1.04, fractionable: true,
  },
  {
    symbol: 'VGT', name: 'Vanguard Information Technology ETF', category: 'sector',
    tracks: 'MSCI US IMI Information Technology', expenseRatio: 0.10, dividendYield: 0.60,
    description:
      'Broad U.S. information-technology sector exposure across large, mid, and small caps.',
    seedPrice: 601.88, seedChangePct: 0.95, fractionable: true,
  },

  // ─── Bond ───
  {
    symbol: 'BND', name: 'Vanguard Total Bond Market ETF', category: 'bond',
    tracks: 'Bloomberg U.S. Aggregate Bond Index', expenseRatio: 0.03, dividendYield: 3.92,
    description:
      'Broad exposure to U.S. investment-grade bonds \u2014 often used to balance equity risk.',
    seedPrice: 73.22, seedChangePct: -0.05, fractionable: true, beginnerFriendly: true,
  },
];

export const SP500_SYMBOLS = ['VOO', 'SPY', 'IVV', 'SPLG'];

export const CATEGORY_LABELS: Record<EtfCategory, string> = {
  sp500: 'S&P 500 ETFs',
  nasdaq_100: 'Nasdaq 100 ETFs',
  total_market: 'Total Market ETFs',
  dividend: 'Dividend ETFs',
  sector: 'Tech ETFs',
  bond: 'Bond ETFs',
  international: 'International ETFs',
};

export function getSP500Etfs(): Etf[] {
  return ETFS.filter(e => SP500_SYMBOLS.includes(e.symbol));
}

export function getEtfsByCategory(cat: EtfCategory): Etf[] {
  return ETFS.filter(e => e.category === cat);
}

export function getEtf(symbol: string): Etf | undefined {
  return ETFS.find(e => e.symbol.toUpperCase() === symbol.toUpperCase());
}

export function getBeginnerEtfs(): Etf[] {
  return ETFS.filter(e => e.beginnerFriendly);
}
