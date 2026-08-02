-- ############################################################################
-- SWIFT TRADE — MASTER SCHEMA (definitive, ordered, idempotent)
-- Run once in the Supabase SQL editor. Safe to re-run.
-- Real chain 01->08 + admin market control + completion patch.
-- After running: Auth -> Providers -> Email -> turn OFF "Confirm email".
-- Admin seeded: blaiseidoko@gmail.com / Blaise999
-- ############################################################################


-- ===== 01_schema.sql =====

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


-- ===== SAFETY NET (assets, positions, orders) =====


-- ===== SAFETY NET: create tables that later migrations reference but 01_schema never creates =====
create table if not exists public.assets (
  id uuid primary key default uuid_generate_v4(),
  symbol text unique not null,
  name text,
  asset_type text default 'stock',
  category text,
  sector text,
  market_cap_billions numeric(20,4),
  fractionable boolean default true,
  beginner_friendly boolean default false,
  is_active boolean default true,
  seed_price numeric(20,4),
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.assets enable row level security;
drop policy if exists assets_read on public.assets;
create policy assets_read on public.assets for select using (true);

create table if not exists public.positions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  symbol text not null,
  asset_type text default 'stock',
  quantity numeric(30,12) default 0,
  avg_entry_price numeric(30,12),
  market_value numeric(20,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, symbol)
);
alter table public.positions enable row level security;
drop policy if exists positions_owner on public.positions;
create policy positions_owner on public.positions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  symbol text not null,
  asset_type text default 'stock',
  side text default 'buy',
  order_type text default 'market',
  time_in_force text default 'day',
  amount_type text default 'notional',
  notional_amount numeric(20,2),
  quantity numeric(30,12),
  price numeric(20,4),
  estimated_price numeric(20,4),
  fill_price numeric(20,4),
  filled_at timestamptz,
  status text default 'filled',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.orders enable row level security;
drop policy if exists orders_owner on public.orders;
create policy orders_owner on public.orders for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ===== END SAFETY NET =====


-- ===== 02_seed.sql =====

-- =====================================================================
-- SWIFT TRADE — SEED DATA
-- Run AFTER schema.sql in Supabase SQL Editor.
-- =====================================================================

-- SwiftBridge supported countries (ordered for HK-headquartered, Asia-first)
insert into public.bridge_countries (code, name, currency, currency_symbol, flag_emoji, min_local, max_local, display_order) values
  ('HK','Hong Kong',         'HKD','HK$','🇭🇰',    100,    1000000,  1),
  ('SG','Singapore',         'SGD','S$', '🇸🇬',    100,    1000000,  2),
  ('JP','Japan',             'JPY','¥',  '🇯🇵',  10000,  100000000,  3),
  ('KR','South Korea',       'KRW','₩',  '🇰🇷', 100000, 1000000000,  4),
  ('CN','China',             'CNY','¥',  '🇨🇳',    500,    5000000,  5),
  ('TW','Taiwan',            'TWD','NT$','🇹🇼',   1000,   10000000,  6),
  ('IN','India',             'INR','₹',  '🇮🇳',   1000,   10000000,  7),
  ('PH','Philippines',       'PHP','₱',  '🇵🇭',   1000,   10000000,  8),
  ('ID','Indonesia',         'IDR','Rp', '🇮🇩', 200000, 1000000000,  9),
  ('TH','Thailand',          'THB','฿',  '🇹🇭',   1000,   10000000, 10),
  ('VN','Vietnam',           'VND','₫',  '🇻🇳', 500000, 5000000000, 11),
  ('MY','Malaysia',          'MYR','RM', '🇲🇾',    300,    3000000, 12),
  ('PK','Pakistan',          'PKR','₨',  '🇵🇰',   5000,   50000000, 13),
  ('AE','United Arab Emirates','AED','د.إ','🇦🇪',  100,    1000000, 14),
  ('AU','Australia',         'AUD','A$', '🇦🇺',    100,    1000000, 15),
  ('NZ','New Zealand',       'NZD','NZ$','🇳🇿',    100,    1000000, 16),
  ('GB','United Kingdom',    'GBP','£',  '🇬🇧',     50,    1000000, 17),
  ('EU','Eurozone',          'EUR','€',  '🇪🇺',     50,    1000000, 18),
  ('CH','Switzerland',       'CHF','Fr', '🇨🇭',     50,    1000000, 19),
  ('US','United States',     'USD','$',  '🇺🇸',     50,    1000000, 20),
  ('CA','Canada',            'CAD','C$', '🇨🇦',     50,    1000000, 21),
  ('MX','Mexico',            'MXN','$',  '🇲🇽',    500,    5000000, 22),
  ('BR','Brazil',            'BRL','R$', '🇧🇷',    150,    2000000, 23),
  ('AR','Argentina',         'ARS','$',  '🇦🇷',  20000,  200000000, 24),
  ('CL','Chile',             'CLP','$',  '🇨🇱',  20000,  200000000, 25),
  ('TR','Turkey',            'TRY','₺',  '🇹🇷',    500,    5000000, 26),
  ('EG','Egypt',             'EGP','£',  '🇪🇬',    500,    5000000, 27),
  ('ZA','South Africa',      'ZAR','R',  '🇿🇦',    300,    5000000, 28),
  ('KE','Kenya',             'KES','KSh','🇰🇪',   2000,   20000000, 29),
  ('GH','Ghana',             'GHS','₵',  '🇬🇭',    200,    2000000, 30),
  ('NG','Nigeria',           'NGN','₦',  '🇳🇬',   5000,   50000000, 31)
on conflict (code) do nothing;

-- =====================================================================
-- Payment methods (deposit options for the user wallet page)
-- =====================================================================
insert into public.payment_methods (type, name, symbol, network, address, icon, min_amount, confirmations, active, display_order)
values
  ('crypto','Bitcoin','BTC','Bitcoin','bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh','₿', 50, 3, true, 1),
  ('crypto','Ethereum','ETH','ERC-20','0x742d35Cc6634C0532925a3b844Bc454e4438f44E','Ξ', 50, 12, true, 2),
  ('crypto','Tether (TRC-20)','USDT','TRC-20','TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9','₮', 20, 20, true, 3),
  ('crypto','Tether (ERC-20)','USDT','ERC-20','0x742d35Cc6634C0532925a3b844Bc454e4438f44E','₮', 20, 12, true, 4),
  ('crypto','USD Coin','USDC','ERC-20','0x742d35Cc6634C0532925a3b844Bc454e4438f44E','◎', 20, 12, true, 5),
  ('crypto','BNB','BNB','BEP-20','bnb1qm5y2jq2vwz0e9sa30dq2s8q4zk5x9hcfu7w3y','B', 50, 15, true, 6),
  ('crypto','Solana','SOL','Solana','7VWDKmDPbHqHE3hVqzqV8q8xQzKZf7aXWNK4qPbHsA1','◎', 50, 32, true, 7)
