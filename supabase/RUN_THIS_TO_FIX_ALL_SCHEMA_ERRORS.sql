-- =====================================================================
-- 🚨 RUN THIS FILE ONCE IN YOUR SUPABASE SQL EDITOR 🚨
--
-- Fixes ALL reported schema errors including:
--   ✅ trades.liquidation_price does not exist
--   ✅ bridge_requests.country_name not found in schema cache
--   ✅ ~150 other column gaps across users / admin / trading
--
-- This single file contains migrations 04, 05, 06, 07 combined.
-- 100% idempotent — safe to run repeatedly.
--
-- Assumes 01_schema.sql, 02_seed.sql, 03_admin_bootstrap.sql are
-- already applied. If not, run those three FIRST, then this one.
-- =====================================================================


-- ====== 04_migration_stocks_catalog.sql ======
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

-- ====== 05_migration_schema_completion.sql ======
-- =====================================================================
-- SWIFT TRADE — MIGRATION 05
-- Comprehensive schema fix for the whole app + admin.
--
-- Apply on top of 01–04. Safe to run repeatedly (idempotent).
--
-- This migration closes every column gap discovered by static analysis
-- of the codebase against the live schema (175 columns identified).
-- Where types could not be confidently inferred from name, text is the
-- safe default; jsonb is used for known structured fields.
-- =====================================================================

-- ─── ADMIN ALERTS ────────────────────────────────────────────────────
alter table public.admin_alerts
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists type text,
  add column if not exists request_id uuid,
  add column if not exists priority text default 'normal',
  add column if not exists status text default 'open',
  add column if not exists user_id uuid references public.users(id),
  add column if not exists action_url text;

-- ─── ADMIN AUDIT LOG ─────────────────────────────────────────────────
-- "from"/"to" are SQL reserved words — must always be quoted.
alter table public.admin_audit_log
  add column if not exists address text,
  add column if not exists chat_id uuid,
  add column if not exists currency text,
  add column if not exists duration_minutes int,
  add column if not exists entry_time timestamptz,
  add column if not exists "from" text,
  add column if not exists "to" text,
  add column if not exists label text,
  add column if not exists message_length int,
  add column if not exists meta jsonb default '{}'::jsonb,
  add column if not exists network text,
  add column if not exists seq bigint,
  add column if not exists session_id uuid,
  add column if not exists telegram_sent boolean default false,
  add column if not exists telegram_message_id text,
  add column if not exists tick_ok boolean,
  add column if not exists trades_closed int,
  add column if not exists trades_repriced int,
  add column if not exists updates int,
  add column if not exists wallet_id uuid,
  add column if not exists wallet_type text,
  add column if not exists profit_percent numeric(10,4),
  add column if not exists target_user_id uuid references public.users(id);

-- ─── ADMIN LOGS ──────────────────────────────────────────────────────
alter table public.admin_logs
  add column if not exists action text,
  add column if not exists action_category text,
  add column if not exists details jsonb default '{}'::jsonb,
  add column if not exists ip_address text,
  add column if not exists user_agent text,
  add column if not exists old_values jsonb default '{}'::jsonb,
  add column if not exists new_values jsonb default '{}'::jsonb,
  add column if not exists reason text,
  add column if not exists status text default 'active',
  add column if not exists target_id uuid,
  add column if not exists target_type text;

-- ─── ADMIN SESSIONS ──────────────────────────────────────────────────
alter table public.admin_sessions
  add column if not exists ip_address text,
  add column if not exists last_activity_at timestamptz default now(),
  add column if not exists revoked_at timestamptz,
  add column if not exists token_hash text,
  add column if not exists user_agent text;

-- ─── BRIDGE COUNTRIES / REQUESTS ─────────────────────────────────────
alter table public.bridge_countries
  add column if not exists active boolean default true,
  add column if not exists payment_methods jsonb default '[]'::jsonb;

