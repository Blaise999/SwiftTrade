-- =====================================================================
-- SWIFT TRADE — MIGRATION 04
-- Apply on TOP of existing 01_schema.sql / 02_seed.sql / 03_admin.
-- Safe to run repeatedly (everything is idempotent).
--
-- This migration:
--   1. Adds missing columns the app references (defensive patches)
--   2. Backfills the `assets` table with the unified stocks + ETFs
--      catalog (sectors, market caps, fractionable flags)
--   3. Adds helpful indexes for the invest flow
-- =====================================================================

-- ─── 1. Defensive column additions (idempotent) ─────────────────────
alter table public.assets
  add column if not exists sector text,
  add column if not exists market_cap_billions numeric(20,4),
  add column if not exists beginner_friendly boolean default false,
  add column if not exists is_active boolean default true;

alter table public.positions
  add column if not exists day_gain numeric(20,4) default 0,
  add column if not exists day_gain_pct numeric(10,4) default 0;

alter table public.orders
  add column if not exists fill_price numeric(20,4),
  add column if not exists filled_at timestamptz,
  add column if not exists notes text;

-- ─── 2. Indexes ─────────────────────────────────────────────────────
create index if not exists idx_positions_symbol on public.positions(symbol);
create index if not exists idx_orders_symbol_created on public.orders(symbol, created_at desc);
create index if not exists idx_assets_sector on public.assets(sector);