on conflict (symbol, network) do nothing;

-- =====================================================================
-- Platform wallets (admin-managed deposit destinations)
-- =====================================================================
insert into public.platform_wallets (asset, network, address, label, is_active)
values
  ('BTC','Bitcoin','bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh','Primary BTC',true),
  ('ETH','ERC-20','0x742d35Cc6634C0532925a3b844Bc454e4438f44E','Primary ETH',true),
  ('USDT','TRC-20','TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9','Primary USDT TRC-20',true),
  ('USDT','ERC-20','0x742d35Cc6634C0532925a3b844Bc454e4438f44E','Primary USDT ERC-20',true),
  ('USDC','ERC-20','0x742d35Cc6634C0532925a3b844Bc454e4438f44E','Primary USDC',true)
on conflict (asset, network, address) do nothing;

-- =====================================================================
-- Demo FX pairs (educational module)
-- =====================================================================
insert into public.demo_fx_pairs (symbol, base, quote, current_bid, current_ask, pip_size, is_active) values
  ('EUR/USD','EUR','USD',1.08315,1.08325,0.0001,true),
  ('GBP/USD','GBP','USD',1.26405,1.26415,0.0001,true),
  ('USD/JPY','USD','JPY',154.205,154.215,0.01,true),
  ('USD/HKD','USD','HKD',7.81075,7.81085,0.0001,true),
  ('USD/CNY','USD','CNY',7.24175,7.24185,0.0001,true),
  ('AUD/USD','AUD','USD',0.65920,0.65930,0.0001,true),
  ('USD/CAD','USD','CAD',1.36285,1.36295,0.0001,true),
  ('NZD/USD','NZD','USD',0.59815,0.59825,0.0001,true),
  ('XAU/USD','XAU','USD',2328.05,2328.15,0.01,true)
on conflict (symbol) do nothing;

-- =====================================================================
-- Default platform settings
-- =====================================================================
insert into public.platform_settings (key, value, description) values
  ('signup_bonus_amount',  '10',                         'USD credited on signup'),
  ('referral_bonus',       '25',                         'USD credited on successful referral'),
  ('min_deposit_usd',      '50',                         'Minimum deposit'),
  ('min_withdrawal_usd',   '50',                         'Minimum withdrawal'),
  ('withdrawal_fee_pct',   '2',                          'Default withdrawal fee percentage'),
  ('bridge_fee_pct',       '1.5',                        'SwiftBridge service fee'),
  ('site_name',            '"Swift Trade"',              'Site brand'),
  ('hq_location',          '"Hong Kong"',                'HQ city'),
  ('support_email',        '"support@swifttrade.io"',    'Support inbox'),
  ('admin_notification_email','"ops@swifttrade.io"',     'Inbox for ops alerts')
on conflict (key) do update set value = excluded.value, updated_at = now();


-- ===== 03_admin_bootstrap.sql =====

-- =====================================================================
-- SWIFT TRADE — BOOTSTRAP ADMIN USER: Blaise Chimdi
-- =====================================================================
-- Creates Blaise as both a regular login user AND an admin.
-- Email:    blaiseidoko@gmail.com
-- Password: Blaise999
-- He can log in at /auth/login   (user dashboard)
--   AND at  /admin/login         (admin panel)
--
-- Run this in Supabase SQL Editor AFTER 01_schema.sql + 02_seed.sql.
-- Idempotent: re-running just re-asserts the password and admin role.
-- =====================================================================

create extension if not exists "pgcrypto";

do $$
declare
  v_user_id uuid;
  v_email   text := 'blaiseidoko@gmail.com';
  v_pwd     text := 'Blaise999';
begin
  -- Look for existing auth user.
  select id into v_user_id from auth.users where email = v_email;

  -- Create the auth.users row if it doesn't exist.
  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role,
      email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, crypt(v_pwd, gen_salt('bf')), now(),
      jsonb_build_object('provider','email','providers',array['email']),
      jsonb_build_object('full_name','Blaise Chimdi'),
      now(), now(),
      '', '', '', ''
    );

    -- Required identity row for email auth provider.
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email', v_user_id::text,
      now(), now(), now()
    );
  end if;

  -- Mirror into public.users with admin role.
  -- ON CONFLICT (id) handles re-runs; ON CONFLICT (email) handles legacy rows.
  insert into public.users (
    id, email, first_name, last_name,
    role, is_admin, tier, tier_purchased,
    is_active, email_verified,
    kyc_status, registration_status,
    balance_available, balance_bonus,
    referral_code,
    created_at, updated_at
  ) values (
    v_user_id, v_email, 'Blaise', 'Chimdi',
    'admin', true, 'sovereign', true,
    true, true,
    'verified', 'complete',
    0, 0,
    'BLAISE001',
    now(), now()
  )
  on conflict (id) do update set
    role                = 'admin',
    is_admin            = true,
    tier                = 'sovereign',
    tier_purchased      = true,
    is_active           = true,
    email_verified      = true,
    first_name          = excluded.first_name,
    last_name           = excluded.last_name,
    kyc_status          = 'verified',
    registration_status = 'complete',
    updated_at          = now();

  raise notice 'Blaise Chimdi admin user ready: %', v_user_id;
end $$;

-- Re-assert the password every run (in case it was changed).
update auth.users
   set encrypted_password = crypt('Blaise999', gen_salt('bf')),
       email_confirmed_at = coalesce(email_confirmed_at, now()),
       updated_at         = now()
 where email = 'blaiseidoko@gmail.com';