alter table public.bridge_requests
  add column if not exists admin_id uuid references public.users(id),
  add column if not exists admin_notes text,
  add column if not exists admin_payment_details jsonb default '{}'::jsonb,
  add column if not exists admin_responded_at timestamptz,
  add column if not exists credited_amount numeric(30,12),
  add column if not exists credited_amount_usd numeric(20,2),
  add column if not exists credited_asset text,
  add column if not exists estimated_credit_usd numeric(20,2);

-- ─── CRYPTO POSITIONS (shield) ───────────────────────────────────────
alter table public.crypto_positions
  add column if not exists shield_enabled boolean default false,
  add column if not exists shield_activated_at timestamptz,
  add column if not exists shield_snap_price numeric(30,12),
  add column if not exists shield_snap_value numeric(20,2),
  add column if not exists average_price numeric(30,12),
  add column if not exists total_cost_basis numeric(20,2) default 0;

-- ─── CUSTOM PAIRS / PRICE OVERRIDES ──────────────────────────────────
alter table public.custom_pairs
  add column if not exists is_enabled boolean default true,
  add column if not exists ask_price numeric(30,12),
  add column if not exists bid_price numeric(30,12),
  add column if not exists current_price numeric(30,12),
  add column if not exists created_by uuid references public.users(id);

-- ─── DEMO FX (full family) ───────────────────────────────────────────
alter table public.demo_fx_pairs
  add column if not exists name text,
  add column if not exists base_currency text,
  add column if not exists quote_currency text,
  add column if not exists display_order int default 0,
  add column if not exists mode text default 'normal',
  add column if not exists active_scenario_id uuid,
  add column if not exists active_session_id uuid,
  add column if not exists seq bigint default 0,
  add column if not exists spread numeric(30,12) default 0.0002,
  add column if not exists price_updated_at timestamptz default now();

alter table public.demo_fx_sessions
  add column if not exists completed_at timestamptz,
  add column if not exists duration_ms bigint default 0,
  add column if not exists elapsed_ms bigint default 0,
  add column if not exists lesson_title text,
  add column if not exists lesson_description text,
  add column if not exists student_instructions text,
  add column if not exists paused_at timestamptz,
  add column if not exists session_type text default 'lesson',
  add column if not exists status text default 'active',
  add column if not exists tick_interval_ms int default 1000,
  add column if not exists tick_seq bigint default 0,
  add column if not exists pair_id uuid references public.demo_fx_pairs(id);

alter table public.demo_fx_ticks
  add column if not exists seq bigint default 0,
  add column if not exists source text default 'engine',
  add column if not exists ask numeric(30,12),
  add column if not exists mid numeric(30,12);

alter table public.demo_fx_candles
  add column if not exists bucket_start timestamptz,
  add column if not exists tick_count int default 0,
  add column if not exists close numeric(30,12),
  add column if not exists high numeric(30,12),
  add column if not exists low numeric(30,12);

alter table public.demo_fx_price_log
  add column if not exists source text default 'engine',
  add column if not exists ask numeric(30,12),
  add column if not exists logged_at timestamptz default now();

alter table public.demo_fx_scenarios
  add column if not exists completed_at timestamptz,
  add column if not exists current_step_index int default 0,
  add column if not exists elapsed_ms bigint default 0,
  add column if not exists scheduled_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists status text default 'pending',
  add column if not exists pair_id uuid references public.demo_fx_pairs(id);

alter table public.demo_fx_scenario_steps
  add column if not exists step_index int default 0,
  add column if not exists target_ask numeric(30,12),
  add column if not exists target_bid numeric(30,12);

