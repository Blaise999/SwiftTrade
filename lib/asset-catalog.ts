// lib/asset-catalog.ts
//
// Unified investing universe: ETFs (already supported) + individual
// stocks (AAPL, NVDA, TSLA, etc.). Stocks live alongside ETFs so the
// /dashboard/invest experience can show both in one place.
//
// Seed prices are approximate reference values used for first paint
// and demo P&L math. A live quote feed (Alpaca/Finnhub) overrides them
// in production.

export type AssetType = 'stock' | 'etf';

export type AssetCategory =
  // ETF categories
  | 'sp500' | 'nasdaq_100' | 'total_market' | 'dividend' | 'sector' | 'bond' | 'international'
  // Stock sectors
  | 'technology' | 'consumer' | 'financial' | 'healthcare' | 'energy'
  | 'communication' | 'industrial' | 'automotive' | 'semiconductor' | 'ecommerce'
  | 'social_media' | 'streaming' | 'fintech' | 'crypto_stock';

export type Asset = {
  symbol: string;
  name: string;
  assetType: AssetType;
  category: AssetCategory;
  description: string;
  seedPrice: number;
  seedChangePct: number;
  fractionable: boolean;
  // ETF-only
  tracks?: string;
  expenseRatio?: number;
  dividendYield?: number;
  beginnerFriendly?: boolean;
  // Stock-only
  sector?: string;
  marketCapBillions?: number;
};

// ──────────────────────────────────────────────────────────────────────
// ETFs (carried over from etf-data.ts)
// ──────────────────────────────────────────────────────────────────────
export const ETFS: Asset[] = [
  { symbol:'VOO',  name:'Vanguard S&P 500 ETF',            assetType:'etf', category:'sp500',        tracks:'S&P 500 Index',           expenseRatio:0.03,   dividendYield:1.31, seedPrice:512.34, seedChangePct: 0.42, fractionable:true, beginnerFriendly:true,  description:'Holds the 500 large-cap U.S. companies in the S&P 500. One of the lowest-cost ways to own the broad U.S. market.' },
  { symbol:'SPY',  name:'SPDR S&P 500 ETF Trust',          assetType:'etf', category:'sp500',        tracks:'S&P 500 Index',           expenseRatio:0.0945, dividendYield:1.27, seedPrice:557.81, seedChangePct: 0.39, fractionable:true, beginnerFriendly:true,  description:'The oldest and most heavily traded S&P 500 ETF. Deep liquidity for both investors and traders.' },
  { symbol:'IVV',  name:'iShares Core S&P 500 ETF',        assetType:'etf', category:'sp500',        tracks:'S&P 500 Index',           expenseRatio:0.03,   dividendYield:1.29, seedPrice:559.12, seedChangePct: 0.40, fractionable:true, beginnerFriendly:true,  description:'BlackRock low-cost S&P 500 fund. A core long-term holding for broad U.S. equity exposure.' },
  { symbol:'SPLG', name:'SPDR Portfolio S&P 500 ETF',      assetType:'etf', category:'sp500',        tracks:'S&P 500 Index',           expenseRatio:0.02,   dividendYield:1.30, seedPrice:65.47,  seedChangePct: 0.41, fractionable:true, beginnerFriendly:true,  description:'The lowest-expense S&P 500 ETF here, designed for cost-conscious long-term investors.' },
  { symbol:'QQQ',  name:'Invesco QQQ Trust',               assetType:'etf', category:'nasdaq_100',   tracks:'Nasdaq-100 Index',        expenseRatio:0.20,   dividendYield:0.57, seedPrice:478.92, seedChangePct: 0.88, fractionable:true,                          description:'Tracks the 100 largest non-financial companies on the Nasdaq — heavily weighted toward technology.' },
  { symbol:'VTI',  name:'Vanguard Total Stock Market ETF', assetType:'etf', category:'total_market', tracks:'CRSP US Total Market',    expenseRatio:0.03,   dividendYield:1.32, seedPrice:273.55, seedChangePct: 0.37, fractionable:true, beginnerFriendly:true,  description:'Owns essentially the entire U.S. stock market — large, mid, and small-cap — in a single fund.' },
  { symbol:'SCHD', name:'Schwab US Dividend Equity ETF',   assetType:'etf', category:'dividend',     tracks:'DJ U.S. Dividend 100',    expenseRatio:0.06,   dividendYield:3.48, seedPrice:27.84,  seedChangePct:-0.18, fractionable:true,                          description:'Focuses on quality U.S. companies with a track record of paying sustainable dividends.' },
  { symbol:'VYM',  name:'Vanguard High Dividend Yield ETF',assetType:'etf', category:'dividend',     tracks:'FTSE High Dividend Yield',expenseRatio:0.06,   dividendYield:2.78, seedPrice:128.41, seedChangePct: 0.12, fractionable:true,                          description:'Holds U.S. companies with above-average dividend yields, weighted by market cap.' },
  { symbol:'XLK',  name:'Technology Select Sector SPDR',   assetType:'etf', category:'sector',       tracks:'Technology Select Sector',expenseRatio:0.09,   dividendYield:0.61, seedPrice:232.07, seedChangePct: 1.04, fractionable:true,                          description:'Concentrated exposure to the technology companies within the S&P 500.' },
  { symbol:'VGT',  name:'Vanguard Information Tech ETF',   assetType:'etf', category:'sector',       tracks:'MSCI US IMI IT',          expenseRatio:0.10,   dividendYield:0.60, seedPrice:601.88, seedChangePct: 0.95, fractionable:true,                          description:'Broad U.S. information-technology sector exposure across large, mid, and small caps.' },
  { symbol:'BND',  name:'Vanguard Total Bond Market ETF',  assetType:'etf', category:'bond',         tracks:'Bloomberg U.S. Aggregate', expenseRatio:0.03,   dividendYield:3.92, seedPrice:73.22,  seedChangePct:-0.05, fractionable:true, beginnerFriendly:true,  description:'Broad exposure to U.S. investment-grade bonds — often used to balance equity risk.' },
];