-- Sanity check: also ensure the public mirror exists for any pre-existing auth user
-- with this email (covers an edge case where auth.users has the row but public.users doesn't).
insert into public.users (id, email, first_name, last_name, role, is_admin, tier,
                          is_active, email_verified, kyc_status, registration_status,
                          balance_available, referral_code, created_at, updated_at)
select au.id, au.email, 'Blaise', 'Chimdi', 'admin', true, 'sovereign',
       true, true, 'verified', 'complete', 0, 'BLAISE001', now(), now()
  from auth.users au
 where au.email = 'blaiseidoko@gmail.com'
on conflict (id) do nothing;


-- ===== 04_migration_stocks_catalog.sql =====

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


-- ===== 05_migration_schema_completion.sql =====

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


-- ===== 06_migration_real_fixes.sql =====

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


-- ===== 07_migration_final.sql =====

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


-- ===== 08_migration_trading_engine.sql =====

-- =====================================================================
-- SWIFT TRADE — MIGRATION 08 (TRADING ENGINE + CONCIERGE COMPLETION)
--
-- Apply on top of 01-07 or after RUN_THIS_TO_FIX_ALL_SCHEMA_ERRORS.sql
-- 100% idempotent — safe to run repeatedly.
--
-- Fixes:
--   ✅ column trades.final_pnl does not exist
--   ✅ Could not find the function public.open_trade_atomic
--   ✅ Could not find the function public.close_trade_atomic
--   ✅ Could not find the function public.revalue_fx_trades
--   ✅ Adds admin concierge (SwiftBridge) action endpoints support
-- =====================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1) Missing trades columns surfaced by the FX engine
-- ──────────────────────────────────────────────────────────────────────
alter table public.trades
  add column if not exists final_pnl numeric(20,2) default 0,
  add column if not exists profit_loss numeric(20,2) default 0,
  add column if not exists pnl numeric(20,2) default 0,
  add column if not exists last_revalued_at timestamptz,
  add column if not exists last_mid_price numeric(30,12);

-- Make sure positions table can hold "stocks" type
alter table public.positions
  add column if not exists day_change_pct numeric(10,4) default 0;

-- ──────────────────────────────────────────────────────────────────────
-- 2) RPC: open_trade_atomic
--    Locks balance, inserts a trade row, returns the trade id.
-- ──────────────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────────────
-- 3) RPC: close_trade_atomic
--    Closes a trade, credits balance (investment + final_pnl), updates row.
-- ──────────────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────────────
-- 4) RPC: revalue_fx_trades
--    Marks all open FX trades for a pair to current mid price, updates
--    floating_pnl and pnl_percentage, auto-closes if SL/TP/liq hit.
-- ──────────────────────────────────────────────────────────────────────
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

-- Grant execute to authenticated + service_role (defensive)
do $$ begin grant execute on function public.open_trade_atomic(uuid,uuid,text,text,numeric,numeric,numeric,numeric,numeric,numeric) to authenticated;
exception when undefined_object then null; end $$;
do $$ begin grant execute on function public.open_trade_atomic(uuid,uuid,text,text,numeric,numeric,numeric,numeric,numeric,numeric) to service_role;
exception when undefined_object then null; end $$;
do $$ begin grant execute on function public.close_trade_atomic(uuid,uuid,numeric,numeric,numeric,text) to authenticated;
exception when undefined_object then null; end $$;
do $$ begin grant execute on function public.close_trade_atomic(uuid,uuid,numeric,numeric,numeric,text) to service_role;
exception when undefined_object then null; end $$;
do $$ begin grant execute on function public.revalue_fx_trades(uuid,text,numeric) to authenticated;
exception when undefined_object then null; end $$;
do $$ begin grant execute on function public.revalue_fx_trades(uuid,text,numeric) to service_role;
exception when undefined_object then null; end $$;

-- ──────────────────────────────────────────────────────────────────────
-- 5) Concierge (SwiftBridge) admin workflow columns
-- ──────────────────────────────────────────────────────────────────────
alter table public.bridge_requests
  add column if not exists admin_deposit_account text,
  add column if not exists admin_deposit_instructions text,
  add column if not exists user_receipt_url text,
  add column if not exists user_wallet_address text,
  add column if not exists user_wallet_network text,
  add column if not exists admin_payout_tx text,
  add column if not exists admin_payout_at timestamptz,
  add column if not exists workflow_step text default 'awaiting_admin_account';

create index if not exists idx_bridge_requests_status_created
  on public.bridge_requests(status, created_at desc);
create index if not exists idx_bridge_requests_workflow
  on public.bridge_requests(workflow_step);

-- Done.


-- ===== COLUMN RECONCILIATION =====