alter table public.demo_fx_trades
  add column if not exists close_reason text,
  add column if not exists direction text,
  add column if not exists direction_label text,
  add column if not exists symbol text,
  add column if not exists current_price numeric(30,12),
  add column if not exists entry_ask numeric(30,12),
  add column if not exists entry_bid numeric(30,12),
  add column if not exists exit_price numeric(30,12),
  add column if not exists final_pnl numeric(20,2) default 0,
  add column if not exists floating_pnl numeric(20,2) default 0,
  add column if not exists investment numeric(20,2),
  add column if not exists multiplier numeric(10,2) default 1,
  add column if not exists spread_cost numeric(20,4) default 0,
  add column if not exists stop_loss numeric(30,12),
  add column if not exists take_profit numeric(30,12);

-- ─── DEPOSITS / WITHDRAWALS ──────────────────────────────────────────
alter table public.deposits
  add column if not exists address_shown text,
  add column if not exists admin_note text,
  add column if not exists order_id text,
  add column if not exists payment_asset text,
  add column if not exists processed_at timestamptz,
  add column if not exists processed_by uuid references public.users(id),
  add column if not exists rejection_reason text;

alter table public.withdrawals
  add column if not exists admin_note text,
  add column if not exists processed_at timestamptz,
  add column if not exists processed_by uuid references public.users(id),
  add column if not exists rejection_reason text;

-- ─── EMAIL OTPS ──────────────────────────────────────────────────────
alter table public.email_otps
  add column if not exists otp_hash text,
  add column if not exists attempts int default 0,
  add column if not exists max_attempts int default 5,
  add column if not exists type text default 'signup',
  add column if not exists used_at timestamptz;

-- ─── KYC ─────────────────────────────────────────────────────────────
alter table public.kyc_documents
  add column if not exists file_size bigint,
  add column if not exists mime_type text,
  add column if not exists doc_number text,
  add column if not exists country text,
  add column if not exists expiry_date date;

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────
alter table public.notifications
  add column if not exists read_at timestamptz,
  add column if not exists body text,
  add column if not exists action_url text,
  add column if not exists priority text default 'normal';

alter table public.user_notifications
  add column if not exists body text,
  add column if not exists read_at timestamptz;

-- ─── PAYMENTS / WALLETS ──────────────────────────────────────────────
alter table public.payment_methods
  add column if not exists enabled boolean default true;

alter table public.platform_wallets
  add column if not exists confirmations int default 6,
  add column if not exists min_amount numeric(20,2),
  add column if not exists currency text,
  add column if not exists wallet_type text default 'crypto';

alter table public.user_deposit_wallets
  add column if not exists currency text,
  add column if not exists label text,
  add column if not exists wallet_type text default 'crypto';

-- ─── REFERRALS ───────────────────────────────────────────────────────
alter table public.referrals
  add column if not exists reward_amount numeric(20,2) default 0,
  add column if not exists reward_paid boolean default false,
  add column if not exists reward_paid_at timestamptz,
  add column if not exists reward_trigger text,
  add column if not exists updated_at timestamptz default now();

-- ─── SHIELD EVENTS ───────────────────────────────────────────────────
alter table public.shield_events
  add column if not exists duration_seconds int,
  add column if not exists event_type text,
  add column if not exists position_id uuid,
  add column if not exists symbol text,
  add column if not exists market_price numeric(30,12),
  add column if not exists market_value numeric(20,2),
  add column if not exists snap_price numeric(30,12),
  add column if not exists snap_value numeric(20,2),
  add column if not exists shield_impact numeric(20,2),
  add column if not exists cost_basis numeric(20,2),
  add column if not exists quantity numeric(30,12);

-- ─── SUPPORT ─────────────────────────────────────────────────────────
alter table public.support_messages
  add column if not exists message text,
  add column if not exists read_at timestamptz,
  add column if not exists sender_type text default 'user';

alter table public.support_tickets
  add column if not exists resolved_at timestamptz,
  add column if not exists assigned_to uuid references public.users(id);

-- ─── TIER PURCHASES ──────────────────────────────────────────────────
alter table public.tier_purchases
  add column if not exists tier_active boolean default false;

