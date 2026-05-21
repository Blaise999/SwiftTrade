// lib/stocks-data.ts
//
// Curated single-stock universe for the Swift Trade investing experience.
// Trade-able via Alpaca as us_equity. Mirrors the Etf type so the UI can
// render stocks and ETFs uniformly.
//
// Prices are seed/placeholder for first paint; live quote layer overrides.

export type StockCategory =
  | 'tech'
  | 'consumer'
  | 'financial'
  | 'healthcare'
  | 'industrial'
  | 'energy'
  | 'communication'
  | 'auto';

export type Stock = {
  symbol: string;
  name: string;
  category: StockCategory;
  sector: string;
  description: string;
  seedPrice: number;
  seedChangePct: number;
  fractionable: boolean;
  popular?: boolean;
};

export const STOCKS: Stock[] = [
  // ─── Mega-cap Tech ───
  { symbol: 'AAPL',  name: 'Apple Inc.',                     category: 'tech',         sector: 'Technology',          description: 'Designs and manufactures consumer electronics, software, and online services.', seedPrice: 189.45, seedChangePct: 1.13, fractionable: true, popular: true },
  { symbol: 'MSFT',  name: 'Microsoft Corporation',          category: 'tech',         sector: 'Technology',          description: 'Develops Windows, Office, Azure cloud, and a broad portfolio of enterprise software.', seedPrice: 421.32, seedChangePct: 0.74, fractionable: true, popular: true },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)',        category: 'communication',sector: 'Communication Services', description: 'Parent of Google. Search, YouTube, Cloud, Android.', seedPrice: 172.58, seedChangePct: 0.92, fractionable: true, popular: true },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',                category: 'consumer',     sector: 'Consumer Discretionary', description: 'E-commerce, AWS cloud, Prime, advertising and devices.', seedPrice: 184.71, seedChangePct: 1.45, fractionable: true, popular: true },
  { symbol: 'META',  name: 'Meta Platforms Inc.',            category: 'communication',sector: 'Communication Services', description: 'Operates Facebook, Instagram, WhatsApp, and Reality Labs.', seedPrice: 502.18, seedChangePct: 1.88, fractionable: true, popular: true },
  { symbol: 'NVDA',  name: 'NVIDIA Corporation',             category: 'tech',         sector: 'Technology',          description: 'Designs GPUs and AI accelerators powering most modern AI workloads.', seedPrice: 943.21, seedChangePct: 2.87, fractionable: true, popular: true },
  { symbol: 'TSLA',  name: 'Tesla, Inc.',                    category: 'auto',         sector: 'Consumer Discretionary', description: 'Electric vehicles, energy storage, and autonomy software.', seedPrice: 242.65, seedChangePct: -1.21, fractionable: true, popular: true },
  { symbol: 'AVGO',  name: 'Broadcom Inc.',                  category: 'tech',         sector: 'Technology',          description: 'Semiconductors and infrastructure software for data centres.', seedPrice: 1612.40, seedChangePct: 1.32, fractionable: true },
  { symbol: 'ORCL',  name: 'Oracle Corporation',             category: 'tech',         sector: 'Technology',          description: 'Enterprise database, cloud infrastructure, and SaaS.', seedPrice: 138.74, seedChangePct: 0.51, fractionable: true },
  { symbol: 'CRM',   name: 'Salesforce, Inc.',               category: 'tech',         sector: 'Technology',          description: 'Customer-relationship management and enterprise cloud.', seedPrice: 271.86, seedChangePct: 0.43, fractionable: true },
  { symbol: 'AMD',   name: 'Advanced Micro Devices, Inc.',   category: 'tech',         sector: 'Technology',          description: 'CPUs and GPUs for client, server, and embedded markets.', seedPrice: 162.04, seedChangePct: 2.21, fractionable: true, popular: true },
  { symbol: 'INTC',  name: 'Intel Corporation',              category: 'tech',         sector: 'Technology',          description: 'Designs and manufactures CPUs and chip-fabrication services.', seedPrice: 31.45, seedChangePct: -0.62, fractionable: true },
  { symbol: 'ADBE',  name: 'Adobe Inc.',                     category: 'tech',         sector: 'Technology',          description: 'Creative Cloud (Photoshop, Premiere) and digital experience platforms.', seedPrice: 487.31, seedChangePct: 0.31, fractionable: true },

  // ─── Consumer ───
  { symbol: 'COST',  name: 'Costco Wholesale Corporation',   category: 'consumer',     sector: 'Consumer Staples',    description: 'Membership-only warehouse retailer with consistent same-store growth.', seedPrice: 884.50, seedChangePct: 0.62, fractionable: true },
  { symbol: 'WMT',   name: 'Walmart Inc.',                   category: 'consumer',     sector: 'Consumer Staples',    description: 'Largest US retailer; e-commerce and grocery scale leader.', seedPrice: 72.18, seedChangePct: 0.41, fractionable: true },
  { symbol: 'HD',    name: 'The Home Depot, Inc.',           category: 'consumer',     sector: 'Consumer Discretionary', description: 'Largest US home-improvement retailer.', seedPrice: 351.92, seedChangePct: 0.28, fractionable: true },
  { symbol: 'NKE',   name: 'NIKE, Inc.',                     category: 'consumer',     sector: 'Consumer Discretionary', description: 'Global athletic footwear, apparel and equipment brand.', seedPrice: 73.50, seedChangePct: -0.84, fractionable: true },
  { symbol: 'MCD',   name: 'McDonald\u2019s Corporation',    category: 'consumer',     sector: 'Consumer Discretionary', description: 'Largest fast-food franchise; global brand with steady dividend.', seedPrice: 291.18, seedChangePct: 0.22, fractionable: true },
  { symbol: 'SBUX',  name: 'Starbucks Corporation',          category: 'consumer',     sector: 'Consumer Discretionary', description: 'Global premium-coffee retailer.', seedPrice: 92.31, seedChangePct: -0.45, fractionable: true },
  { symbol: 'KO',    name: 'The Coca-Cola Company',          category: 'consumer',     sector: 'Consumer Staples',    description: 'Global beverages with high brand strength and dividend record.', seedPrice: 68.92, seedChangePct: 0.18, fractionable: true },
  { symbol: 'PEP',   name: 'PepsiCo, Inc.',                  category: 'consumer',     sector: 'Consumer Staples',    description: 'Beverages and snack foods (Frito-Lay, Quaker, Pepsi).', seedPrice: 165.43, seedChangePct: 0.34, fractionable: true },

  // ─── Communication / Streaming ───
  { symbol: 'NFLX',  name: 'Netflix, Inc.',                  category: 'communication',sector: 'Communication Services', description: 'Subscription streaming and content production.', seedPrice: 678.41, seedChangePct: 1.62, fractionable: true, popular: true },
  { symbol: 'DIS',   name: 'The Walt Disney Company',        category: 'communication',sector: 'Communication Services', description: 'Media networks, studios, parks and direct-to-consumer streaming.', seedPrice: 101.74, seedChangePct: -0.32, fractionable: true },

  // ─── Financials ───
  { symbol: 'JPM',   name: 'JPMorgan Chase & Co.',           category: 'financial',    sector: 'Financials',          description: 'Largest US bank by assets; investment and consumer banking.', seedPrice: 217.83, seedChangePct: 0.71, fractionable: true, popular: true },
  { symbol: 'BAC',   name: 'Bank of America Corporation',    category: 'financial',    sector: 'Financials',          description: 'Diversified banking and wealth management.', seedPrice: 43.17, seedChangePct: 0.92, fractionable: true },
  { symbol: 'WFC',   name: 'Wells Fargo & Company',          category: 'financial',    sector: 'Financials',          description: 'Consumer and commercial banking, mortgage and wealth management.', seedPrice: 64.28, seedChangePct: 0.45, fractionable: true },
  { symbol: 'GS',    name: 'The Goldman Sachs Group, Inc.',  category: 'financial',    sector: 'Financials',          description: 'Investment banking, trading, and asset management.', seedPrice: 511.92, seedChangePct: 0.83, fractionable: true },
  { symbol: 'V',     name: 'Visa Inc.',                      category: 'financial',    sector: 'Financials',          description: 'Global payments network.', seedPrice: 282.74, seedChangePct: 0.31, fractionable: true, popular: true },
  { symbol: 'MA',    name: 'Mastercard Incorporated',        category: 'financial',    sector: 'Financials',          description: 'Global payments processing network.', seedPrice: 478.13, seedChangePct: 0.40, fractionable: true },
  { symbol: 'PYPL',  name: 'PayPal Holdings, Inc.',          category: 'financial',    sector: 'Financials',          description: 'Digital payments and money-transfer platform.', seedPrice: 78.49, seedChangePct: -0.55, fractionable: true },

  // ─── Healthcare ───
  { symbol: 'UNH',   name: 'UnitedHealth Group Incorporated',category: 'healthcare',   sector: 'Healthcare',          description: 'Largest US health-insurance group.', seedPrice: 562.18, seedChangePct: 0.31, fractionable: true },
  { symbol: 'JNJ',   name: 'Johnson & Johnson',              category: 'healthcare',   sector: 'Healthcare',          description: 'Pharmaceutical and medical-device giant; Dividend Aristocrat.', seedPrice: 161.74, seedChangePct: 0.12, fractionable: true },
  { symbol: 'LLY',   name: 'Eli Lilly and Company',          category: 'healthcare',   sector: 'Healthcare',          description: 'Pharmaceuticals (diabetes/obesity GLP-1 leadership).', seedPrice: 814.50, seedChangePct: 1.42, fractionable: true },
  { symbol: 'PFE',   name: 'Pfizer Inc.',                    category: 'healthcare',   sector: 'Healthcare',          description: 'Global biopharmaceutical company.', seedPrice: 28.31, seedChangePct: -0.18, fractionable: true },
  { symbol: 'ABBV',  name: 'AbbVie Inc.',                    category: 'healthcare',   sector: 'Healthcare',          description: 'Research-based biopharmaceuticals; immunology and oncology.', seedPrice: 188.42, seedChangePct: 0.34, fractionable: true },

  // ─── Industrial / Energy ───
  { symbol: 'BA',    name: 'The Boeing Company',             category: 'industrial',   sector: 'Industrials',         description: 'Commercial aircraft, defence and space systems.', seedPrice: 178.62, seedChangePct: -1.05, fractionable: true },
  { symbol: 'CAT',   name: 'Caterpillar Inc.',               category: 'industrial',   sector: 'Industrials',         description: 'Construction and mining equipment leader.', seedPrice: 374.21, seedChangePct: 0.62, fractionable: true },
  { symbol: 'GE',    name: 'GE Aerospace',                   category: 'industrial',   sector: 'Industrials',         description: 'Aircraft engines and related aerospace services.', seedPrice: 189.45, seedChangePct: 0.91, fractionable: true },
  { symbol: 'XOM',   name: 'Exxon Mobil Corporation',        category: 'energy',       sector: 'Energy',              description: 'Integrated oil and gas major.', seedPrice: 117.83, seedChangePct: -0.42, fractionable: true },
  { symbol: 'CVX',   name: 'Chevron Corporation',            category: 'energy',       sector: 'Energy',              description: 'Integrated oil and gas major; consistent dividend.', seedPrice: 152.74, seedChangePct: -0.34, fractionable: true },
];

export const STOCK_CATEGORY_LABELS: Record<StockCategory, string> = {
  tech: 'Technology',
  consumer: 'Consumer',
  financial: 'Financials',
  healthcare: 'Healthcare',
  industrial: 'Industrials',
  energy: 'Energy',
  communication: 'Communication',
  auto: 'Auto & EVs',
};

export function getStock(symbol: string): Stock | undefined {
  return STOCKS.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());
}

export function getPopularStocks(): Stock[] {
  return STOCKS.filter(s => s.popular);
}

export function getStocksByCategory(cat: StockCategory): Stock[] {
  return STOCKS.filter(s => s.category === cat);
}