-- ===== COLUMN RECONCILIATION (guarantee admin-markets columns exist; guarded) =====
do $rc$ begin alter table public.custom_pairs add column if not exists symbol TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_pairs add column if not exists name TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_pairs add column if not exists category TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_pairs add column if not exists base_price DECIMAL(20,8); exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_pairs add column if not exists current_price DECIMAL(20,8); exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_pairs add column if not exists spread DECIMAL(10,4); exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_pairs add column if not exists pip_value DECIMAL(10,6); exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_pairs add column if not exists leverage_max INT; exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_pairs add column if not exists min_lot DECIMAL(10,4); exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_pairs add column if not exists max_lot DECIMAL(10,4); exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_pairs add column if not exists trading_hours TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_pairs add column if not exists is_enabled BOOLEAN; exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_pairs add column if not exists description TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_pairs add column if not exists icon TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_pairs add column if not exists updated_at TIMESTAMPTZ; exception when others then null; end $rc$;
do $rc$ begin alter table public.price_overrides add column if not exists pair_symbol TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.price_overrides add column if not exists override_price DECIMAL(20,8); exception when others then null; end $rc$;
do $rc$ begin alter table public.price_overrides add column if not exists price_direction TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.price_overrides add column if not exists volatility_multiplier DECIMAL(5,2); exception when others then null; end $rc$;
do $rc$ begin alter table public.price_overrides add column if not exists is_active BOOLEAN; exception when others then null; end $rc$;
do $rc$ begin alter table public.price_overrides add column if not exists expires_at TIMESTAMPTZ; exception when others then null; end $rc$;
do $rc$ begin alter table public.price_overrides add column if not exists updated_at TIMESTAMPTZ; exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists name TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists description TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists pair_symbol TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists session_type TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists starts_at TIMESTAMPTZ; exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists ends_at TIMESTAMPTZ; exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists start_price DECIMAL(20,8); exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists target_price DECIMAL(20,8); exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists price_path TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists win_rate_override DECIMAL(5,2); exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists max_profit_per_user DECIMAL(15,2); exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists max_loss_per_user DECIMAL(15,2); exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists status TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists actual_end_price DECIMAL(20,8); exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists participants_count INT; exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists total_volume DECIMAL(20,2); exception when others then null; end $rc$;
do $rc$ begin alter table public.trading_sessions add column if not exists updated_at TIMESTAMPTZ; exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_candles add column if not exists pair_symbol TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_candles add column if not exists timeframe TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_candles add column if not exists timestamp TIMESTAMPTZ; exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_candles add column if not exists open_price DECIMAL(20,8); exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_candles add column if not exists high_price DECIMAL(20,8); exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_candles add column if not exists low_price DECIMAL(20,8); exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_candles add column if not exists close_price DECIMAL(20,8); exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_candles add column if not exists volume DECIMAL(20,2); exception when others then null; end $rc$;
do $rc$ begin alter table public.custom_candles add column if not exists is_generated BOOLEAN; exception when others then null; end $rc$;
do $rc$ begin alter table public.trade_outcomes add column if not exists user_id UUID; exception when others then null; end $rc$;
do $rc$ begin alter table public.trade_outcomes add column if not exists trade_id UUID; exception when others then null; end $rc$;
do $rc$ begin alter table public.trade_outcomes add column if not exists forced_outcome TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.trade_outcomes add column if not exists target_pnl DECIMAL(15,2); exception when others then null; end $rc$;
do $rc$ begin alter table public.trade_outcomes add column if not exists target_pnl_percentage DECIMAL(10,4); exception when others then null; end $rc$;
do $rc$ begin alter table public.trade_outcomes add column if not exists close_at TIMESTAMPTZ; exception when others then null; end $rc$;
do $rc$ begin alter table public.trade_outcomes add column if not exists close_price_override DECIMAL(20,8); exception when others then null; end $rc$;
do $rc$ begin alter table public.trade_outcomes add column if not exists is_applied BOOLEAN; exception when others then null; end $rc$;
do $rc$ begin alter table public.trade_outcomes add column if not exists applied_at TIMESTAMPTZ; exception when others then null; end $rc$;
do $rc$ begin alter table public.trade_outcomes add column if not exists note TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.market_patterns add column if not exists name TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.market_patterns add column if not exists description TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.market_patterns add column if not exists pattern_type TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.market_patterns add column if not exists price_points JSONB; exception when others then null; end $rc$;
do $rc$ begin alter table public.market_patterns add column if not exists duration_minutes INT; exception when others then null; end $rc$;
do $rc$ begin alter table public.market_patterns add column if not exists volatility DECIMAL(5,2); exception when others then null; end $rc$;
do $rc$ begin alter table public.market_patterns add column if not exists is_public BOOLEAN; exception when others then null; end $rc$;
do $rc$ begin alter table public.admin_logs add column if not exists admin_id UUID; exception when others then null; end $rc$;
do $rc$ begin alter table public.admin_logs add column if not exists action TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.admin_logs add column if not exists target_type TEXT; exception when others then null; end $rc$;
do $rc$ begin alter table public.admin_logs add column if not exists target_id UUID; exception when others then null; end $rc$;
do $rc$ begin alter table public.admin_logs add column if not exists details JSONB; exception when others then null; end $rc$;
do $rc$ begin alter table public.admin_logs add column if not exists ip_address TEXT; exception when others then null; end $rc$;

-- ===== RELAX NOT-NULL =====

-- ===== RELAX NOT-NULL ON COLLIDING ADMIN TABLES (non-destructive) =====
do $relax$
declare r record;
begin
  for r in select table_name, column_name from information_schema.columns
    where table_schema='public'
      and table_name in ('admin_logs','custom_pairs','market_patterns','price_overrides','trade_outcomes','trading_sessions')
      and is_nullable='NO' and column_name not in ('id')
  loop
    begin execute format('alter table public.%I alter column %I drop not null', r.table_name, r.column_name);
    exception when others then null; end;
  end loop;
end $relax$;

-- ===== admin-markets-schema.sql =====

-- ============================================
-- ADMIN MARKET CONTROL - SUPABASE SCHEMA
-- ============================================
-- Run this AFTER the main schema.sql
-- This adds tables for admin-controlled trading

-- ============================================
-- CUSTOM TRADING PAIRS (Admin Created)
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT UNIQUE NOT NULL, -- e.g., 'NOVA/USD'
    name TEXT NOT NULL,
    category TEXT DEFAULT 'forex' CHECK (category IN ('forex', 'crypto', 'stocks', 'commodities')),
    base_price DECIMAL(20,8) NOT NULL,
    current_price DECIMAL(20,8) NOT NULL,
    spread DECIMAL(10,4) DEFAULT 0.0002,
    pip_value DECIMAL(10,6) DEFAULT 0.0001,
    leverage_max INT DEFAULT 100,
    min_lot DECIMAL(10,4) DEFAULT 0.01,
    max_lot DECIMAL(10,4) DEFAULT 100,
    trading_hours TEXT DEFAULT '24/7', -- or 'market_hours'
    is_enabled BOOLEAN DEFAULT true,
    description TEXT,
    icon TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRICE OVERRIDES (Manual Price Control)
-- ============================================
CREATE TABLE IF NOT EXISTS public.price_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair_symbol TEXT NOT NULL, -- Can be custom or real pair
    override_price DECIMAL(20,8),
    price_direction TEXT CHECK (price_direction IN ('up', 'down', 'neutral', 'volatile')),
    volatility_multiplier DECIMAL(5,2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ, -- Optional expiry
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_overrides_pair ON public.price_overrides(pair_symbol);

-- ============================================
-- TRADING SESSIONS (Scheduled Events)
-- ============================================
CREATE TABLE IF NOT EXISTS public.trading_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    pair_symbol TEXT NOT NULL,
    session_type TEXT DEFAULT 'standard' CHECK (session_type IN ('standard', 'high_volatility', 'pump', 'dump', 'sideways')),
    
    -- Session timing
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    
    -- Price targets
    start_price DECIMAL(20,8) NOT NULL,
    target_price DECIMAL(20,8), -- Where price should end
    price_path TEXT DEFAULT 'organic', -- 'organic', 'linear', 'volatile', 'spike'
    
    -- Outcome control
    win_rate_override DECIMAL(5,2), -- e.g., 0.30 = 30% of trades win
    max_profit_per_user DECIMAL(15,2),
    max_loss_per_user DECIMAL(15,2),
    
    -- Status
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
    actual_end_price DECIMAL(20,8),
    
    -- Metadata
    participants_count INT DEFAULT 0,
    total_volume DECIMAL(20,2) DEFAULT 0,
    
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.trading_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_pair ON public.trading_sessions(pair_symbol);

-- ============================================
-- CANDLE DATA (Admin Controlled Charts)
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_candles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair_symbol TEXT NOT NULL,
    timeframe TEXT DEFAULT '1m' CHECK (timeframe IN ('1m', '5m', '15m', '1h', '4h', '1d')),
    timestamp TIMESTAMPTZ NOT NULL,
    open_price DECIMAL(20,8) NOT NULL,
    high_price DECIMAL(20,8) NOT NULL,
    low_price DECIMAL(20,8) NOT NULL,
    close_price DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,2) DEFAULT 0,
    is_generated BOOLEAN DEFAULT true, -- true = admin generated, false = from market
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candles_pair_time ON public.custom_candles(pair_symbol, timestamp DESC);