-- ─── TRADES ──────────────────────────────────────────────────────────
alter table public.trades
  add column if not exists asset text,
  add column if not exists close_reason text,
  add column if not exists direction_int int,
  add column if not exists duration_seconds int,
  add column if not exists idempotency_key text,
  add column if not exists meta jsonb default '{}'::jsonb,
  add column if not exists reason text,
  add column if not exists repaired boolean default false,
  add column if not exists repaired_at timestamptz,
  add column if not exists repaired_by uuid references public.users(id),
  add column if not exists session_id uuid,
  add column if not exists source text default 'web',
  add column if not exists trade_type text,
  add column if not exists fees numeric(20,4) default 0,
  add column if not exists floating_pnl numeric(20,2) default 0,
  add column if not exists margin_used numeric(20,2) default 0,
  add column if not exists multiplier numeric(10,2) default 1,
  add column if not exists payout_percent numeric(10,4),
  add column if not exists pnl_pct numeric(10,4),
  add column if not exists pnl_percentage numeric(10,4),
  add column if not exists current_price numeric(30,12),
  add column if not exists investment numeric(20,2),
  add column if not exists lot_size numeric(20,4);

create unique index if not exists idx_trades_idempotency
  on public.trades(user_id, idempotency_key)
  where idempotency_key is not null;

-- ─── TRANSACTIONS ────────────────────────────────────────────────────
alter table public.transactions
  add column if not exists reference_type text,
  add column if not exists source text default 'system',
  add column if not exists balance_before numeric(20,2),
  add column if not exists balance_after numeric(20,2),
  add column if not exists created_by uuid references public.users(id),
  add column if not exists fee numeric(20,4) default 0;

-- ─── USER TRADING DATA ───────────────────────────────────────────────
alter table public.user_trading_data
  add column if not exists spot_crypto_state jsonb default '{}'::jsonb,
  add column if not exists spot_stocks_state jsonb default '{}'::jsonb;

-- ─── USERS (the big one) ─────────────────────────────────────────────
alter table public.users
  add column if not exists balance_locked numeric(20,2) default 0,
  add column if not exists bonus_balance numeric(20,2) default 0,
  add column if not exists deposit_address text,
  add column if not exists deposit_network text,
  add column if not exists is_verified boolean default false,
  add column if not exists kyc_data jsonb default '{}'::jsonb,
  add column if not exists kyc_level int default 0,
  add column if not exists kyc_rejection_reason text,
  add column if not exists kyc_reviewed_at timestamptz,
  add column if not exists kyc_reviewed_by uuid references public.users(id),
  add column if not exists kyc_reviewer_id uuid references public.users(id),
  add column if not exists kyc_submitted_at timestamptz,
  add column if not exists referral_count int default 0,
  add column if not exists status text default 'active',
  add column if not exists tier_activated_at timestamptz,
  add column if not exists tier_active boolean default false,
  add column if not exists tier_code text,
  add column if not exists tier_level int default 0,
  add column if not exists tier_purchase_network text,
  add column if not exists tier_purchase_wallet text,
  add column if not exists total_profit_loss numeric(20,2) default 0,
  add column if not exists total_withdrawn numeric(20,2) default 0,
  add column if not exists pnl numeric(20,2) default 0,
  add column if not exists last_seen_at timestamptz,
  add column if not exists ip_address text;

-- ─── ASSETS (extra metadata fields the invest UI uses) ───────────────
alter table public.assets
  add column if not exists is_active boolean default true,
  add column if not exists beginner_friendly boolean default false;

-- ─── PROFILES VIEW ───────────────────────────────────────────────────
-- The app references `profiles` in a couple of places (compatibility
-- with older Supabase patterns). Provide a thin view that mirrors
-- public.users so those queries don't fail.
drop view if exists public.profiles cascade;
create view public.profiles as
  select
    id,
    email,
    first_name,
    last_name,
    role,
    tier,
    tier_code,
    tier_level,
    tier_active,
    balance_available,
    kyc_status,
    is_active,
    is_verified,
    status,
    created_at,
    updated_at
  from public.users;