// ──────────────────────────────────────────────────────────────────────
// INDIVIDUAL STOCKS (sectors curated; prices approximate)
// ──────────────────────────────────────────────────────────────────────
const stock = (
  symbol: string, name: string, sector: string, category: AssetCategory,
  seedPrice: number, seedChangePct: number, marketCapBillions: number,
  description: string,
): Asset => ({
  symbol, name, assetType: 'stock', category, sector, seedPrice, seedChangePct,
  marketCapBillions, fractionable: true, description,
});

export const STOCKS: Asset[] = [
  // ── Mega-cap technology ──
  stock('AAPL',  'Apple Inc.',                  'Technology',    'technology',    189.45,  1.13, 2880, 'Designs and sells iPhone, Mac, iPad, Apple Watch and services. The most valuable consumer tech company in the world.'),
  stock('MSFT',  'Microsoft Corporation',       'Technology',    'technology',    418.74,  0.62, 3110, 'Cloud (Azure), productivity (Office 365), Windows, and AI infrastructure leader.'),
  stock('GOOGL', 'Alphabet Inc. (Class A)',     'Communication', 'communication', 174.39,  0.84, 2150, 'Parent of Google Search, YouTube, Android, and Google Cloud.'),
  stock('AMZN',  'Amazon.com Inc.',             'Consumer',      'ecommerce',     185.92,  1.27, 1940, 'E-commerce, AWS cloud, Prime Video, advertising, and logistics.'),
  stock('META',  'Meta Platforms Inc.',         'Communication', 'social_media',  502.13,  0.74, 1280, 'Facebook, Instagram, WhatsApp, and the Reality Labs/AI division.'),
  stock('NVDA',  'NVIDIA Corporation',          'Technology',    'semiconductor', 943.21,  2.87, 2320, 'GPU and AI-accelerator leader powering most of the generative-AI build-out.'),
  stock('TSLA',  'Tesla Inc.',                  'Automotive',    'automotive',    248.50, -1.43,  790, 'Electric vehicles, energy storage, and full-self-driving software development.'),

  // ── Other large-cap tech ──
  stock('AMD',   'Advanced Micro Devices',      'Semiconductor', 'semiconductor', 162.84,  1.94,  263, 'Major CPU and GPU manufacturer competing with Intel and NVIDIA.'),
  stock('AVGO',  'Broadcom Inc.',               'Semiconductor', 'semiconductor', 174.50,  0.81,  812, 'Networking, broadband, wireless, and infrastructure software (VMware).'),
  stock('INTC',  'Intel Corporation',           'Semiconductor', 'semiconductor',  22.45, -0.67,   97, 'CPU and chip foundry company; pivoting to advanced process leadership.'),
  stock('CRM',   'Salesforce Inc.',             'Technology',    'technology',    312.65,  0.42,  300, 'CRM software leader with a major data-cloud and AI agent platform.'),
  stock('ORCL',  'Oracle Corporation',          'Technology',    'technology',    176.20,  1.18,  486, 'Enterprise database and a fast-growing cloud infrastructure provider.'),
  stock('ADBE',  'Adobe Inc.',                  'Technology',    'technology',    525.18, -0.31,  234, 'Creative software (Photoshop, Premiere), Acrobat, and Experience Cloud.'),
  stock('CSCO',  'Cisco Systems',               'Technology',    'technology',     48.92,  0.21,  198, 'Networking hardware, software, security, and observability (Splunk).'),
  stock('IBM',   'IBM Corporation',             'Technology',    'technology',    212.40,  0.55,  195, 'Hybrid cloud (Red Hat), consulting, and enterprise AI (watsonx).'),
  stock('NOW',   'ServiceNow Inc.',             'Technology',    'technology',    885.30,  1.42,  182, 'IT service management and workflow automation for large enterprises.'),
  stock('NFLX',  'Netflix Inc.',                'Communication', 'streaming',     687.42,  0.93,  295, 'Subscription streaming, gaming, and ad-tier expansion.'),

  // ── Consumer & retail ──
  stock('WMT',   'Walmart Inc.',                'Consumer',      'consumer',       68.15,  0.34,  548, 'Largest U.S. retailer with growing e-commerce, advertising, and Walmart+.'),
  stock('COST',  'Costco Wholesale',            'Consumer',      'consumer',      872.30,  0.71,  386, 'Membership warehouse retailer known for steady comp-store growth.'),
  stock('HD',    'The Home Depot',              'Consumer',      'consumer',      385.42, -0.22,  381, 'Largest U.S. home-improvement retailer.'),
  stock('NKE',   'Nike Inc.',                   'Consumer',      'consumer',       77.85, -0.48,  117, 'Global athletic footwear and apparel brand.'),
  stock('MCD',   'McDonald\u2019s Corp.',       'Consumer',      'consumer',      284.10,  0.18,  204, 'World\u2019s largest restaurant chain by revenue.'),
  stock('SBUX',  'Starbucks Corporation',       'Consumer',      'consumer',       96.78,  0.66,  110, 'Global coffeehouse chain.'),
  stock('KO',    'The Coca-Cola Company',       'Consumer',      'consumer',       72.41,  0.12,  312, 'Worlds largest non-alcoholic beverage company.'),
  stock('PEP',   'PepsiCo Inc.',                'Consumer',      'consumer',      168.90,  0.08,  232, 'Snacks (Frito-Lay), beverages, and Quaker Foods.'),
  stock('DIS',   'The Walt Disney Co.',         'Communication', 'streaming',      96.20,  0.41,  175, 'Streaming (Disney+), Parks, Studios, ESPN, and ABC.'),

  // ── Financial / fintech ──
  stock('JPM',   'JPMorgan Chase & Co.',        'Financial',     'financial',     209.30,  0.52,  601, 'Largest U.S. bank by assets — investment banking, consumer, and asset management.'),
  stock('BAC',   'Bank of America',             'Financial',     'financial',      43.18,  0.41,  338, 'Second-largest U.S. bank.'),
  stock('V',     'Visa Inc.',                   'Financial',     'fintech',       278.45,  0.31,  570, 'Worldwide payment-network operator.'),
  stock('MA',    'Mastercard Inc.',             'Financial',     'fintech',       468.30,  0.27,  434, 'Global payment-network operator alongside Visa.'),
  stock('PYPL',  'PayPal Holdings',             'Financial',     'fintech',        65.40,  0.84,   65, 'Digital payments and the Venmo network.'),
  stock('BRK.B', 'Berkshire Hathaway (B)',      'Financial',     'financial',     458.20,  0.16,  990, 'Warren Buffett\u2019s diversified holding company.'),
  stock('GS',    'Goldman Sachs',               'Financial',     'financial',     507.10,  0.92,  165, 'Investment-banking and trading franchise.'),
  stock('MS',    'Morgan Stanley',              'Financial',     'financial',     104.42,  0.63,  170, 'Wealth-management focused investment bank.'),

  // ── Healthcare ──
  stock('LLY',   'Eli Lilly and Company',       'Healthcare',    'healthcare',    882.40,  1.18,  840, 'Pharmaceutical giant — diabetes (Mounjaro) and obesity (Zepbound) blockbusters.'),
  stock('NVO',   'Novo Nordisk',                'Healthcare',    'healthcare',    132.50,  0.22,  580, 'Maker of Ozempic and Wegovy GLP-1 drugs.'),
  stock('UNH',   'UnitedHealth Group',          'Healthcare',    'healthcare',    584.20, -0.31,  537, 'Largest U.S. health insurer; Optum services arm.'),
  stock('JNJ',   'Johnson & Johnson',           'Healthcare',    'healthcare',    156.85,  0.27,  377, 'Diversified pharma and medical-devices company.'),
  stock('PFE',   'Pfizer Inc.',                 'Healthcare',    'healthcare',      28.45, -0.18,  161, 'Global pharmaceutical company.'),
  stock('MRK',   'Merck & Co.',                 'Healthcare',    'healthcare',    127.80,  0.41,  323, 'Pharmaceuticals including Keytruda oncology franchise.'),
  stock('ABBV',  'AbbVie Inc.',                 'Healthcare',    'healthcare',    183.70,  0.16,  324, 'Immunology (Humira/Skyrizi), oncology, and aesthetics.'),

  // ── Energy ──
  stock('XOM',   'Exxon Mobil Corp.',           'Energy',        'energy',        118.20,  0.27,  524, 'Worlds largest non-state-owned oil and gas company.'),
  stock('CVX',   'Chevron Corporation',         'Energy',        'energy',        158.40, -0.22,  295, 'Major integrated oil and gas major.'),

  // ── Communications / mobile ──
  stock('T',     'AT&T Inc.',                   'Communication', 'communication',  22.30,  0.18,  160, 'U.S. wireless and broadband carrier.'),
  stock('VZ',    'Verizon Communications',      'Communication', 'communication',  42.80, -0.06,  180, 'Largest U.S. wireless carrier by subscribers.'),

  // ── Crypto-adjacent ──
  stock('COIN',  'Coinbase Global',             'Financial',     'crypto_stock',  234.90,  3.12,   61, 'Largest U.S. cryptocurrency exchange.'),
  stock('MSTR', 'MicroStrategy Inc.',           'Technology',    'crypto_stock', 1487.30,  4.08,   30, 'Enterprise analytics with a large strategic Bitcoin treasury.'),
  stock('SQ',    'Block Inc.',                  'Financial',     'fintech',        70.45,  1.42,   44, 'Square seller ecosystem and Cash App consumer fintech.'),

  // ── Industrial / aerospace ──
  stock('BA',    'The Boeing Company',          'Industrial',    'industrial',    178.20, -0.86,  108, 'Commercial aircraft, defense, and space systems.'),
  stock('UBER',  'Uber Technologies',           'Industrial',    'industrial',      71.30,  0.94,  149, 'Ride-share, delivery (Eats), and freight platforms.'),
  stock('ABNB',  'Airbnb Inc.',                 'Consumer',      'consumer',      149.20,  0.27,   93, 'Global short-term-rental marketplace.'),
  stock('SHOP',  'Shopify Inc.',                'Technology',    'ecommerce',     105.40,  1.18,  136, 'E-commerce platform for independent merchants.'),
  stock('ORCL', 'Oracle Corporation', 'Technology', 'technology', 142.5, 0.9, 390, 'Enterprise databases, cloud infrastructure, and software.'),
  stock('CRM', 'Salesforce Inc.', 'Technology', 'technology', 268.4, 1.1, 258, 'Cloud CRM and enterprise software.'),
  stock('ADBE', 'Adobe Inc.', 'Technology', 'technology', 548.2, 0.7, 244, 'Creative, document, and marketing software.'),
  stock('IBM', 'IBM', 'Technology', 'technology', 192.3, 0.4, 178, 'Enterprise IT, consulting, and hybrid cloud.'),
  stock('CSCO', 'Cisco Systems', 'Technology', 'technology', 49.8, 0.3, 200, 'Networking hardware and cybersecurity.'),
  stock('ACN', 'Accenture', 'Technology', 'technology', 345.6, 0.6, 216, 'Global IT consulting and services.'),
  stock('NOW', 'ServiceNow', 'Technology', 'technology', 892.4, 1.4, 183, 'Enterprise workflow automation platform.'),
  stock('INTU', 'Intuit', 'Technology', 'technology', 642.1, 0.8, 180, 'TurboTax, QuickBooks, and financial software.'),
  stock('TXN', 'Texas Instruments', 'Semiconductor', 'semiconductor', 198.7, 0.5, 181, 'Analog and embedded semiconductors.'),
  stock('QCOM', 'Qualcomm', 'Semiconductor', 'semiconductor', 168.2, 1.2, 187, 'Mobile chipsets and wireless technology.'),
  stock('AMAT', 'Applied Materials', 'Semiconductor', 'semiconductor', 198.4, 1.5, 164, 'Semiconductor manufacturing equipment.'),
  stock('MU', 'Micron Technology', 'Semiconductor', 'semiconductor', 102.3, 2.1, 113, 'Memory and storage chips.'),
  stock('LRCX', 'Lam Research', 'Semiconductor', 'semiconductor', 78.5, 1.8, 102, 'Wafer fabrication equipment.'),
  stock('ARM', 'Arm Holdings', 'Semiconductor', 'semiconductor', 138.6, 2.4, 144, 'Chip architecture licensing.'),
  stock('MRVL', 'Marvell Technology', 'Semiconductor', 'semiconductor', 72.4, 2.0, 63, 'Data infrastructure semiconductors.'),
  stock('ADI', 'Analog Devices', 'Semiconductor', 'semiconductor', 228.3, 0.7, 113, 'High-performance analog chips.'),
  stock('SMCI', 'Super Micro Computer', 'Technology', 'technology', 42.8, 3.2, 25, 'AI server and storage hardware.'),
  stock('PLTR', 'Palantir Technologies', 'Technology', 'technology', 38.5, 3.8, 86, 'Data analytics and AI platforms.'),
  stock('SNOW', 'Snowflake', 'Technology', 'technology', 128.4, 2.2, 42, 'Cloud data warehousing.'),
  stock('CRWD', 'CrowdStrike', 'Technology', 'technology', 342.6, 1.9, 83, 'Cloud-native cybersecurity.'),
  stock('PANW', 'Palo Alto Networks', 'Technology', 'technology', 368.2, 1.4, 119, 'Enterprise network security.'),
  stock('ZS', 'Zscaler', 'Technology', 'technology', 192.5, 2.1, 29, 'Cloud security (zero trust).'),
  stock('DDOG', 'Datadog', 'Technology', 'technology', 122.7, 1.7, 42, 'Cloud monitoring and observability.'),
  stock('NET', 'Cloudflare', 'Technology', 'technology', 88.4, 2.3, 30, 'Web performance and security.'),
  stock('MDB', 'MongoDB', 'Technology', 'technology', 268.5, 1.6, 20, 'Developer data platform.'),
  stock('TEAM', 'Atlassian', 'Technology', 'technology', 192.3, 1.3, 50, 'Jira, Confluence, and dev collaboration.'),
  stock('WDAY', 'Workday', 'Technology', 'technology', 238.6, 0.9, 63, 'Enterprise HR and finance software.'),
  stock('JPM', 'JPMorgan Chase', 'Financial', 'financial', 218.4, 0.5, 625, 'Largest U.S. bank by assets.'),
  stock('BAC', 'Bank of America', 'Financial', 'financial', 42.3, 0.7, 325, 'Consumer and commercial banking.'),
  stock('WFC', 'Wells Fargo', 'Financial', 'financial', 62.8, 0.6, 210, 'Retail and commercial banking.'),
  stock('GS', 'Goldman Sachs', 'Financial', 'financial', 498.2, 0.8, 163, 'Investment banking and trading.'),
  stock('MS', 'Morgan Stanley', 'Financial', 'financial', 102.4, 0.9, 166, 'Wealth management and investment banking.'),
  stock('C', 'Citigroup', 'Financial', 'financial', 64.5, 0.4, 123, 'Global consumer and institutional banking.'),
  stock('BLK', 'BlackRock', 'Financial', 'financial', 892.3, 0.6, 133, 'World largest asset manager (iShares).'),
  stock('SCHW', 'Charles Schwab', 'Financial', 'financial', 72.8, 0.7, 133, 'Brokerage and wealth management.'),
  stock('AXP', 'American Express', 'Financial', 'financial', 248.6, 0.5, 178, 'Premium cards and payments.'),
  stock('MA', 'Mastercard', 'Fintech', 'fintech', 488.2, 0.8, 452, 'Global card payment network.'),
  stock('V', 'Visa Inc.', 'Fintech', 'fintech', 282.4, 0.6, 548, 'Largest card payment network.'),
  stock('PYPL', 'PayPal Holdings', 'Fintech', 'fintech', 72.3, 1.4, 74, 'Digital payments and checkout.'),
  stock('SQ', 'Block Inc.', 'Fintech', 'fintech', 68.5, 2.1, 42, 'Square and Cash App payments.'),
  stock('COIN', 'Coinbase Global', 'Crypto', 'crypto_stock', 215.4, 4.2, 53, 'Largest U.S. crypto exchange.'),
  stock('HOOD', 'Robinhood Markets', 'Fintech', 'fintech', 24.8, 3.1, 22, 'Commission-free trading app.'),
  stock('SOFI', 'SoFi Technologies', 'Fintech', 'fintech', 8.9, 2.8, 9, 'Digital lending and banking.'),
  stock('MSTR', 'MicroStrategy', 'Crypto', 'crypto_stock', 1682.4, 5.1, 32, 'Software firm with large Bitcoin holdings.'),
  stock('UNH', 'UnitedHealth Group', 'Healthcare', 'healthcare', 588.2, 0.4, 542, 'Health insurance and Optum services.'),
  stock('JNJ', 'Johnson & Johnson', 'Healthcare', 'healthcare', 162.4, 0.2, 391, 'Pharmaceuticals and medical devices.'),
  stock('LLY', 'Eli Lilly', 'Healthcare', 'healthcare', 892.6, 1.1, 848, 'Diabetes and weight-loss drugs.'),
  stock('ABBV', 'AbbVie', 'Healthcare', 'healthcare', 178.3, 0.5, 315, 'Immunology and oncology drugs.'),
  stock('MRK', 'Merck & Co.', 'Healthcare', 'healthcare', 112.4, 0.3, 285, 'Oncology, vaccines, and pharma.'),
  stock('PFE', 'Pfizer', 'Healthcare', 'healthcare', 28.6, 0.4, 162, 'Global pharmaceuticals and vaccines.'),
  stock('TMO', 'Thermo Fisher', 'Healthcare', 'healthcare', 562.3, 0.6, 215, 'Lab equipment and life sciences.'),
  stock('ABT', 'Abbott Laboratories', 'Healthcare', 'healthcare', 112.8, 0.3, 196, 'Medical devices and diagnostics.'),
  stock('DHR', 'Danaher', 'Healthcare', 'healthcare', 248.5, 0.5, 183, 'Life sciences and diagnostics.'),
  stock('AMGN', 'Amgen', 'Healthcare', 'healthcare', 312.4, 0.4, 168, 'Biotechnology therapeutics.'),
  stock('ISRG', 'Intuitive Surgical', 'Healthcare', 'healthcare', 482.6, 0.9, 172, 'Da Vinci robotic surgery systems.'),
  stock('CVX', 'Chevron', 'Energy', 'energy', 148.2, 0.6, 268, 'Integrated oil and gas major.'),
  stock('XOM', 'Exxon Mobil', 'Energy', 'energy', 114.5, 0.5, 458, 'Largest U.S. oil and gas company.'),
  stock('COP', 'ConocoPhillips', 'Energy', 'energy', 102.3, 0.7, 120, 'Exploration and production.'),
  stock('SLB', 'Schlumberger', 'Energy', 'energy', 42.8, 0.9, 60, 'Oilfield services and technology.'),
  stock('OXY', 'Occidental Petroleum', 'Energy', 'energy', 52.4, 1.1, 49, 'Oil, gas, and chemicals.'),
  stock('WMT', 'Walmart', 'Consumer', 'consumer', 82.4, 0.4, 662, 'Largest U.S. retailer.'),
  stock('COST', 'Costco Wholesale', 'Consumer', 'consumer', 892.3, 0.6, 396, 'Membership warehouse clubs.'),
  stock('PG', 'Procter & Gamble', 'Consumer', 'consumer', 168.2, 0.2, 396, 'Consumer packaged goods.'),
  stock('KO', 'Coca-Cola', 'Consumer', 'consumer', 68.4, 0.3, 294, 'Global beverage company.'),
  stock('PEP', 'PepsiCo', 'Consumer', 'consumer', 172.5, 0.3, 237, 'Beverages and snacks (Frito-Lay).'),
  stock('MCD', 'McDonalds', 'Consumer', 'consumer', 298.6, 0.4, 214, 'Global fast-food franchise.'),
  stock('NKE', 'Nike', 'Consumer', 'consumer', 78.3, 0.8, 118, 'Athletic footwear and apparel.'),
  stock('SBUX', 'Starbucks', 'Consumer', 'consumer', 96.4, 0.6, 109, 'Global coffeehouse chain.'),
  stock('HD', 'Home Depot', 'Consumer', 'consumer', 382.5, 0.5, 380, 'Home improvement retail.'),
  stock('LOW', 'Lowes', 'Consumer', 'consumer', 248.3, 0.4, 142, 'Home improvement retail.'),
  stock('TGT', 'Target', 'Consumer', 'consumer', 148.6, 0.7, 68, 'General merchandise retail.'),
  stock('DIS', 'Walt Disney', 'Communication', 'communication', 96.4, 0.9, 175, 'Media, parks, and streaming.'),
  stock('CMCSA', 'Comcast', 'Communication', 'communication', 38.2, 0.3, 150, 'Cable, broadband, and NBCUniversal.'),
  stock('VZ', 'Verizon', 'Communication', 'communication', 42.5, 0.2, 179, 'Wireless and broadband carrier.'),
  stock('T', 'AT&T', 'Communication', 'communication', 22.4, 0.3, 160, 'Telecom and connectivity.'),
  stock('TMUS', 'T-Mobile US', 'Communication', 'communication', 218.6, 0.5, 255, 'Wireless carrier.'),
  stock('SPOT', 'Spotify', 'Streaming', 'streaming', 388.4, 1.6, 78, 'Music and podcast streaming.'),
  stock('ROKU', 'Roku', 'Streaming', 'streaming', 68.5, 2.4, 10, 'Streaming platform and devices.'),
  stock('SNAP', 'Snap Inc.', 'Social Media', 'social_media', 11.2, 3.1, 18, 'Snapchat social platform.'),
  stock('PINS', 'Pinterest', 'Social Media', 'social_media', 32.4, 2.2, 22, 'Visual discovery platform.'),
  stock('RDDT', 'Reddit', 'Social Media', 'social_media', 72.5, 3.8, 12, 'Social news and community platform.'),
  stock('GM', 'General Motors', 'Automotive', 'automotive', 48.2, 0.8, 54, 'Legacy U.S. automaker.'),
  stock('F', 'Ford Motor', 'Automotive', 'automotive', 11.4, 0.9, 45, 'Legacy U.S. automaker.'),
  stock('RIVN', 'Rivian Automotive', 'Automotive', 'automotive', 12.8, 3.4, 13, 'Electric truck and van maker.'),
  stock('LCID', 'Lucid Group', 'Automotive', 'automotive', 3.2, 4.1, 7, 'Luxury electric vehicles.'),
  stock('CAT', 'Caterpillar', 'Industrial', 'industrial', 362.4, 0.6, 175, 'Heavy construction equipment.'),
  stock('DE', 'Deere & Company', 'Industrial', 'industrial', 412.5, 0.5, 113, 'Agricultural machinery.'),
  stock('GE', 'GE Aerospace', 'Industrial', 'industrial', 178.3, 0.7, 192, 'Aircraft engines and aerospace.'),
  stock('HON', 'Honeywell', 'Industrial', 'industrial', 212.4, 0.4, 138, 'Diversified industrial technology.'),
  stock('RTX', 'RTX Corporation', 'Industrial', 'industrial', 118.6, 0.5, 158, 'Aerospace and defense.'),
  stock('LMT', 'Lockheed Martin', 'Industrial', 'industrial', 548.2, 0.3, 130, 'Defense and aerospace systems.'),
  stock('UPS', 'United Parcel Service', 'Industrial', 'industrial', 132.4, 0.4, 113, 'Global package delivery.'),
  stock('FDX', 'FedEx', 'Industrial', 'industrial', 288.5, 0.6, 70, 'Express shipping and logistics.'),
  stock('MMM', '3M Company', 'Industrial', 'industrial', 132.6, 0.3, 73, 'Diversified industrial products.'),
  stock('ETSY', 'Etsy', 'Consumer', 'ecommerce', 58.4, 1.8, 7, 'Handmade and vintage marketplace.'),
  stock('EBAY', 'eBay', 'Consumer', 'ecommerce', 62.3, 0.9, 30, 'Online auction and marketplace.'),
  stock('MELI', 'MercadoLibre', 'Consumer', 'ecommerce', 1982.4, 1.9, 100, 'Latin America e-commerce and fintech.'),
  stock('SE', 'Sea Limited', 'Consumer', 'ecommerce', 88.5, 2.6, 50, 'Shopee, Garena, and SeaMoney.'),
  stock('DASH', 'DoorDash', 'Consumer', 'consumer', 142.3, 1.7, 58, 'Food delivery marketplace.'),
];