-- ============================================
-- USER TRADE OUTCOMES (Admin Controlled)
-- ============================================
-- This table allows admin to pre-determine trade outcomes for specific users
CREATE TABLE IF NOT EXISTS public.trade_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE,
    
    -- Outcome settings
    forced_outcome TEXT CHECK (forced_outcome IN ('win', 'lose', 'breakeven')),
    target_pnl DECIMAL(15,2), -- Exact P&L to assign
    target_pnl_percentage DECIMAL(10,4),
    
    -- Timing
    close_at TIMESTAMPTZ, -- When to auto-close
    close_price_override DECIMAL(20,8),
    
    -- Status
    is_applied BOOLEAN DEFAULT false,
    applied_at TIMESTAMPTZ,
    
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_trade_outcomes_user ON public.trade_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_outcomes_trade ON public.trade_outcomes(trade_id);

-- ============================================
-- MARKET PATTERNS (Pre-built Price Movements)
-- ============================================
CREATE TABLE IF NOT EXISTS public.market_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    pattern_type TEXT CHECK (pattern_type IN ('bullish', 'bearish', 'consolidation', 'breakout', 'reversal', 'custom')),
    
    -- Pattern data (array of price movements as percentage from start)
    price_points JSONB NOT NULL, -- [{time: 0, price: 0}, {time: 1, price: 0.5}, ...]
    duration_minutes INT DEFAULT 60,
    volatility DECIMAL(5,2) DEFAULT 1.0,
    
    is_public BOOLEAN DEFAULT true, -- Available to use in sessions
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default patterns
INSERT INTO public.market_patterns (name, description, pattern_type, price_points, duration_minutes) VALUES
('Steady Rise', 'Gradual upward movement', 'bullish', 
 '[{"t":0,"p":0},{"t":20,"p":0.3},{"t":40,"p":0.5},{"t":60,"p":0.8},{"t":80,"p":0.9},{"t":100,"p":1.0}]', 60),
('Steady Fall', 'Gradual downward movement', 'bearish',
 '[{"t":0,"p":0},{"t":20,"p":-0.2},{"t":40,"p":-0.5},{"t":60,"p":-0.7},{"t":80,"p":-0.9},{"t":100,"p":-1.0}]', 60),
('Pump and Dump', 'Sharp rise followed by crash', 'reversal',
 '[{"t":0,"p":0},{"t":30,"p":1.5},{"t":50,"p":1.8},{"t":60,"p":1.2},{"t":80,"p":0.3},{"t":100,"p":-0.5}]', 60),
('Sideways Chop', 'Range-bound movement', 'consolidation',
 '[{"t":0,"p":0},{"t":20,"p":0.2},{"t":40,"p":-0.1},{"t":60,"p":0.15},{"t":80,"p":-0.05},{"t":100,"p":0.1}]', 60),
('V Recovery', 'Sharp drop then recovery', 'reversal',
 '[{"t":0,"p":0},{"t":30,"p":-1.0},{"t":50,"p":-1.2},{"t":70,"p":-0.5},{"t":90,"p":0.3},{"t":100,"p":0.8}]', 60)
ON CONFLICT DO NOTHING;

-- ============================================
-- ADMIN ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL, -- 'price_override', 'balance_adjust', 'trade_outcome', etc.
    target_type TEXT, -- 'user', 'trade', 'pair', 'session'
    target_id UUID,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_logs(action);

-- ============================================
-- FUNCTIONS FOR MARKET CONTROL
-- ============================================

-- Function to apply price override
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

-- Function to force trade outcome
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
    -- Get trade
    SELECT * INTO v_trade FROM public.trades WHERE id = p_trade_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    -- Create outcome record
    INSERT INTO public.trade_outcomes (trade_id, user_id, forced_outcome, target_pnl, created_by, note)
    VALUES (p_trade_id, v_trade.user_id, p_outcome, p_target_pnl, p_admin_id, p_note);
    
    -- Log action
    INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (p_admin_id, 'trade_outcome', 'trade', p_trade_id, jsonb_build_object(
        'outcome', p_outcome,
        'target_pnl', p_target_pnl,
        'user_id', v_trade.user_id
    ));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start trading session
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

-- Function to end trading session
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

-- ============================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================

ALTER TABLE public.custom_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_candles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Users can see enabled custom pairs
DROP POLICY IF EXISTS "Users can view enabled pairs" ON public.custom_pairs;
CREATE POLICY "Users can view enabled pairs" ON public.custom_pairs
    FOR SELECT USING (is_enabled = true);

-- Admins can manage all market tables
DROP POLICY IF EXISTS "Admins manage custom_pairs" ON public.custom_pairs;
CREATE POLICY "Admins manage custom_pairs" ON public.custom_pairs
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins manage price_overrides" ON public.price_overrides;
CREATE POLICY "Admins manage price_overrides" ON public.price_overrides
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins manage sessions" ON public.trading_sessions;
CREATE POLICY "Admins manage sessions" ON public.trading_sessions
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can view active sessions" ON public.trading_sessions;
CREATE POLICY "Users can view active sessions" ON public.trading_sessions
    FOR SELECT USING (status IN ('scheduled', 'active'));

DROP POLICY IF EXISTS "Admins manage candles" ON public.custom_candles;
CREATE POLICY "Admins manage candles" ON public.custom_candles
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can view candles" ON public.custom_candles;
CREATE POLICY "Users can view candles" ON public.custom_candles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage outcomes" ON public.trade_outcomes;
CREATE POLICY "Admins manage outcomes" ON public.trade_outcomes
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins view logs" ON public.admin_logs;
CREATE POLICY "Admins view logs" ON public.admin_logs
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins insert logs" ON public.admin_logs;
CREATE POLICY "Admins insert logs" ON public.admin_logs
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users view patterns" ON public.market_patterns;
CREATE POLICY "Users view patterns" ON public.market_patterns
    FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Admins manage patterns" ON public.market_patterns;