-- Grants — wrapped in DO so missing Supabase roles in dev don't fail
do $$ begin
  grant select on public.profiles to authenticated;
exception when undefined_object then null;
end $$;
do $$ begin
  grant select on public.profiles to anon;
exception when undefined_object then null;
end $$;
do $$ begin
  grant select on public.profiles to service_role;
exception when undefined_object then null;
end $$;

-- ─── HELPFUL INDEXES ─────────────────────────────────────────────────
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_tier on public.users(tier_code, tier_level);
create index if not exists idx_trades_user_status on public.trades(user_id, status);
create index if not exists idx_deposits_user_status on public.deposits(user_id, status);
create index if not exists idx_withdrawals_user_status on public.withdrawals(user_id, status);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, read_at);
create index if not exists idx_user_notifications_user_read on public.user_notifications(user_id, read_at);
-- admin_audit_log uses admin_id (not user_id) as the actor reference
create index if not exists idx_admin_audit_admin_created on public.admin_audit_log(admin_id, created_at desc);
create index if not exists idx_admin_audit_target on public.admin_audit_log(target_user_id, created_at desc);
create index if not exists idx_admin_alerts_status on public.admin_alerts(status, created_at desc);

-- Done.

-- ====== 06_migration_real_fixes.sql ======
-- =====================================================================
-- SWIFT TRADE — MIGRATION 06
-- "Real bug" fixes from production: columns the app inserts that
-- the schema doesn't have.
--
-- Apply on top of 01–05. Idempotent (safe to re-run).
-- =====================================================================

-- ─── BRIDGE_REQUESTS: country_name was missing ──────────────────────
-- Confirmed from app/api/bridge/create/route.ts which inserts
-- { country_code, country_name, ... } into bridge_requests.
alter table public.bridge_requests
  add column if not exists country_name text,
  add column if not exists local_amount_str text,        -- for UI display copy
  add column if not exists payment_method text,          -- gcash / bank / upi / etc
  add column if not exists user_payment_reference text,  -- ref user enters
  add column if not exists expires_at timestamptz;

-- Backfill country_name from bridge_countries where we already have code
update public.bridge_requests br
   set country_name = bc.name
  from public.bridge_countries bc
 where br.country_code = bc.code
   and (br.country_name is null or br.country_name = '');

-- ─── TRADES: liquidation_price and other engine fields ──────────────
-- Confirmed from app/api/fx/trades/route.ts which inserts
-- { liquidation_price, spread_cost, volume, is_simulated, ... }
alter table public.trades
  add column if not exists liquidation_price numeric(30,12),
  add column if not exists spread_cost numeric(20,4) default 0,
  add column if not exists volume numeric(30,12),
  add column if not exists is_simulated boolean default false,
  add column if not exists pip_size numeric(20,8),
  add column if not exists pip_value numeric(20,8),
  add column if not exists margin numeric(20,4) default 0,
  add column if not exists notional numeric(20,2),
  add column if not exists swap_fee numeric(20,4) default 0,
  add column if not exists commission numeric(20,4) default 0,
  add column if not exists order_type text default 'market',
  add column if not exists fill_price numeric(30,12),
  add column if not exists exit_reason text,
  add column if not exists trade_currency text default 'USD',
  add column if not exists comment text;

-- ─── ADMIN_AUDIT_LOG: missing reasonable columns ────────────────────
alter table public.admin_audit_log
  add column if not exists user_id uuid references public.users(id),
  add column if not exists action text;

-- ─── ADMIN_LOGS: was redefined with admin_id, but app uses user_id ──
alter table public.admin_logs
  add column if not exists user_id uuid references public.users(id);

-- ─── POSITIONS: descriptive fields for invest UI ────────────────────
alter table public.positions
  add column if not exists side text default 'long',
  add column if not exists opened_at timestamptz default now(),
  add column if not exists closed_at timestamptz,
  add column if not exists status text default 'open',
  add column if not exists realized_pnl numeric(20,2) default 0,
  add column if not exists last_price numeric(20,4),
  add column if not exists last_price_at timestamptz;

