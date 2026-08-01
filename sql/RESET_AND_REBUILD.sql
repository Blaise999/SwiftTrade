-- ============================================================================
-- RESET_AND_REBUILD.sql  —  SwiftTrade clean rebuild
-- ============================================================================
-- ⚠️  DESTRUCTIVE. This DROPS the entire `public` schema and everything in it
--     (all tables + ALL DATA) and rebuilds one clean, consistent schema.
--     Your Supabase Auth users (auth schema) are NOT dropped.
--     Run in the Supabase SQL editor. There is no undo.
-- ============================================================================

drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all    on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables    to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ============================================================================
-- BASE SCHEMA  (your supabase/01_schema.sql — the complete, idempotent schema)
-- ============================================================================
-- =====================================================================
-- SWIFT TRADE — COMPLETE SCHEMA (idempotent, safe to re-run)
-- =====================================================================
-- Run this in the Supabase SQL Editor as a single transaction.
-- Creates: 40+ tables, indexes, RLS, helper functions, triggers,
-- realtime publications, and storage buckets.
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- 1. CORE: USERS
-- =====================================================================
create table if not exists public.users (
    id uuid primary key default uuid_generate_v4(),
    email text unique not null,
    first_name text,
    last_name text,
    phone text,
    avatar_url text,
    profile_image_url text,
    country text,
    date_of_birth date,
    role text default 'user' check (role in ('user', 'admin', 'support')),
    is_admin boolean default false,
    tier text default 'basic' check (tier in ('basic','starter','trader','pro','professional','elite','vip','sovereign')),
    tier_purchased boolean default false,
    tier_id integer,
    balance_available decimal(20,2) default 0,
    balance_pending decimal(20,2) default 0,
    balance_bonus decimal(20,2) default 0,
    total_deposited decimal(20,2) default 0,
    signup_bonus_credited boolean default false,
    kyc_status text default 'none' check (kyc_status in ('none','pending','approved','verified','rejected')),
    kyc_documents_status text default 'pending',
    registration_status text default 'pending_kyc' check (registration_status in ('pending_verification','pending_kyc','pending_wallet','complete')),
    email_verified boolean default false,
    phone_verified boolean default false,
    two_factor_enabled boolean default false,
    wallet_address text,
    wallet_type text,
    shield_mode boolean default false,
    is_active boolean default true,
    referral_code text unique,
    referred_by uuid references public.users(id),
    last_login_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index if not exists idx_users_email     on public.users(email);
create index if not exists idx_users_role      on public.users(role);
create index if not exists idx_users_referral  on public.users(referral_code);
create index if not exists idx_users_referred  on public.users(referred_by);

-- Mirror "profiles" view some legacy code reads
create or replace view public.profiles as
  select id, email, first_name, last_name, phone, avatar_url, role, tier,
         kyc_status, wallet_address, created_at, updated_at
  from public.users;

-- =====================================================================
-- 2. AUTH SUPPORTING TABLES
-- =====================================================================
create table if not exists public.email_otps (
    id uuid primary key default uuid_generate_v4(),
    email text not null,
    code text not null,
    purpose text default 'signup' check (purpose in ('signup','login','reset','verify')),
    used boolean default false,
    expires_at timestamptz not null,
    created_at timestamptz default now()
);
create index if not exists idx_email_otps_email on public.email_otps(email);
create index if not exists idx_email_otps_expires on public.email_otps(expires_at);

create table if not exists public.kyc_documents (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    document_type text check (document_type in ('passport','id_card','drivers_license','utility_bill','selfie','other')),
    file_url text,
    file_path text,
    file_name text,
    status text default 'pending' check (status in ('pending','approved','rejected')),
    rejection_reason text,
    submitted_at timestamptz default now(),
    reviewed_at timestamptz,
    reviewed_by uuid references public.users(id),
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);
create index if not exists idx_kyc_user on public.kyc_documents(user_id);
create index if not exists idx_kyc_status on public.kyc_documents(status);

-- =====================================================================
-- 3. PAYMENT METHODS / DEPOSITS / WITHDRAWALS
-- =====================================================================
create table if not exists public.payment_methods (
    id uuid primary key default uuid_generate_v4(),
    type text not null check (type in ('crypto', 'bank', 'processor')),
    name text not null,
    symbol text,
    network text,
    address text,
    icon text,
    min_amount decimal(20,2) default 0,
    confirmations int default 6,
    active boolean default true,
    display_order int default 0,
    created_at timestamptz default now(),
    unique (symbol, network)
);

create table if not exists public.platform_wallets (
    id uuid primary key default uuid_generate_v4(),
    asset text not null,
    network text,
    address text not null,
    label text,
    is_active boolean default true,
    qr_url text,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (asset, network, address)
);

create table if not exists public.user_deposit_wallets (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    asset text not null,
    network text,
    address text not null,
    is_active boolean default true,
    created_at timestamptz default now()
);
create index if not exists idx_user_deposit_wallets_user on public.user_deposit_wallets(user_id);

create table if not exists public.deposits (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    method text not null check (method in ('crypto', 'bank', 'processor')),
    amount decimal(20,2) not null,
    currency text default 'USD',
    network text,
    tx_hash text,
    proof_url text,
    status text default 'pending' check (status in ('pending','approved','confirmed','rejected','expired')),
    notes text,
    admin_notes text,
    confirmed_by uuid references public.users(id),
    confirmed_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index if not exists idx_deposits_user on public.deposits(user_id);
create index if not exists idx_deposits_status on public.deposits(status);

create table if not exists public.withdrawals (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    method text not null check (method in ('crypto', 'bank', 'processor')),
    amount decimal(20,2) not null,
    currency text default 'USD',
    network text,
    address text,
    bank_details jsonb,
    fee decimal(20,2) default 0,
    net_amount decimal(20,2),
    tx_hash text,
    status text default 'pending' check (status in ('pending','approved','processing','completed','rejected','failed')),
    notes text,
    admin_notes text,
    processed_by uuid references public.users(id),
    processed_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index if not exists idx_withdrawals_user on public.withdrawals(user_id);
create index if not exists idx_withdrawals_status on public.withdrawals(status);

-- =====================================================================
-- 4. TIER PURCHASES & TRANSACTIONS
-- =====================================================================
create table if not exists public.tier_purchases (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    tier text,
    tier_code text,
    tier_level int,
    price_amount decimal(20,2) not null,
    bonus_amount decimal(20,2) default 0,
    currency text default 'USD',
    payment_asset text,
    payment_network text,
    payment_address text,
    address_shown text,
    tx_hash text,
    proof_url text,
    status text default 'pending' check (status in ('pending','submitted','approved','rejected','expired')),
    rejected_reason text,
    approved_by uuid references public.users(id),
    approved_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index if not exists idx_tier_purchases_user on public.tier_purchases(user_id);
create index if not exists idx_tier_purchases_status on public.tier_purchases(status);

create table if not exists public.transactions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    type text not null check (type in ('deposit','withdrawal','trade','tier_bonus','signup_bonus','referral_bonus','bonus','adjustment','fee','refund','swift_bridge')),
    amount decimal(20,2) not null,
    currency text default 'USD',
    balance_after decimal(20,2),
    description text,
    reference_id uuid,
    metadata jsonb default '{}'::jsonb,
    status text default 'completed',
    created_at timestamptz default now()
);
create index if not exists idx_transactions_user on public.transactions(user_id);
create index if not exists idx_transactions_type on public.transactions(type);
create index if not exists idx_transactions_created on public.transactions(created_at desc);

-- =====================================================================
-- 5. TRADING — SPOT (crypto, fx, stocks)
-- =====================================================================
create table if not exists public.trades (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    market_type text default 'crypto' check (market_type in ('crypto','forex','fx','stocks','commodities')),
    asset_type text,
    type text default 'spot' check (type in ('spot','margin','futures','demo')),
    symbol text,
    pair text,
    direction text check (direction in ('buy','sell','long','short')),
    side text check (side in ('buy','sell','long','short')),
    quantity decimal(30,12),
    amount decimal(30,12),
    price decimal(30,12),
    entry_price decimal(30,12),
    exit_price decimal(30,12),
    leverage int default 1,
    take_profit decimal(30,12),
    stop_loss decimal(30,12),
    profit_loss decimal(20,2) default 0,
    pnl decimal(20,2) default 0,
    fee decimal(20,2) default 0,
    status text default 'open' check (status in ('open','closed','cancelled','pending')),
    opened_at timestamptz default now(),
    closed_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index if not exists idx_trades_user on public.trades(user_id);
create index if not exists idx_trades_status on public.trades(status);
create index if not exists idx_trades_market on public.trades(market_type);
create index if not exists idx_trades_created on public.trades(created_at desc);

create table if not exists public.crypto_positions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    symbol text not null,
    quantity decimal(30,12) default 0,
    avg_buy_price decimal(30,12),
    realized_pnl decimal(20,2) default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (user_id, symbol)
);
create index if not exists idx_crypto_positions_user on public.crypto_positions(user_id);

create table if not exists public.user_trading_data (
    user_id uuid primary key references public.users(id) on delete cascade,
    fx_balance decimal(20,2) default 0,
    crypto_balance decimal(20,2) default 0,
    stocks_balance decimal(20,2) default 0,
    portfolio_state jsonb default '{}'::jsonb,
    updated_at timestamptz default now()
);

create table if not exists public.trading_sessions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    market_type text not null,
    started_at timestamptz default now(),
    ended_at timestamptz,
    realized_pnl decimal(20,2) default 0,
    trades_count int default 0,
    metadata jsonb default '{}'::jsonb
);
create index if not exists idx_trading_sessions_user on public.trading_sessions(user_id);

create table if not exists public.trade_outcomes (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    trade_id uuid references public.trades(id) on delete cascade,
    outcome text check (outcome in ('win','loss','breakeven','admin_force_win','admin_force_loss')),
    forced_by uuid references public.users(id),
    notes text,
    created_at timestamptz default now()
);
create index if not exists idx_trade_outcomes_user on public.trade_outcomes(user_id);

-- Investments table kept as stub for backward-compat with old code paths
create table if not exists public.investments (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    plan text,
    amount decimal(20,2),
    status text default 'active',
    created_at timestamptz default now()
);

-- =====================================================================
-- 6. CUSTOM PAIRS / PRICE OVERRIDES / MARKET CACHE / PATTERNS
-- =====================================================================
create table if not exists public.custom_pairs (
    id uuid primary key default uuid_generate_v4(),
    symbol text unique not null,
    base_asset text,
    quote_asset text,
    label text,
    market_type text default 'crypto',
    is_active boolean default true,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

create table if not exists public.price_overrides (
    id uuid primary key default uuid_generate_v4(),
    symbol text not null,
    market_type text,
    override_price decimal(30,12),
    expires_at timestamptz,
    created_by uuid references public.users(id),
    created_at timestamptz default now()
);
create index if not exists idx_price_overrides_symbol on public.price_overrides(symbol);

create table if not exists public.market_cache (
    key text primary key,
    payload jsonb,
    expires_at timestamptz,
    updated_at timestamptz default now()
);

create table if not exists public.market_patterns (
    id uuid primary key default uuid_generate_v4(),
    symbol text not null,
    pattern text,
    confidence decimal(5,2),
    detected_at timestamptz default now(),
    metadata jsonb default '{}'::jsonb
);

-- =====================================================================
-- 7. DEMO FX (educational)
-- =====================================================================
create table if not exists public.demo_fx_pairs (
    id uuid primary key default uuid_generate_v4(),
    symbol text unique not null,
    base text, quote text,
    current_bid decimal(30,12),
    current_ask decimal(30,12),
    pip_size decimal(30,12) default 0.0001,
    is_active boolean default true,
    created_at timestamptz default now()
);

create table if not exists public.demo_fx_sessions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade,
    started_at timestamptz default now(),
    ended_at timestamptz,
    state jsonb default '{}'::jsonb,
    metadata jsonb default '{}'::jsonb
);

create table if not exists public.demo_fx_candles (
    id uuid primary key default uuid_generate_v4(),
    session_id uuid references public.demo_fx_sessions(id) on delete cascade,
    pair_id uuid references public.demo_fx_pairs(id) on delete cascade,
    open decimal(30,12), high decimal(30,12), low decimal(30,12), close decimal(30,12),
    timeframe text,
    ts timestamptz default now()
);
create index if not exists idx_demo_fx_candles_session on public.demo_fx_candles(session_id);

create table if not exists public.demo_fx_ticks (
    id uuid primary key default uuid_generate_v4(),
    session_id uuid references public.demo_fx_sessions(id) on delete cascade,
    pair_id uuid references public.demo_fx_pairs(id) on delete cascade,
    bid decimal(30,12), ask decimal(30,12),
    ts timestamptz default now()
);
create index if not exists idx_demo_fx_ticks_session on public.demo_fx_ticks(session_id);

create table if not exists public.demo_fx_trades (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade,
    session_id uuid references public.demo_fx_sessions(id) on delete cascade,
    pair_id uuid references public.demo_fx_pairs(id) on delete cascade,
    side text check (side in ('buy','sell','long','short')),
    quantity decimal(30,12),
    entry_price decimal(30,12), exit_price decimal(30,12),
    take_profit decimal(30,12), stop_loss decimal(30,12),
    pnl decimal(20,2) default 0,
    status text default 'open' check (status in ('open','closed','cancelled')),
    opened_at timestamptz default now(),
    closed_at timestamptz
);
create index if not exists idx_demo_fx_trades_user on public.demo_fx_trades(user_id);

create table if not exists public.demo_fx_scenarios (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    metadata jsonb default '{}'::jsonb,
    is_active boolean default true,
    created_at timestamptz default now()
);

create table if not exists public.demo_fx_scenario_steps (
    id uuid primary key default uuid_generate_v4(),
    scenario_id uuid references public.demo_fx_scenarios(id) on delete cascade,
    step_order int default 0,
    instruction text,
    expected_action text,
    metadata jsonb default '{}'::jsonb
);
create index if not exists idx_demo_fx_steps_scenario on public.demo_fx_scenario_steps(scenario_id);

create table if not exists public.demo_fx_price_log (
    id bigserial primary key,
    pair_id uuid references public.demo_fx_pairs(id) on delete cascade,
    bid decimal(30,12), ask decimal(30,12),
    ts timestamptz default now()
);
create index if not exists idx_demo_fx_price_log_ts on public.demo_fx_price_log(ts desc);

create table if not exists public.educational_scenarios (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    description text,
    market_type text,
    payload jsonb default '{}'::jsonb,
    is_active boolean default true,
    created_at timestamptz default now()
);

-- =====================================================================
-- 8. REFERRALS
-- =====================================================================
create table if not exists public.referral_codes (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade,
    code text unique not null,
    uses_count int default 0,
    total_earned decimal(20,2) default 0,
    is_active boolean default true,
    created_at timestamptz default now()
);
create index if not exists idx_referral_codes_user on public.referral_codes(user_id);

create table if not exists public.referrals (
    id uuid primary key default uuid_generate_v4(),
    referrer_id uuid references public.users(id) on delete cascade,
    referred_user_id uuid references public.users(id) on delete cascade,
    code_used text,
    bonus_amount decimal(20,2) default 0,
    status text default 'pending' check (status in ('pending','credited','rejected')),
    credited_at timestamptz,
    created_at timestamptz default now(),
    unique (referrer_id, referred_user_id)
);
create index if not exists idx_referrals_referrer on public.referrals(referrer_id);

-- =====================================================================
-- 9. NOTIFICATIONS (user + admin)
-- =====================================================================
create table if not exists public.notifications (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade,
    title text,
    message text,
    type text default 'info',
    link text,
    read boolean default false,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, read);
create index if not exists idx_notifications_created on public.notifications(created_at desc);

-- "user_notifications" alias used by Bridge realtime
create table if not exists public.user_notifications (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    title text,
    message text,
    type text default 'info',
    link text,
    read boolean default false,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);
create index if not exists idx_user_notifications_user on public.user_notifications(user_id, read);

create table if not exists public.admin_notifications (
    id uuid primary key default uuid_generate_v4(),
    title text,
    message text,
    type text default 'info',
    link text,
    read boolean default false,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);
create index if not exists idx_admin_notifications_created on public.admin_notifications(created_at desc);

create table if not exists public.admin_alerts (
    id uuid primary key default uuid_generate_v4(),
    kind text not null,                                  -- 'bridge_request' | 'kyc' | 'deposit' | 'withdrawal' | 'tier_purchase' | etc.
    payload jsonb default '{}'::jsonb,
    severity text default 'normal' check (severity in ('info','normal','high','critical')),
    related_id uuid,
    seen boolean default false,
    created_at timestamptz default now()
);
create index if not exists idx_admin_alerts_kind on public.admin_alerts(kind);
create index if not exists idx_admin_alerts_seen on public.admin_alerts(seen);
create index if not exists idx_admin_alerts_created on public.admin_alerts(created_at desc);

-- =====================================================================
-- 10. ADMIN: SESSIONS, AUDIT, LOGS, SETTINGS
-- =====================================================================
create table if not exists public.admin_sessions (
    id uuid primary key default uuid_generate_v4(),
    admin_id uuid references public.users(id) on delete cascade,
    token text,
    ip text,
    user_agent text,
    expires_at timestamptz,
    created_at timestamptz default now()
);
create index if not exists idx_admin_sessions_admin on public.admin_sessions(admin_id);

create table if not exists public.admin_audit_log (
    id uuid primary key default uuid_generate_v4(),
    admin_id uuid references public.users(id) on delete set null,
    action text,
    target_type text,
    target_id uuid,
    payload jsonb default '{}'::jsonb,
    ip text,
    created_at timestamptz default now()
);
create index if not exists idx_admin_audit_admin on public.admin_audit_log(admin_id);
create index if not exists idx_admin_audit_created on public.admin_audit_log(created_at desc);

create table if not exists public.admin_logs (
    id uuid primary key default uuid_generate_v4(),
    admin_id uuid references public.users(id) on delete set null,
    event text,
    detail text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);
create index if not exists idx_admin_logs_created on public.admin_logs(created_at desc);

create table if not exists public.admin_settings (
    key text primary key,
    value jsonb,
    description text,
    updated_by uuid references public.users(id),
    updated_at timestamptz default now()
);

create table if not exists public.platform_settings (
    key text primary key,
    value jsonb,
    description text,
    updated_at timestamptz default now()
);

-- =====================================================================
-- 11. SUPPORT (tickets + messages)
-- =====================================================================
create table if not exists public.support_tickets (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade,
    subject text,
    category text,
    priority text default 'normal' check (priority in ('low','normal','high','urgent')),
    status text default 'open' check (status in ('open','pending','answered','closed')),
    assigned_to uuid references public.users(id),
    last_message_at timestamptz,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index if not exists idx_support_tickets_user on public.support_tickets(user_id);
create index if not exists idx_support_tickets_status on public.support_tickets(status);

create table if not exists public.support_messages (
    id uuid primary key default uuid_generate_v4(),
    ticket_id uuid references public.support_tickets(id) on delete cascade,
    sender_id uuid references public.users(id) on delete cascade,
    sender_role text default 'user' check (sender_role in ('user','admin','support')),
    body text,
    attachments jsonb default '[]'::jsonb,
    created_at timestamptz default now()
);
create index if not exists idx_support_messages_ticket on public.support_messages(ticket_id);

-- =====================================================================
-- 12. SHIELD MODE (admin protection signal)
-- =====================================================================
create table if not exists public.shield_events (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade,
    enabled boolean,
    reason text,
    triggered_by uuid references public.users(id),
    created_at timestamptz default now()
);
create index if not exists idx_shield_events_user on public.shield_events(user_id);

-- =====================================================================
-- 13. SWIFTBRIDGE — bureau de change concierge feature
-- =====================================================================
create table if not exists public.bridge_countries (
    code text primary key,                    -- ISO 3166-1 alpha-2 ('HK','SG','GB',...)
    name text not null,
    currency text not null,
    currency_symbol text,
    flag_emoji text,
    min_local decimal(20,2) default 0,
    max_local decimal(20,2) default 100000000,
    is_active boolean default true,
    display_order int default 0,
    created_at timestamptz default now()
);

create table if not exists public.bridge_requests (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    country_code text not null references public.bridge_countries(code),
    local_currency text not null,
    local_amount decimal(20,2) not null,
    target_asset text not null default 'USDT',  -- USDT/USDC/BTC/ETH/USD
    target_network text,                        -- TRC-20 / ERC-20 / etc.
    fx_rate decimal(20,6),                      -- 1 USD = ? local at submit time
    estimated_usd decimal(20,2),
    estimated_target decimal(30,12),
    status text not null default 'awaiting_admin'
      check (status in ('awaiting_admin','awaiting_payment','awaiting_verification','completed','rejected','expired','cancelled')),
    -- Admin response
    admin_payout jsonb default '{}'::jsonb,    -- {bank_name, account_name, account_number, swift, iban, mobile_money, reference, instructions, ...}
    admin_response_message text,
    responded_by uuid references public.users(id),
    responded_at timestamptz,
    -- Proof of payment
    proof_url text,
    proof_uploaded_at timestamptz,
    proof_metadata jsonb default '{}'::jsonb,
    -- Verification / completion
    final_credit_usd decimal(20,2),
    final_credit_target decimal(30,12),
    verified_by uuid references public.users(id),
    verified_at timestamptz,
    rejection_reason text,
    expires_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index if not exists idx_bridge_requests_user on public.bridge_requests(user_id);
create index if not exists idx_bridge_requests_status on public.bridge_requests(status);
create index if not exists idx_bridge_requests_created on public.bridge_requests(created_at desc);

-- =====================================================================
-- 14. STORAGE BUCKETS
-- =====================================================================
insert into storage.buckets (id, name, public)
  values ('bridge-proofs','bridge-proofs', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('kyc-documents','kyc-documents', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('avatars','avatars', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('deposit-proofs','deposit-proofs', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('tier-proofs','tier-proofs', false)
  on conflict (id) do nothing;

-- =====================================================================
-- 15. HELPERS / FUNCTIONS / TRIGGERS
-- =====================================================================

-- updated_at trigger
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'users','deposits','withdrawals','tier_purchases','trades',
    'platform_wallets','support_tickets','bridge_requests'
  ]) loop
    execute format('drop trigger if exists trg_%I_updated on public.%I', t, t);
    execute format('create trigger trg_%I_updated before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- is_admin() helper used by RLS
create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and (is_admin = true or role = 'admin')
  );
$$;

-- credit USD to user available balance + log a transaction
create or replace function public.credit_user_usd(
  p_user_id uuid, p_amount decimal, p_description text default null,
  p_type text default 'swift_bridge', p_reference uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_new_balance decimal;
begin
  update public.users
     set balance_available = coalesce(balance_available,0) + p_amount,
         updated_at = now()
   where id = p_user_id
   returning balance_available into v_new_balance;

  insert into public.transactions(user_id, type, amount, balance_after, description, reference_id)
  values (p_user_id, p_type, p_amount, v_new_balance, p_description, p_reference);
end; $$;

-- generate referral code on insert
create or replace function public.gen_referral_code() returns trigger
language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := upper(substr(replace(new.id::text,'-',''),1,8));
  end if;
  return new;
end; $$;

drop trigger if exists trg_users_referral_code on public.users;
create trigger trg_users_referral_code before insert on public.users
  for each row execute function public.gen_referral_code();

-- fan-out trigger: when a bridge_request is inserted/changes, raise admin alert
create or replace function public.fan_out_bridge_alert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (TG_OP = 'INSERT') then
    insert into public.admin_alerts(kind, related_id, payload, severity)
    values ('bridge_request', new.id,
      jsonb_build_object('user_id', new.user_id, 'country', new.country_code,
                         'local_amount', new.local_amount, 'currency', new.local_currency,
                         'status', new.status),
      'high');
  elsif (TG_OP = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.admin_alerts(kind, related_id, payload, severity)
    values ('bridge_request', new.id,
      jsonb_build_object('user_id', new.user_id, 'country', new.country_code,
                         'old_status', old.status, 'new_status', new.status),
      'normal');
    -- notify user of status changes
    if new.status in ('awaiting_payment','completed','rejected') then
      insert into public.user_notifications(user_id, title, message, type, link)
      values (new.user_id,
        case new.status
          when 'awaiting_payment' then 'SwiftBridge: payout details ready'
          when 'completed' then 'SwiftBridge: funds credited'
          when 'rejected' then 'SwiftBridge: request rejected'
        end,
        'Bridge request '||substring(new.id::text,1,8)||' status: '||new.status,
        'info', '/dashboard/bridge');
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_bridge_alert on public.bridge_requests;
create trigger trg_bridge_alert after insert or update on public.bridge_requests
  for each row execute function public.fan_out_bridge_alert();

-- =====================================================================
-- 16. ROW-LEVEL SECURITY
-- =====================================================================
alter table public.users                  enable row level security;
alter table public.email_otps             enable row level security;
alter table public.kyc_documents          enable row level security;
alter table public.payment_methods        enable row level security;
alter table public.platform_wallets       enable row level security;
alter table public.user_deposit_wallets   enable row level security;
alter table public.deposits               enable row level security;
alter table public.withdrawals            enable row level security;
alter table public.tier_purchases         enable row level security;
alter table public.transactions           enable row level security;
alter table public.trades                 enable row level security;
alter table public.crypto_positions       enable row level security;
alter table public.user_trading_data      enable row level security;
alter table public.trading_sessions       enable row level security;
alter table public.trade_outcomes         enable row level security;
alter table public.investments            enable row level security;
alter table public.custom_pairs           enable row level security;
alter table public.price_overrides        enable row level security;
alter table public.market_cache           enable row level security;
alter table public.market_patterns        enable row level security;
alter table public.demo_fx_pairs          enable row level security;
alter table public.demo_fx_sessions       enable row level security;
alter table public.demo_fx_candles        enable row level security;
alter table public.demo_fx_ticks          enable row level security;
alter table public.demo_fx_trades         enable row level security;
alter table public.demo_fx_scenarios      enable row level security;
alter table public.demo_fx_scenario_steps enable row level security;
alter table public.demo_fx_price_log      enable row level security;
alter table public.educational_scenarios  enable row level security;
alter table public.referral_codes         enable row level security;
alter table public.referrals              enable row level security;
alter table public.notifications          enable row level security;
alter table public.user_notifications     enable row level security;
alter table public.admin_notifications    enable row level security;
alter table public.admin_alerts           enable row level security;
alter table public.admin_sessions         enable row level security;
alter table public.admin_audit_log        enable row level security;
alter table public.admin_logs             enable row level security;
alter table public.admin_settings         enable row level security;
alter table public.platform_settings      enable row level security;
alter table public.support_tickets        enable row level security;
alter table public.support_messages       enable row level security;
alter table public.shield_events          enable row level security;
alter table public.bridge_countries       enable row level security;
alter table public.bridge_requests        enable row level security;

-- USERS
drop policy if exists "users self select" on public.users;
create policy "users self select" on public.users for select
  using (auth.uid() = id or public.is_admin());
drop policy if exists "users self update" on public.users;
create policy "users self update" on public.users for update
  using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "admin manage users" on public.users;
create policy "admin manage users" on public.users for all
  using (public.is_admin()) with check (public.is_admin());

-- generic "user owns row" policies via macro
do $$ declare t text; begin
  for t in select unnest(array[
    'kyc_documents','user_deposit_wallets','deposits','withdrawals',
    'tier_purchases','transactions','trades','crypto_positions',
    'user_trading_data','trading_sessions','trade_outcomes',
    'investments','demo_fx_sessions','demo_fx_trades',
    'referral_codes','notifications','user_notifications',
    'support_tickets','shield_events','bridge_requests'
  ]) loop
    execute format('drop policy if exists "%s self access" on public.%I', t, t);
    execute format('create policy "%s self access" on public.%I for all
      using (auth.uid() = user_id or public.is_admin())
      with check (auth.uid() = user_id or public.is_admin())', t, t);
  end loop;
end $$;

-- referrals: referrer or referred user can see; admin can all
drop policy if exists "referrals referrer select" on public.referrals;
create policy "referrals referrer select" on public.referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referred_user_id or public.is_admin());
drop policy if exists "referrals admin write" on public.referrals;
create policy "referrals admin write" on public.referrals for all
  using (public.is_admin()) with check (public.is_admin());

-- support_messages: allow ticket owner OR admin
drop policy if exists "support messages access" on public.support_messages;
create policy "support messages access" on public.support_messages for all
  using (
    public.is_admin() or auth.uid() = sender_id or
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  )
  with check (
    public.is_admin() or auth.uid() = sender_id or
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

-- email_otps: open insert, restricted select to matching email (handled in app)
drop policy if exists "email_otps insert" on public.email_otps;
create policy "email_otps insert" on public.email_otps for insert with check (true);
drop policy if exists "email_otps select" on public.email_otps;
create policy "email_otps select" on public.email_otps for select using (true);
drop policy if exists "email_otps update" on public.email_otps;
create policy "email_otps update" on public.email_otps for update using (true);

-- public-readable references: payment_methods, platform_wallets, bridge_countries,
-- demo_fx_pairs, custom_pairs, market_cache, market_patterns, educational_scenarios,
-- price_overrides, platform_settings
do $$ declare t text; begin
  for t in select unnest(array[
    'payment_methods','platform_wallets','bridge_countries','demo_fx_pairs',
    'demo_fx_scenarios','demo_fx_scenario_steps','demo_fx_candles','demo_fx_ticks',
    'demo_fx_price_log','custom_pairs','price_overrides','market_cache',
    'market_patterns','educational_scenarios','platform_settings'
  ]) loop
    execute format('drop policy if exists "%s public read" on public.%I', t, t);
    execute format('create policy "%s public read" on public.%I for select using (true)', t, t);
    execute format('drop policy if exists "%s admin write" on public.%I', t, t);
    execute format('create policy "%s admin write" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- admin-only: alerts, audit log, sessions, settings, admin_notifications, admin_logs
do $$ declare t text; begin
  for t in select unnest(array[
    'admin_alerts','admin_audit_log','admin_sessions','admin_settings',
    'admin_logs','admin_notifications'
  ]) loop
    execute format('drop policy if exists "%s admin only" on public.%I', t, t);
    execute format('create policy "%s admin only" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- Storage policies
drop policy if exists "bridge proofs owner" on storage.objects;
create policy "bridge proofs owner" on storage.objects for all
  using (
    bucket_id = 'bridge-proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  )
  with check (
    bucket_id = 'bridge-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "kyc docs owner" on storage.objects;
create policy "kyc docs owner" on storage.objects for all
  using (
    bucket_id = 'kyc-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  )
  with check (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects for select
  using (bucket_id = 'avatars');
drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- 17. REALTIME PUBLICATIONS
-- =====================================================================
do $$ declare t text; begin
  for t in select unnest(array[
    'bridge_requests','admin_alerts','admin_notifications',
    'user_notifications','notifications','deposits','withdrawals',
    'tier_purchases','support_tickets','support_messages','trades'
  ]) loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Done.

-- ============================================================================
-- RECONCILE  —  bring the base in line with what the RUNTIME CODE uses.
-- All idempotent (IF NOT EXISTS / OR REPLACE).
-- ============================================================================

-- 1) equities positions table (used by /api/invest/order + net-worth; missing in base)
create table if not exists public.positions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id) on delete cascade,
  symbol          text not null,
  asset_type      text default 'stock',
  quantity        decimal(30,12) default 0,
  avg_entry_price decimal(30,12),
  market_value    decimal(20,2),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (user_id, symbol)
);
alter table public.positions add column if not exists shield_enabled      boolean default false;
alter table public.positions add column if not exists shield_activated_at timestamptz;
alter table public.positions enable row level security;
do $$ begin
  create policy positions_owner on public.positions for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 2) crypto_positions runtime columns (portfolio + trade routes use these)
alter table public.crypto_positions add column if not exists average_price       decimal(30,12);
alter table public.crypto_positions add column if not exists total_cost_basis    decimal(20,2) default 0;
alter table public.crypto_positions add column if not exists shield_enabled      boolean default false;
alter table public.crypto_positions add column if not exists shield_snap_price   decimal(30,12);
alter table public.crypto_positions add column if not exists shield_snap_value   decimal(20,2);
alter table public.crypto_positions add column if not exists shield_activated_at timestamptz;

-- 3) demo_fx_trades runtime columns (demo-fx engine + FX ticket)
alter table public.demo_fx_trades add column if not exists direction         text;
alter table public.demo_fx_trades add column if not exists investment        decimal(20,2);
alter table public.demo_fx_trades add column if not exists multiplier        int default 1;
alter table public.demo_fx_trades add column if not exists liquidation_price decimal(30,12);
alter table public.demo_fx_trades add column if not exists close_reason      text;
alter table public.demo_fx_trades add column if not exists symbol            text;

-- 4) trades runtime columns (regular FX judge)
alter table public.trades add column if not exists direction_int     smallint;
alter table public.trades add column if not exists investment        decimal(20,2);
alter table public.trades add column if not exists multiplier        int default 1;
alter table public.trades add column if not exists liquidation_price decimal(30,12);
alter table public.trades add column if not exists close_reason      text;
alter table public.trades add column if not exists mark_price        decimal(30,12);

-- 5) users runtime columns (base has most; ensure the rest)
alter table public.users add column if not exists deposit_address text;
alter table public.users add column if not exists deposit_network text;
alter table public.users add column if not exists kyc_data        jsonb;

-- 6) credit_user_usd RPC (SwiftBridge worker + admin approve call this)
create or replace function public.credit_user_usd(p_user uuid, p_amount numeric)
returns void language plpgsql security definer as $$
begin
  update public.users
     set balance_available = coalesce(balance_available, 0) + p_amount,
         updated_at = now()
   where id = p_user;
end; $$;
grant execute on function public.credit_user_usd(uuid, numeric) to authenticated, service_role;

-- ============================================================================
-- 7) crypto persistence fix (user_trading_data column + RLS policies)
alter table public.user_trading_data add column if not exists spot_crypto_state jsonb default '''{}'''::jsonb;
drop policy if exists utd_owner on public.user_trading_data;
create policy utd_owner on public.user_trading_data for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- add_missing_functions.sql  —  the DB functions your app calls that were
-- missing from the schema. Restores FX (open/close/revalue) and admin
-- (confirm_deposit, update_user_balance, price overrides, forced outcomes,
-- trading sessions). Extracted verbatim from your own SQL files.
-- Safe to re-run (all are CREATE OR REPLACE).
-- ============================================================================

-- ── open_trade_atomic  (from supabase/08_migration_trading_engine.sql) ──
create or replace function public.open_trade_atomic(
  p_user_id uuid,
  p_trade_id uuid,
  p_asset text,
  p_direction text,
  p_entry_price numeric,
  p_investment numeric,
  p_liquidation_price numeric default null,
  p_multiplier numeric default 1,
  p_stop_loss numeric default null,
  p_take_profit numeric default null
)
returns table (id uuid, balance_after numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
begin
  -- Lock the user row to prevent double-spend
  select balance_available into v_balance
    from public.users
   where id = p_user_id
     for update;

  if v_balance is null then
    raise exception 'User % not found', p_user_id;
  end if;

  if v_balance < p_investment then
    raise exception 'Insufficient balance: have %, need %', v_balance, p_investment;
  end if;

  -- Deduct the investment from available balance
  update public.users
     set balance_available = balance_available - p_investment
   where id = p_user_id;

  -- Insert the trade
  insert into public.trades(
    id, user_id, market_type, asset, pair, symbol,
    direction, entry_price, investment, amount,
    liquidation_price, multiplier, leverage,
    stop_loss, take_profit,
    status, opened_at, created_at
  ) values (
    p_trade_id, p_user_id, 'fx', p_asset, p_asset, p_asset,
    p_direction, p_entry_price, p_investment, p_investment,
    p_liquidation_price, p_multiplier, p_multiplier,
    p_stop_loss, p_take_profit,
    'open', now(), now()
  );

  return query select p_trade_id, (v_balance - p_investment);
end;
$$;

-- ── close_trade_atomic  (from supabase/08_migration_trading_engine.sql) ──
create or replace function public.close_trade_atomic(
  p_trade_id uuid,
  p_user_id uuid,
  p_exit_price numeric,
  p_final_pnl numeric,
  p_investment numeric,
  p_status text default 'closed'
)
returns table (id uuid, final_pnl numeric, balance_after numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_credit numeric;
begin
  -- Credit = investment + pnl (so a losing trade still returns < investment).
  v_credit := greatest(p_investment + p_final_pnl, 0);

  select balance_available into v_balance
    from public.users
   where id = p_user_id
     for update;

  if v_balance is null then
    raise exception 'User % not found', p_user_id;
  end if;

  update public.users
     set balance_available = balance_available + v_credit
   where id = p_user_id;

  update public.trades
     set status      = p_status,
         exit_price  = p_exit_price,
         final_pnl   = p_final_pnl,
         profit_loss = p_final_pnl,
         pnl         = p_final_pnl,
         closed_at   = now(),
         updated_at  = now()
   where id = p_trade_id
     and user_id = p_user_id
     and status = 'open';

  return query select p_trade_id, p_final_pnl, (v_balance + v_credit);
end;
$$;

-- ── revalue_fx_trades  (from supabase/08_migration_trading_engine.sql) ──
create or replace function public.revalue_fx_trades(
  p_user_id uuid,
  p_pair text,
  p_mid_price numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int := 0;
  v_closed int := 0;
  v_total_pnl numeric := 0;
  r record;
  v_direction_sign int;
  v_floating numeric;
  v_pct numeric;
  v_should_close boolean;
  v_close_reason text;
  v_credit numeric;
begin
  for r in
    select id, direction, entry_price, investment, multiplier,
           stop_loss, take_profit, liquidation_price
      from public.trades
     where user_id = p_user_id
       and (pair = p_pair or asset = p_pair or symbol = p_pair)
       and status = 'open'
       for update
  loop
    v_direction_sign := case
      when lower(coalesce(r.direction, 'buy')) in ('sell', 'short', 'down') then -1
      else 1
    end;

    v_floating := v_direction_sign
                  * (p_mid_price - r.entry_price)
                  * (r.investment / nullif(r.entry_price, 0))
                  * coalesce(r.multiplier, 1);

    v_pct := case
      when r.investment > 0 then (v_floating / r.investment) * 100
      else 0
    end;

    v_should_close := false;
    v_close_reason := null;

    if r.liquidation_price is not null then
      if (v_direction_sign = 1  and p_mid_price <= r.liquidation_price)
         or (v_direction_sign = -1 and p_mid_price >= r.liquidation_price) then
        v_should_close := true; v_close_reason := 'liquidated';
      end if;
    end if;

    if not v_should_close and r.stop_loss is not null then
      if (v_direction_sign = 1  and p_mid_price <= r.stop_loss)
         or (v_direction_sign = -1 and p_mid_price >= r.stop_loss) then
        v_should_close := true; v_close_reason := 'stop_loss';
      end if;
    end if;

    if not v_should_close and r.take_profit is not null then
      if (v_direction_sign = 1  and p_mid_price >= r.take_profit)
         or (v_direction_sign = -1 and p_mid_price <= r.take_profit) then
        v_should_close := true; v_close_reason := 'take_profit';
      end if;
    end if;

    if v_should_close then
      v_credit := greatest(r.investment + v_floating, 0);
      update public.users
         set balance_available = balance_available + v_credit
       where id = p_user_id;
      update public.trades
         set status       = 'closed',
             exit_price   = p_mid_price,
             current_price = p_mid_price,
             final_pnl    = v_floating,
             profit_loss  = v_floating,
             pnl          = v_floating,
             floating_pnl = v_floating,
             pnl_percentage = v_pct,
             close_reason = v_close_reason,
             closed_at    = now(),
             updated_at   = now()
       where id = r.id;
      v_closed := v_closed + 1;
    else
      update public.trades
         set current_price  = p_mid_price,
             floating_pnl   = v_floating,
             pnl_percentage = v_pct,
             last_mid_price = p_mid_price,
             last_revalued_at = now(),
             updated_at     = now()
       where id = r.id;
      v_updated := v_updated + 1;
    end if;

    v_total_pnl := v_total_pnl + v_floating;
  end loop;

  return jsonb_build_object(
    'updated', v_updated,
    'closed', v_closed,
    'total_floating_pnl', v_total_pnl,
    'pair', p_pair,
    'mid', p_mid_price
  );
end;
$$;

-- ── confirm_deposit  (from supabase/COMPLETE-FINAL-SETUP.sql) ──
CREATE OR REPLACE FUNCTION confirm_deposit(
    p_deposit_id UUID,
    p_admin_id UUID,
    p_note TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_deposit RECORD;
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
BEGIN
    -- Get deposit with lock
    SELECT * INTO v_deposit
    FROM public.deposits
    WHERE id = p_deposit_id AND status = 'pending'
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update deposit status
    UPDATE public.deposits
    SET status = 'confirmed',
        processed_by = p_admin_id,
        processed_at = NOW(),
        admin_note = p_note,
        updated_at = NOW()
    WHERE id = p_deposit_id;
    
    -- Get current user balance
    SELECT balance_available INTO v_current_balance
    FROM public.users
    WHERE id = v_deposit.user_id
    FOR UPDATE;
    
    v_new_balance := v_current_balance + v_deposit.amount;
    
    -- Credit user balance
    UPDATE public.users
    SET balance_available = v_new_balance,
        total_deposited = total_deposited + v_deposit.amount,
        updated_at = NOW()
    WHERE id = v_deposit.user_id;
    
    -- Log transaction
    INSERT INTO public.transactions (
        user_id, type, amount, balance_before, balance_after,
        description, reference_type, reference_id
    ) VALUES (
        v_deposit.user_id,
        'deposit',
        v_deposit.amount,
        v_current_balance,
        v_new_balance,
        'Deposit confirmed: ' || v_deposit.method_name,
        'deposit',
        p_deposit_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── reject_deposit  (from supabase/COMPLETE-FINAL-SETUP.sql) ──
CREATE OR REPLACE FUNCTION reject_deposit(
    p_deposit_id UUID,
    p_admin_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.deposits
    SET status = 'rejected',
        processed_by = p_admin_id,
        processed_at = NOW(),
        rejection_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_deposit_id AND status = 'pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── update_user_balance  (from supabase/COMPLETE-FINAL-SETUP.sql) ──
CREATE OR REPLACE FUNCTION update_user_balance(
    p_user_id UUID,
    p_amount DECIMAL,
    p_type TEXT,              -- 'credit' or 'debit'
    p_description TEXT DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
BEGIN
    -- Get current balance with lock
    SELECT balance_available INTO v_current_balance
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate new balance
    IF p_type = 'credit' THEN
        v_new_balance := v_current_balance + p_amount;
    ELSIF p_type = 'debit' THEN
        v_new_balance := v_current_balance - p_amount;
        IF v_new_balance < 0 THEN
            RETURN FALSE;
        END IF;
    ELSE
        RETURN FALSE;
    END IF;
    
    -- Update balance
    UPDATE public.users
    SET balance_available = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log transaction
    INSERT INTO public.transactions (
        user_id, type, amount, balance_before, balance_after, 
        description, reference_type, reference_id
    ) VALUES (
        p_user_id,
        CASE WHEN p_type = 'credit' THEN 'admin_credit' ELSE 'admin_debit' END,
        p_amount,
        v_current_balance,
        v_new_balance,
        p_description,
        p_reference_type,
        p_reference_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── apply_price_override  (from supabase/COMPLETE-FINAL-SETUP.sql) ──
CREATE OR REPLACE FUNCTION apply_price_override(
    p_pair TEXT,
    p_price DECIMAL,
    p_direction TEXT,
    p_admin_id UUID
) RETURNS UUID AS $$
DECLARE
    v_override_id UUID;
BEGIN
    -- Deactivate existing overrides for this pair
    UPDATE public.price_overrides 
    SET is_active = false, updated_at = NOW()
    WHERE pair_symbol = p_pair AND is_active = true;
    
    -- Create new override
    INSERT INTO public.price_overrides (pair_symbol, override_price, price_direction, is_active, created_by)
    VALUES (p_pair, p_price, p_direction, true, p_admin_id)
    RETURNING id INTO v_override_id;
    
    -- Log action
    INSERT INTO public.admin_logs (admin_id, action, target_type, details)
    VALUES (p_admin_id, 'price_override', 'pair', jsonb_build_object(
        'pair', p_pair,
        'price', p_price,
        'direction', p_direction
    ));
    
    RETURN v_override_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── force_trade_outcome  (from supabase/COMPLETE-FINAL-SETUP.sql) ──
CREATE OR REPLACE FUNCTION force_trade_outcome(
    p_trade_id UUID,
    p_outcome TEXT,
    p_target_pnl DECIMAL,
    p_admin_id UUID,
    p_note TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_trade RECORD;
BEGIN
    SELECT * INTO v_trade FROM public.trades WHERE id = p_trade_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    INSERT INTO public.trade_outcomes (trade_id, user_id, forced_outcome, target_pnl, created_by, note)
    VALUES (p_trade_id, v_trade.user_id, p_outcome, p_target_pnl, p_admin_id, p_note);
    
    INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (p_admin_id, 'trade_outcome', 'trade', p_trade_id, jsonb_build_object(
        'outcome', p_outcome,
        'target_pnl', p_target_pnl,
        'user_id', v_trade.user_id
    ));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── start_trading_session  (from supabase/admin-markets-schema.sql) ──
CREATE OR REPLACE FUNCTION start_trading_session(
    p_session_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.trading_sessions
    SET status = 'active', updated_at = NOW()
    WHERE id = p_session_id AND status = 'scheduled';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── end_trading_session  (from supabase/admin-markets-schema.sql) ──
CREATE OR REPLACE FUNCTION end_trading_session(
    p_session_id UUID,
    p_end_price DECIMAL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.trading_sessions
    SET status = 'completed', 
        actual_end_price = p_end_price,
        updated_at = NOW()
    WHERE id = p_session_id AND status = 'active';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── try_spend_market_budget (stub: absent from repo — allow) ──
create or replace function public.try_spend_market_budget(p_amount numeric default 0, p_key text default null)
returns boolean language sql as $$ select true $$;

-- ── complete_referral (stub: absent from repo — no-op) ──
create or replace function public.complete_referral(p_user uuid default null, p_referrer uuid default null)
returns boolean language sql as $$ select true $$;

-- SEED  —  fully-loaded test account (jeff.janice@swifttrade.test / Test1234!)
-- ============================================================================
-- ============================================================================
-- seed_jeff_janice.sql — creates a fully-loaded test account.
--
-- Login:  jeff.janice@swifttrade.test   /   Test1234!
--
-- Safe to run more than once (idempotent). It ADAPTS to your real columns via
-- information_schema, because your repo has conflicting schema versions
-- (crypto_positions.avg_buy_price vs average_price, etc.).
--
-- If the auth.users insert fails (Supabase versions differ), the script raises a
-- notice — in that case create the user once in Dashboard → Authentication →
-- Add user (email above), copy their UID into v_uid below, and re-run.
-- ============================================================================
create extension if not exists pgcrypto;

do $$
declare
  v_uid uuid := 'a1e7c0de-0000-4a5b-8c1d-6a1e77e5ff01';  -- fixed test UID
  v_email text := 'jeff.janice@swifttrade.test';
begin
  -- ---------------------------------------------------------------- auth user
  begin
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, crypt('Test1234!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{"first_name":"Jeff","last_name":"Janice"}',
      false, '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      v_uid::text, v_uid,
      json_build_object('sub', v_uid::text, 'email', v_email),
      'email', now(), now(), now()
    ) on conflict do nothing;
  exception when others then
    raise notice 'auth.users seed skipped (%). Create the user in the Dashboard, put its UID in v_uid, and re-run.', sqlerrm;
  end;

  -- ---------------------------------------------------------------- profile
  insert into public.users (id, email, first_name, last_name)
  values (v_uid, v_email, 'Jeff', 'Janice')
  on conflict (id) do nothing;

  -- balances + flags (only set columns that exist)
  update public.users set
    balance_available = 25000,
    balance_bonus     = 500,
    updated_at        = now()
  where id = v_uid;

  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='balance_pending';
  if found then update public.users set balance_pending = 1500 where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='total_deposited';
  if found then update public.users set total_deposited = 40000 where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='shield_mode';
  if found then update public.users set shield_mode = true where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='kyc_status';
  if found then update public.users set kyc_status = 'verified' where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='email_verified';
  if found then update public.users set email_verified = true where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='is_active';
  if found then update public.users set is_active = true where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='tier';
  if found then update public.users set tier = 'pro' where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='tier_purchased';
  if found then update public.users set tier_purchased = true where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='referral_code';
  if found then update public.users set referral_code = 'JEFFJAN' where id = v_uid
             and not exists (select 1 from public.users where referral_code='JEFFJAN' and id<>v_uid); end if;

  -- ---------------------------------------------------------------- crypto positions (adaptive)
  if exists (select 1 from information_schema.columns where table_name='crypto_positions' and column_name='avg_buy_price') then
    insert into public.crypto_positions (user_id, symbol, quantity, avg_buy_price)
    select v_uid,'BTC',0.35,61000 where not exists (select 1 from public.crypto_positions where user_id=v_uid and symbol='BTC');
    insert into public.crypto_positions (user_id, symbol, quantity, avg_buy_price)
    select v_uid,'ETH',4.2,2950 where not exists (select 1 from public.crypto_positions where user_id=v_uid and symbol='ETH');
  elsif exists (select 1 from information_schema.columns where table_name='crypto_positions' and column_name='average_price') then
    insert into public.crypto_positions (user_id, symbol, quantity, average_price, total_cost_basis)
    select v_uid,'BTC',0.35,61000,21350 where not exists (select 1 from public.crypto_positions where user_id=v_uid and symbol='BTC');
    insert into public.crypto_positions (user_id, symbol, quantity, average_price, total_cost_basis)
    select v_uid,'ETH',4.2,2950,12390 where not exists (select 1 from public.crypto_positions where user_id=v_uid and symbol='ETH');
  end if;
  if exists (select 1 from information_schema.columns where table_name='crypto_positions' and column_name='shield_enabled') then
    update public.crypto_positions set shield_enabled = true where user_id = v_uid and symbol = 'BTC';
  end if;

  -- ---------------------------------------------------------------- equities (only if the table exists)
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='positions') then
    if exists (select 1 from information_schema.columns where table_name='positions' and column_name='avg_entry_price') then
      insert into public.positions (user_id, symbol, asset_type, quantity, avg_entry_price)
      select v_uid,'AAPL','stock',15,205 where not exists (select 1 from public.positions where user_id=v_uid and symbol='AAPL');
      insert into public.positions (user_id, symbol, asset_type, quantity, avg_entry_price)
      select v_uid,'TSLA','stock',8,240 where not exists (select 1 from public.positions where user_id=v_uid and symbol='TSLA');
    end if;
  end if;

  -- ---------------------------------------------------------------- transactions (real cols)
  if exists (select 1 from information_schema.columns where table_name='transactions' and column_name='balance_after') then
    insert into public.transactions (user_id, type, amount, currency, balance_after, description, status)
    select v_uid,'deposit',40000,'USD',40000,'Initial funding','completed'
    where not exists (select 1 from public.transactions where user_id=v_uid and description='Initial funding');
  end if;

  -- ---------------------------------------------------------------- deposits
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='deposits') then
    insert into public.deposits (user_id, method, amount, currency, network, status)
    select v_uid,'crypto',40000,'USD','ERC-20','confirmed'
    where not exists (select 1 from public.deposits where user_id=v_uid and amount=40000);
  end if;

  -- ---------------------------------------------------------------- withdrawals
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='withdrawals') then
    insert into public.withdrawals (user_id, method, amount, currency, network, address, status, net_amount)
    select v_uid,'crypto',5000,'USD','ERC-20','0xJEFF00000000000000000000000000000000TEST','completed',4990
    where not exists (select 1 from public.withdrawals where user_id=v_uid and amount=5000);
  end if;

  -- ---------------------------------------------------------------- SwiftBridge (real cols)
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='bridge_countries') then
    insert into public.bridge_countries (code, name, currency, currency_symbol, is_active)
    values ('NG','Nigeria','NGN','₦',true) on conflict (code) do nothing;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='bridge_requests') then
    -- one completed
    insert into public.bridge_requests (user_id, country_code, local_currency, local_amount, target_asset, fx_rate, estimated_usd, status, final_credit_usd)
    select v_uid,'NG','NGN',1600000,'USDT',1600,1000,'completed',1000
    where not exists (select 1 from public.bridge_requests where user_id=v_uid and status='completed');
    -- one in progress
    insert into public.bridge_requests (user_id, country_code, local_currency, local_amount, target_asset, fx_rate, estimated_usd, status)
    select v_uid,'NG','NGN',800000,'USDT',1600,500,'awaiting_admin'
    where not exists (select 1 from public.bridge_requests where user_id=v_uid and status='awaiting_admin');
  end if;

  raise notice 'Seeded Jeff Janice (%). Login: % / Test1234!', v_uid, v_email;
end $$;