CREATE POLICY "Admins manage patterns" ON public.market_patterns
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON public.custom_pairs TO authenticated;
GRANT ALL ON public.price_overrides TO authenticated;
GRANT ALL ON public.trading_sessions TO authenticated;
GRANT ALL ON public.custom_candles TO authenticated;
GRANT ALL ON public.trade_outcomes TO authenticated;
GRANT ALL ON public.market_patterns TO authenticated;
GRANT ALL ON public.admin_logs TO authenticated;


-- ===== notifications_triggers.sql =====
-- =====================================================================
-- NOTIFICATIONS: auto-create a notification for every money event.
-- Triggers on transactions (deposits, stock trades, bridge credits, admin
-- adjustments) and on trades (crypto/FX). The notification bell reads
-- public.notifications, so everything shows up with no route changes.
-- =====================================================================

create or replace function public.tg_txn_notify()
returns trigger language plpgsql security definer as $$
begin
  insert into public.notifications (user_id, type, title, message, metadata)
  values (
    new.user_id,
    coalesce(new.type,'info'),
    initcap(replace(coalesce(new.type,'activity'),'_',' ')),
    coalesce(new.description, initcap(replace(coalesce(new.type,'activity'),'_',' '))),
    jsonb_build_object('amount', new.amount, 'reference_id', new.reference_id, 'source','transaction')
  );
  return new;
exception when others then return new;
end; $$;
drop trigger if exists trg_txn_notify on public.transactions;
create trigger trg_txn_notify after insert on public.transactions
for each row execute function public.tg_txn_notify();

create or replace function public.tg_trade_notify()
returns trigger language plpgsql security definer as $$
declare v_sym text; v_qty text;
begin
  v_sym := coalesce(new.symbol, '');
  begin v_qty := coalesce(new.quantity::text, ''); exception when others then v_qty := ''; end;
  insert into public.notifications (user_id, type, title, message, metadata)
  values (
    new.user_id, 'trade',
    initcap(coalesce(new.type,'trade')) || ' ' || v_sym,
    trim(coalesce(new.type,'trade') || ' ' || v_qty || ' ' || v_sym),
    jsonb_build_object('symbol', v_sym, 'source','trade')
  );
  return new;
exception when others then return new;
end; $$;
drop trigger if exists trg_trade_notify on public.trades;
create trigger trg_trade_notify after insert on public.trades
for each row execute function public.tg_trade_notify();

-- ===== notify_bridge_deposit_withdraw.sql =====
-- =====================================================================
-- NOTIFICATIONS for step-by-step events: SwiftBridge (every stage),
-- deposits (submitted/approved/rejected), withdrawals (requested/processed).
-- These are STATUS UPDATES, so they need their own triggers (insert + status change).
-- Fires into public.notifications, which the bell + recent activity read.
-- =====================================================================

-- ── SwiftBridge: every step ──
create or replace function public.tg_bridge_notify()
returns trigger language plpgsql security definer as $$
declare v_label text; v_msg text;
begin
  if tg_op='UPDATE' and old.status is not distinct from new.status then return new; end if;
  v_label := case new.status
    when 'awaiting_admin'        then 'SwiftBridge — request received'
    when 'awaiting_payment'      then 'SwiftBridge — payment details ready'
    when 'awaiting_verification' then 'SwiftBridge — verifying your payment'
    when 'completed'             then 'SwiftBridge — completed'
    when 'rejected'              then 'SwiftBridge — request rejected'
    when 'expired'               then 'SwiftBridge — request expired'
    when 'cancelled'             then 'SwiftBridge — request cancelled'
    else 'SwiftBridge — update' end;
  v_msg := trim(coalesce(new.local_amount::text,'') || ' ' || coalesce(new.local_currency,'')
    || case when new.status='completed' and new.final_credit_usd is not null
            then ' -> $' || new.final_credit_usd::text || ' credited' else '' end);
  insert into public.notifications (user_id, type, title, message, metadata)
  values (new.user_id, 'bridge', v_label, v_msg,
          jsonb_build_object('request_id', new.id, 'status', new.status, 'source','bridge'));
  return new;
exception when others then return new;
end; $$;
drop trigger if exists trg_bridge_notify on public.bridge_requests;
create trigger trg_bridge_notify after insert or update on public.bridge_requests
for each row execute function public.tg_bridge_notify();

-- ── Deposits (skip 'approved' — the credit transaction already notifies) ──
create or replace function public.tg_deposit_notify()
returns trigger language plpgsql security definer as $$
declare v_label text;
begin
  if tg_op='UPDATE' and old.status is not distinct from new.status then return new; end if;
  if new.status = 'approved' then return new; end if;
  v_label := case new.status
    when 'pending'  then 'Deposit submitted'
    when 'rejected' then 'Deposit rejected'
    else 'Deposit update' end;
  insert into public.notifications (user_id, type, title, message, metadata)
  values (new.user_id, 'deposit', v_label,
          trim('$' || coalesce(new.amount::text,'') || ' ' || coalesce(new.currency,'USD')),
          jsonb_build_object('deposit_id', new.id, 'status', new.status, 'source','deposit'));
  return new;
exception when others then return new;
end; $$;
drop trigger if exists trg_deposit_notify on public.deposits;
create trigger trg_deposit_notify after insert or update on public.deposits
for each row execute function public.tg_deposit_notify();

-- ── Withdrawals (every step) ──
create or replace function public.tg_withdrawal_notify()
returns trigger language plpgsql security definer as $$
declare v_label text;
begin
  if tg_op='UPDATE' and old.status is not distinct from new.status then return new; end if;
  v_label := case new.status
    when 'pending'    then 'Withdrawal requested'
    when 'approved'   then 'Withdrawal approved'
    when 'processing' then 'Withdrawal processing'
    when 'completed'  then 'Withdrawal completed'
    when 'rejected'   then 'Withdrawal rejected'
    else 'Withdrawal update' end;
  insert into public.notifications (user_id, type, title, message, metadata)
  values (new.user_id, 'withdrawal', v_label,
          trim('$' || coalesce(new.amount::text,'') || ' ' || coalesce(new.currency,'USD')),
          jsonb_build_object('withdrawal_id', new.id, 'status', new.status, 'source','withdrawal'));
  return new;
exception when others then return new;
end; $$;
drop trigger if exists trg_withdrawal_notify on public.withdrawals;
create trigger trg_withdrawal_notify after insert or update on public.withdrawals
for each row execute function public.tg_withdrawal_notify();