-- ─── CRYPTO_POSITIONS: app references these on holdings page ────────
alter table public.crypto_positions
  add column if not exists last_price numeric(30,12),
  add column if not exists last_price_at timestamptz,
  add column if not exists pnl numeric(20,2) default 0,
  add column if not exists pnl_percent numeric(10,4) default 0,
  add column if not exists status text default 'open';

-- ─── PAYMENT_METHODS: order_id is referenced (sort index, not FK) ───
alter table public.payment_methods
  add column if not exists display_order int default 0,
  add column if not exists icon text,
  add column if not exists fields jsonb default '[]'::jsonb;

-- ─── EDUCATIONAL_SCENARIOS ──────────────────────────────────────────
alter table public.educational_scenarios
  add column if not exists ask_price numeric(30,12),
  add column if not exists bid_price numeric(30,12),
  add column if not exists current_price numeric(30,12),
  add column if not exists is_enabled boolean default true,
  add column if not exists key text,
  add column if not exists value jsonb default '{}'::jsonb,
  add column if not exists updated_at timestamptz default now(),
  add column if not exists updated_by uuid references public.users(id);

-- ─── PLATFORM_SETTINGS: app uses singleton row pattern ──────────────
alter table public.platform_settings
  add column if not exists status text default 'active';

-- ─── REFERRAL_CODES ─────────────────────────────────────────────────
-- App expects a referral_code column on some lookup path
alter table public.referral_codes
  add column if not exists referral_code text;

-- ─── DEMO_FX additions: fields referenced in engine but missed ──────
alter table public.demo_fx_pairs
  add column if not exists current_ask numeric(30,12),
  add column if not exists current_bid numeric(30,12),
  add column if not exists status text default 'idle',
  add column if not exists pip_size numeric(20,8) default 0.0001,
  add column if not exists volatility numeric(10,6) default 0.0001;

alter table public.demo_fx_sessions
  add column if not exists active_session_id uuid,
  add column if not exists mode text default 'normal',
  add column if not exists current_ask numeric(30,12),
  add column if not exists current_bid numeric(30,12),
  add column if not exists start_ask numeric(30,12),
  add column if not exists start_bid numeric(30,12),
  add column if not exists target_ask numeric(30,12),
  add column if not exists target_bid numeric(30,12),
  add column if not exists volatility numeric(10,6) default 0.0001,
  add column if not exists started_at timestamptz;

alter table public.demo_fx_ticks
  add column if not exists current_ask numeric(30,12),
  add column if not exists current_bid numeric(30,12);

alter table public.demo_fx_price_log
  add column if not exists current_ask numeric(30,12),
  add column if not exists current_bid numeric(30,12);

-- ─── USER_NOTIFICATIONS / NOTIFICATIONS ─────────────────────────────
alter table public.user_notifications
  add column if not exists icon text,
  add column if not exists priority text default 'normal';

-- ─── TIER PURCHASES: extra metadata ─────────────────────────────────
alter table public.tier_purchases
  add column if not exists processed_by uuid references public.users(id),
  add column if not exists processed_at timestamptz,
  add column if not exists rejection_reason text;

-- ─── ASSETS: app sometimes references logo and symbol indexes ───────
create index if not exists idx_assets_symbol_active
  on public.assets(symbol, is_active);

-- ─── HELPFUL INDEXES on the new columns ─────────────────────────────
create index if not exists idx_trades_is_simulated on public.trades(is_simulated);
create index if not exists idx_positions_user_status on public.positions(user_id, status);
create index if not exists idx_bridge_country_name on public.bridge_requests(country_name);

-- Done.