-- ─── 3. Backfill: individual stocks (50+) ────────────────────────────
insert into public.assets (symbol, name, asset_type, category, sector, market_cap_billions, fractionable, seed_price, description)
values
  -- Mega-cap technology
  ('AAPL',  'Apple Inc.',                   'stock', 'technology',    'Technology',    2880, true, 189.45, 'iPhone, Mac, services. Most valuable consumer tech company in the world.'),
  ('MSFT',  'Microsoft Corporation',        'stock', 'technology',    'Technology',    3110, true, 418.74, 'Cloud (Azure), productivity, Windows, and AI infrastructure leader.'),
  ('GOOGL', 'Alphabet Inc. (Class A)',      'stock', 'communication', 'Communication', 2150, true, 174.39, 'Parent of Google Search, YouTube, Android, and Google Cloud.'),
  ('AMZN',  'Amazon.com Inc.',              'stock', 'ecommerce',     'Consumer',      1940, true, 185.92, 'E-commerce, AWS cloud, Prime Video, advertising.'),
  ('META',  'Meta Platforms Inc.',          'stock', 'social_media',  'Communication', 1280, true, 502.13, 'Facebook, Instagram, WhatsApp, Reality Labs.'),
  ('NVDA',  'NVIDIA Corporation',           'stock', 'semiconductor', 'Technology',    2320, true, 943.21, 'GPU and AI-accelerator leader.'),
  ('TSLA',  'Tesla Inc.',                   'stock', 'automotive',    'Automotive',     790, true, 248.50, 'EVs, energy storage, and FSD software development.'),
  -- Other large-cap tech
  ('AMD',   'Advanced Micro Devices',       'stock', 'semiconductor', 'Semiconductor',  263, true, 162.84, 'CPU and GPU manufacturer competing with Intel and NVIDIA.'),
  ('AVGO',  'Broadcom Inc.',                'stock', 'semiconductor', 'Semiconductor',  812, true, 174.50, 'Networking and infrastructure software (VMware).'),
  ('INTC',  'Intel Corporation',            'stock', 'semiconductor', 'Semiconductor',   97, true,  22.45, 'CPU and chip foundry company.'),
  ('CRM',   'Salesforce Inc.',              'stock', 'technology',    'Technology',     300, true, 312.65, 'CRM and data-cloud / AI agent platform.'),
  ('ORCL',  'Oracle Corporation',           'stock', 'technology',    'Technology',     486, true, 176.20, 'Enterprise database and cloud infrastructure.'),
  ('ADBE',  'Adobe Inc.',                   'stock', 'technology',    'Technology',     234, true, 525.18, 'Creative Cloud, Acrobat, and Experience Cloud.'),
  ('CSCO',  'Cisco Systems',                'stock', 'technology',    'Technology',     198, true,  48.92, 'Networking hardware, software, security.'),
  ('IBM',   'IBM Corporation',              'stock', 'technology',    'Technology',     195, true, 212.40, 'Hybrid cloud (Red Hat), consulting, enterprise AI.'),
  ('NOW',   'ServiceNow Inc.',              'stock', 'technology',    'Technology',     182, true, 885.30, 'IT service management for large enterprises.'),
  ('NFLX',  'Netflix Inc.',                 'stock', 'streaming',     'Communication',  295, true, 687.42, 'Subscription streaming, gaming, ad-tier.'),
  -- Consumer & retail
  ('WMT',   'Walmart Inc.',                 'stock', 'consumer',      'Consumer',       548, true,  68.15, 'Largest U.S. retailer.'),
  ('COST',  'Costco Wholesale',             'stock', 'consumer',      'Consumer',       386, true, 872.30, 'Membership warehouse retailer.'),
  ('HD',    'The Home Depot',               'stock', 'consumer',      'Consumer',       381, true, 385.42, 'Largest U.S. home-improvement retailer.'),
  ('NKE',   'Nike Inc.',                    'stock', 'consumer',      'Consumer',       117, true,  77.85, 'Athletic footwear and apparel.'),
  ('MCD',   'McDonald''s Corp.',            'stock', 'consumer',      'Consumer',       204, true, 284.10, 'Largest restaurant chain by revenue.'),
  ('SBUX',  'Starbucks Corporation',        'stock', 'consumer',      'Consumer',       110, true,  96.78, 'Global coffeehouse chain.'),
  ('KO',    'The Coca-Cola Company',        'stock', 'consumer',      'Consumer',       312, true,  72.41, 'Worlds largest non-alcoholic beverage company.'),
  ('PEP',   'PepsiCo Inc.',                 'stock', 'consumer',      'Consumer',       232, true, 168.90, 'Snacks and beverages.'),
  ('DIS',   'The Walt Disney Co.',          'stock', 'streaming',     'Communication',  175, true,  96.20, 'Streaming, Parks, Studios, ESPN.'),
  -- Financial / fintech
  ('JPM',   'JPMorgan Chase & Co.',         'stock', 'financial',     'Financial',      601, true, 209.30, 'Largest U.S. bank by assets.'),
  ('BAC',   'Bank of America',              'stock', 'financial',     'Financial',      338, true,  43.18, 'Second-largest U.S. bank.'),
  ('V',     'Visa Inc.',                    'stock', 'fintech',       'Financial',      570, true, 278.45, 'Worldwide payment-network operator.'),
  ('MA',    'Mastercard Inc.',              'stock', 'fintech',       'Financial',      434, true, 468.30, 'Global payment-network operator.'),
  ('PYPL',  'PayPal Holdings',              'stock', 'fintech',       'Financial',       65, true,  65.40, 'Digital payments and Venmo.'),
  ('GS',    'Goldman Sachs',                'stock', 'financial',     'Financial',      165, true, 507.10, 'Investment-banking and trading franchise.'),
  ('MS',    'Morgan Stanley',               'stock', 'financial',     'Financial',      170, true, 104.42, 'Wealth-management focused investment bank.'),
  -- Healthcare
  ('LLY',   'Eli Lilly and Company',        'stock', 'healthcare',    'Healthcare',     840, true, 882.40, 'Pharma giant (Mounjaro, Zepbound).'),
  ('NVO',   'Novo Nordisk',                 'stock', 'healthcare',    'Healthcare',     580, true, 132.50, 'Maker of Ozempic and Wegovy.'),
  ('UNH',   'UnitedHealth Group',           'stock', 'healthcare',    'Healthcare',     537, true, 584.20, 'Largest U.S. health insurer.'),
  ('JNJ',   'Johnson & Johnson',            'stock', 'healthcare',    'Healthcare',     377, true, 156.85, 'Diversified pharma and medical-devices.'),
  ('PFE',   'Pfizer Inc.',                  'stock', 'healthcare',    'Healthcare',     161, true,  28.45, 'Global pharmaceutical company.'),
  ('MRK',   'Merck & Co.',                  'stock', 'healthcare',    'Healthcare',     323, true, 127.80, 'Pharmaceuticals including Keytruda.'),
  ('ABBV',  'AbbVie Inc.',                  'stock', 'healthcare',    'Healthcare',     324, true, 183.70, 'Immunology, oncology, aesthetics.'),
  -- Energy
  ('XOM',   'Exxon Mobil Corp.',            'stock', 'energy',        'Energy',         524, true, 118.20, 'Worlds largest non-state-owned oil and gas company.'),
  ('CVX',   'Chevron Corporation',          'stock', 'energy',        'Energy',         295, true, 158.40, 'Major integrated oil and gas major.'),
  -- Communications / mobile
  ('T',     'AT&T Inc.',                    'stock', 'communication', 'Communication',  160, true,  22.30, 'U.S. wireless and broadband carrier.'),
  ('VZ',    'Verizon Communications',       'stock', 'communication', 'Communication',  180, true,  42.80, 'Largest U.S. wireless carrier.'),
  -- Crypto-adjacent
  ('COIN',  'Coinbase Global',              'stock', 'crypto_stock',  'Financial',       61, true, 234.90, 'Largest U.S. cryptocurrency exchange.'),
  ('MSTR',  'MicroStrategy Inc.',           'stock', 'crypto_stock',  'Technology',      30, true,1487.30, 'Enterprise analytics with strategic BTC treasury.'),
  ('SQ',    'Block Inc.',                   'stock', 'fintech',       'Financial',       44, true,  70.45, 'Square seller ecosystem + Cash App.'),
  -- Industrial / aerospace / mobility
  ('BA',    'The Boeing Company',           'stock', 'industrial',    'Industrial',     108, true, 178.20, 'Commercial aircraft, defense, space.'),
  ('UBER',  'Uber Technologies',            'stock', 'industrial',    'Industrial',     149, true,  71.30, 'Ride-share, delivery, freight.'),
  ('ABNB',  'Airbnb Inc.',                  'stock', 'consumer',      'Consumer',        93, true, 149.20, 'Global short-term-rental marketplace.'),
  ('SHOP',  'Shopify Inc.',                 'stock', 'ecommerce',     'Technology',     136, true, 105.40, 'E-commerce platform for independent merchants.')
on conflict (symbol) do update set
  name = excluded.name,
  asset_type = excluded.asset_type,
  category = excluded.category,
  sector = excluded.sector,
  market_cap_billions = excluded.market_cap_billions,
  fractionable = excluded.fractionable,
  seed_price = excluded.seed_price,
  description = excluded.description,
  updated_at = now();

-- ─── 4. Make sure user_watchlists / orders / positions allow uuid + text symbols
-- (already correct in 01_schema; this is a no-op safety net)
do $$ begin
  perform 1 from information_schema.columns
   where table_schema='public' and table_name='positions' and column_name='symbol';
  if not found then
    raise exception 'positions.symbol missing — run 01_schema.sql first';
  end if;
end $$;

-- Done.