-- ===== bridge_to_crypto.sql =====
-- =====================================================================
-- SwiftBridge -> CRYPTO: on completion, credit the chosen crypto (target_asset)
-- to the user's crypto holdings (user_trading_data.spot_crypto_state) instead of
-- USD, so it tops the dashboard. Idempotent via crypto_credited flag.
-- =====================================================================
alter table public.bridge_requests add column if not exists credited_amount_usd numeric(20,2);
alter table public.bridge_requests add column if not exists credited_asset text;
alter table public.bridge_requests add column if not exists credited_amount numeric(30,12);
alter table public.bridge_requests add column if not exists crypto_credited boolean default false;

create or replace function public.tg_bridge_credit_crypto()
returns trigger language plpgsql security definer as $$
declare
  v_sym text; v_qty numeric; v_usd numeric;
  v_state jsonb; v_positions jsonb; v_new jsonb := '[]'::jsonb;
  v_found boolean := false; elem jsonb;
begin
  if new.status <> 'completed' then return new; end if;
  if coalesce(new.crypto_credited,false) then return new; end if;

  v_sym := upper(coalesce(new.target_asset,'USDT'));
  v_usd := coalesce(new.final_credit_usd, new.credited_amount_usd, new.estimated_usd, 0);
  v_qty := coalesce(new.final_credit_target, new.estimated_target, v_usd, 0);
  if v_qty <= 0 then return new; end if;

  insert into public.user_trading_data (user_id) values (new.user_id) on conflict (user_id) do nothing;
  select coalesce(spot_crypto_state,'{}'::jsonb) into v_state from public.user_trading_data where user_id=new.user_id;
  v_positions := coalesce(v_state->'positions','[]'::jsonb);

  for elem in select * from jsonb_array_elements(v_positions) loop
    if upper(coalesce(elem->>'symbol','')) = v_sym then
      elem := jsonb_set(elem,'{quantity}', to_jsonb(coalesce((elem->>'quantity')::numeric,0) + v_qty));
      v_found := true;
    end if;
    v_new := v_new || elem;
  end loop;
  if not v_found then
    v_new := v_new || jsonb_build_object('symbol',v_sym,'name',v_sym,'quantity',v_qty,
             'avgBuyPrice', case when v_qty>0 then v_usd/v_qty else 0 end);
  end if;

  update public.user_trading_data
     set spot_crypto_state = jsonb_set(coalesce(v_state,'{}'::jsonb),'{positions}',v_new), updated_at=now()
   where user_id = new.user_id;
  update public.bridge_requests set crypto_credited = true where id = new.id;
  return new;
exception when others then return new;
end; $$;
drop trigger if exists trg_bridge_credit_crypto on public.bridge_requests;
create trigger trg_bridge_credit_crypto after insert or update of status on public.bridge_requests
for each row execute function public.tg_bridge_credit_crypto();