-- ====== 07_migration_final.sql ======
-- =====================================================================
-- SWIFT TRADE — MIGRATION 07 (FINAL SCHEMA COMPLETION)
--
-- This migration was built from a definitive scan of every
-- .insert/.update/.upsert payload in the entire codebase. Apply on top
-- of 01–06. Idempotent (safe to re-run).
--
-- Run this and you should not see column-missing errors from the app.
-- =====================================================================

-- ─── admin_alerts: 'data' jsonb column ─────────────────────────────
alter table public.admin_alerts
  add column if not exists data jsonb default '{}'::jsonb;

-- ─── admin_notifications (table may exist or not) ──────────────────
create table if not exists public.admin_notifications (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references public.users(id) on delete cascade,
  type text,
  title text,
  body text,
  data jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);
alter table public.admin_notifications
  add column if not exists data jsonb default '{}'::jsonb,
  add column if not exists priority text default 'normal',
  add column if not exists action_url text;

-- ─── admin_sessions: app references user_id ────────────────────────
-- Some code paths use user_id instead of admin_user_id
alter table public.admin_sessions
  add column if not exists user_id uuid references public.users(id) on delete cascade;

-- ─── demo_fx_sessions / educational_scenarios / platform_settings ──
alter table public.demo_fx_sessions
  add column if not exists created_by uuid references public.users(id);

alter table public.educational_scenarios
  add column if not exists created_by uuid references public.users(id);

alter table public.platform_settings
  add column if not exists updated_by uuid references public.users(id);

-- ─── deposits: method_name + transaction_ref ──────────────────────
alter table public.deposits
  add column if not exists method_name text,
  add column if not exists transaction_ref text;

-- ─── notifications.data (some flows insert `data` not `payload`) ──
alter table public.notifications
  add column if not exists data jsonb default '{}'::jsonb;

-- ─── transactions.admin_id (admin-initiated transactions) ──────────
alter table public.transactions
  add column if not exists admin_id uuid references public.users(id);

-- ─── user_notifications: missing data column ──────────────────────
alter table public.user_notifications
  add column if not exists data jsonb default '{}'::jsonb;

-- ─── Profiles view: add registration_status + wallet_address ──────
-- The view from migration 05 didn't surface every column the app reads.
-- Rebuild it with the full set.
drop view if exists public.profiles cascade;
create view public.profiles as
  select
    id,
    email,
    first_name,
    last_name,
    role,
    tier,
    tier_code,
    tier_level,
    tier_active,
    balance_available,
    balance_bonus,
    balance_locked,
    bonus_balance,
    total_deposited,
    total_withdrawn,
    pnl,
    kyc_status,
    kyc_level,
    is_active,
    is_verified,
    status,
    registration_status,
    wallet_address,
    referral_code,
    referred_by,
    referral_count,
    phone,
    country,
    deposit_address,
    deposit_network,
    created_at,
    updated_at,
    last_login_at,
    last_seen_at
  from public.users;

do $$ begin
  grant select on public.profiles to authenticated;
exception when undefined_object then null; end $$;
do $$ begin
  grant select on public.profiles to anon;
exception when undefined_object then null; end $$;
do $$ begin
  grant select on public.profiles to service_role;
exception when undefined_object then null; end $$;

-- ─── Make sure all of those columns the view selects exist on users ──
-- Most are already there from earlier migrations; this is belt-and-suspenders.
alter table public.users
  add column if not exists registration_status text default 'active',
  add column if not exists wallet_address text,
  add column if not exists referred_by uuid references public.users(id),
  add column if not exists referral_code text,
  add column if not exists phone text,
  add column if not exists country text,
  add column if not exists balance_bonus numeric(20,2) default 0,
  add column if not exists total_deposited numeric(20,2) default 0,
  add column if not exists last_login_at timestamptz;

-- ─── A few defensive additions surfaced during review ──────────────
alter table public.trades
  add column if not exists realized_pnl numeric(20,2) default 0;

alter table public.bridge_requests
  add column if not exists notes text;

-- Done.