// ──────────────────────────────────────────────────────────────────────
// EXPORTS
// ──────────────────────────────────────────────────────────────────────
export const ALL_ASSETS: Asset[] = [...ETFS, ...STOCKS];

export const SP500_SYMBOLS = ['VOO', 'SPY', 'IVV', 'SPLG'];

export const CATEGORY_LABELS: Partial<Record<AssetCategory, string>> = {
  sp500: 'S&P 500 ETFs',
  nasdaq_100: 'Nasdaq 100 ETFs',
  total_market: 'Total Market ETFs',
  dividend: 'Dividend ETFs',
  sector: 'Tech ETFs',
  bond: 'Bond ETFs',
  technology: 'Technology',
  semiconductor: 'Semiconductors',
  consumer: 'Consumer',
  financial: 'Financials',
  healthcare: 'Healthcare',
  energy: 'Energy',
  communication: 'Communications',
  industrial: 'Industrials',
  automotive: 'Automotive',
  ecommerce: 'E-commerce',
  social_media: 'Social Media',
  streaming: 'Streaming',
  fintech: 'Fintech',
  crypto_stock: 'Crypto-adjacent',
};

export function getSP500Etfs(): Asset[] {
  return ETFS.filter(e => SP500_SYMBOLS.includes(e.symbol));
}
export function getEtfsByCategory(cat: AssetCategory): Asset[] {
  return ETFS.filter(e => e.category === cat);
}
export function getStocksByCategory(cat: AssetCategory): Asset[] {
  return STOCKS.filter(s => s.category === cat);
}
export function getAsset(symbol: string): Asset | undefined {
  const s = String(symbol || '').toUpperCase();
  return ALL_ASSETS.find(a => a.symbol.toUpperCase() === s);
}
export function getBeginnerEtfs(): Asset[] {
  return ETFS.filter(e => e.beginnerFriendly);
}
export function getTopMovers(n = 8): Asset[] {
  return [...STOCKS]
    .sort((a, b) => Math.abs(b.seedChangePct) - Math.abs(a.seedChangePct))
    .slice(0, n);
}
export function getMegaCapStocks(): Asset[] {
  return STOCKS
    .filter(s => (s.marketCapBillions || 0) >= 500)
    .sort((a, b) => (b.marketCapBillions || 0) - (a.marketCapBillions || 0));
}
export function searchAssets(query: string): Asset[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_ASSETS.filter(
    a => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
  ).slice(0, 25);
}
