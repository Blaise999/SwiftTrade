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