-- ===== fx_teaching.sql =====
-- =====================================================================
-- FX TEACHING ENGINE
-- Admin authors a lesson: timed steps that (a) move the demo price and
-- (b) send an instruction to the Telegram group — at the scheduled time.
-- Self-contained; drives demo_fx_pairs directly (what the FX page reads).
-- =====================================================================
create table if not exists public.fx_lessons (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid,
  pair_symbol text,
  title text,
  status text default 'running',   -- running | completed | stopped
  started_at timestamptz default now(),
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists public.fx_lesson_steps (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid references public.fx_lessons(id) on delete cascade,
  step_order int default 0,
  offset_seconds int not null default 0,  -- seconds after the lesson starts
  target_bid numeric(20,8),               -- optional explicit target price
  target_ask numeric(20,8),
  direction text,                         -- optional: 'up' | 'down'
  pips numeric(12,2),                     -- optional: move N pips in direction
  instruction text,                       -- human note / log
  telegram_message text,                  -- sent to the group at this step
  executed boolean default false,
  executed_at timestamptz
);
create index if not exists idx_fx_lesson_steps_lesson on public.fx_lesson_steps(lesson_id);

alter table public.fx_lessons enable row level security;
alter table public.fx_lesson_steps enable row level security;
drop policy if exists fx_lessons_read on public.fx_lessons;
create policy fx_lessons_read on public.fx_lessons for select using (true);
drop policy if exists fx_lesson_steps_read on public.fx_lesson_steps;
create policy fx_lesson_steps_read on public.fx_lesson_steps for select using (true);

-- ===== bridge_converter.sql =====
-- =====================================================================
-- SwiftBridge converter support + clearer notifications.
-- usd_rate: admin-set "1 USD = X local" per country (converter falls back to
-- a live rate if unset). And restate bridge notifications with sent/received.
-- =====================================================================
alter table public.bridge_countries add column if not exists usd_rate numeric(20,6);

create or replace function public.tg_bridge_notify()
returns trigger language plpgsql security definer as $$
declare v_label text; v_msg text;
begin
  if tg_op='UPDATE' and old.status is not distinct from new.status then return new; end if;
  v_label := case new.status
    when 'awaiting_admin'        then 'SwiftBridge — request received'
    when 'awaiting_payment'      then 'SwiftBridge — payment details ready'
    when 'awaiting_verification' then 'SwiftBridge — verifying your payment'
    when 'completed'             then 'SwiftBridge — completed'
    when 'rejected'              then 'SwiftBridge — request rejected'
    when 'expired'               then 'SwiftBridge — request expired'
    when 'cancelled'             then 'SwiftBridge — request cancelled'
    else 'SwiftBridge — update' end;

  if new.status = 'completed' then
    v_msg := 'Sent ' || coalesce(new.local_amount::text,'') || ' ' || coalesce(new.local_currency,'')
          || ' · received ' || coalesce(new.final_credit_target, new.estimated_target, 0)::text || ' ' || coalesce(new.target_asset,'')
          || case when coalesce(new.final_credit_usd,new.estimated_usd) is not null
                  then ' (~$' || coalesce(new.final_credit_usd,new.estimated_usd)::text || ')' else '' end;
  else
    v_msg := trim(coalesce(new.local_amount::text,'') || ' ' || coalesce(new.local_currency,'')
          || ' → ' || coalesce(new.target_asset,''));
  end if;

  insert into public.notifications (user_id, type, title, message, metadata)
  values (new.user_id, 'bridge', v_label, v_msg,
          jsonb_build_object('request_id', new.id, 'status', new.status, 'source','bridge'));
  return new;
exception when others then return new;
end; $$;
drop trigger if exists trg_bridge_notify on public.bridge_requests;
create trigger trg_bridge_notify after insert or update on public.bridge_requests
for each row execute function public.tg_bridge_notify();

-- ===== bridge_credit_modes.sql =====
-- =====================================================================
-- SwiftBridge credit modes: receive as CRYPTO (adds to holdings) OR as
-- USD (updates cash balance only). Driven by target_asset:
--   target_asset = 'USD'  -> credit balance_available
--   otherwise             -> credit crypto holdings (existing behavior)
-- Replaces tg_bridge_credit_crypto.
-- =====================================================================
create or replace function public.tg_bridge_credit_crypto()
returns trigger language plpgsql security definer as $$
declare
  v_sym text; v_qty numeric; v_usd numeric;
  v_state jsonb; v_positions jsonb; v_new jsonb := '[]'::jsonb;
  v_found boolean := false; elem jsonb;
begin
  if new.status <> 'completed' then return new; end if;
  if coalesce(new.crypto_credited,false) then return new; end if;

  v_sym := upper(coalesce(new.target_asset,'USDT'));
  v_usd := coalesce(new.final_credit_usd, new.credited_amount_usd, new.estimated_usd, 0);

  -- USD mode: just top up cash balance
  if v_sym = 'USD' then
    if v_usd > 0 then
      update public.users
         set balance_available = coalesce(balance_available,0) + v_usd, updated_at = now()
       where id = new.user_id;
    end if;
    update public.bridge_requests set crypto_credited = true where id = new.id;
    return new;
  end if;

  -- Crypto mode: add coin to holdings
  v_qty := coalesce(new.final_credit_target, new.estimated_target, 0);
  if v_qty <= 0 then return new; end if;

  insert into public.user_trading_data (user_id) values (new.user_id) on conflict (user_id) do nothing;
  select coalesce(spot_crypto_state,'{}'::jsonb) into v_state from public.user_trading_data where user_id=new.user_id;
  v_positions := coalesce(v_state->'positions','[]'::jsonb);

  for elem in select * from jsonb_array_elements(v_positions) loop
    if upper(coalesce(elem->>'symbol','')) = v_sym then
      elem := jsonb_set(elem,'{quantity}', to_jsonb(coalesce((elem->>'quantity')::numeric,0) + v_qty));
      v_found := true;
    end if;
    v_new := v_new || elem;
  end loop;
  if not v_found then
    v_new := v_new || jsonb_build_object('symbol',v_sym,'name',v_sym,'quantity',v_qty,
             'avgBuyPrice', case when v_qty>0 then v_usd/v_qty else 0 end);
  end if;

  update public.user_trading_data
     set spot_crypto_state = jsonb_set(coalesce(v_state,'{}'::jsonb),'{positions}',v_new), updated_at=now()
   where user_id = new.user_id;
  update public.bridge_requests set crypto_credited = true where id = new.id;
  return new;
exception when others then return new;
end; $$;
drop trigger if exists trg_bridge_credit_crypto on public.bridge_requests;
create trigger trg_bridge_credit_crypto after insert or update of status on public.bridge_requests
for each row execute function public.tg_bridge_credit_crypto();

-- ===== 99_completion.sql =====

-- =====================================================================
-- SWIFT TRADE — 99 COMPLETION PATCH
-- Fills the real gaps: confirm_deposit + update_user_balance (SwiftTrade
-- shape), the two stub RPCs, and the user_trading_data crypto fix.
-- Idempotent.
-- =====================================================================

-- ── confirm_deposit(p_deposit_id, p_admin_id, p_note) ──
create or replace function public.confirm_deposit(p_deposit_id uuid, p_admin_id uuid, p_note text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_dep record; v_bal numeric;
begin
  select * into v_dep from public.deposits where id = p_deposit_id and status = 'pending' for update;
  if not found then return false; end if;

  update public.deposits
     set status='approved', confirmed_by=p_admin_id, confirmed_at=now(),
         admin_notes=coalesce(p_note, admin_notes), updated_at=now()
   where id = p_deposit_id;

  select balance_available into v_bal from public.users where id = v_dep.user_id for update;
  update public.users
     set balance_available = coalesce(balance_available,0) + v_dep.amount,
         total_deposited   = coalesce(total_deposited,0) + v_dep.amount,
         updated_at = now()
   where id = v_dep.user_id;

  begin
    insert into public.transactions(user_id, type, amount, currency, balance_after, description, reference_id, status)
    values (v_dep.user_id, 'deposit', v_dep.amount, coalesce(v_dep.currency,'USD'),
            coalesce(v_bal,0) + v_dep.amount, 'Deposit confirmed', p_deposit_id, 'completed');
  exception when others then null; end;

  return true;
end; $$;
grant execute on function public.confirm_deposit(uuid,uuid,text) to authenticated, service_role;

-- ── update_user_balance(p_user_id, p_amount, p_type, p_description) ──
create or replace function public.update_user_balance(p_user_id uuid, p_amount numeric, p_type text, p_description text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_bal numeric; v_new numeric;
begin
  select balance_available into v_bal from public.users where id = p_user_id for update;
  if not found then return false; end if;

  if p_type = 'credit' then v_new := coalesce(v_bal,0) + p_amount;
  elsif p_type = 'debit' then
    v_new := coalesce(v_bal,0) - p_amount;
    if v_new < 0 then return false; end if;
  else return false; end if;

  update public.users set balance_available = v_new, updated_at = now() where id = p_user_id;

  begin
    insert into public.transactions(user_id, type, amount, currency, balance_after, description, status)
    values (p_user_id, case when p_type='credit' then 'deposit' else 'withdrawal' end,
            p_amount, 'USD', v_new, coalesce(p_description, 'Admin adjustment'), 'completed');
  exception when others then null; end;

  return true;
end; $$;
grant execute on function public.update_user_balance(uuid,numeric,text,text) to authenticated, service_role;

-- ── stubs for functions absent from the whole codebase ──
create or replace function public.try_spend_market_budget(p_amount numeric default 0, p_key text default null)
returns boolean language sql as $$ select true $$;
create or replace function public.complete_referral(p_user uuid default null, p_referrer uuid default null)
returns boolean language sql as $$ select true $$;

-- ── user_trading_data: crypto persistence (column + RLS policy were missing) ──
alter table public.user_trading_data add column if not exists spot_crypto_state jsonb default '{}'::jsonb;
drop policy if exists utd_owner on public.user_trading_data;
create policy utd_owner on public.user_trading_data for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── belt-and-suspenders: RLS on user_trading_data enabled ──
do $$ begin alter table public.user_trading_data enable row level security; exception when others then null; end $$;
