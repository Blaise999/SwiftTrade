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


-- =====================================================================
-- 19. COLUMN COMPLETION (auto-generated from app code analysis)
-- =====================================================================
-- These cover columns the app references that may be missing from the
-- core CREATE TABLE blocks above (e.g. from incremental feature work).
-- Every statement is idempotent (`add column if not exists`).

-- users
alter table public.users add column if not exists balance_locked numeric(20,2) default 0;
alter table public.users add column if not exists bonus_balance numeric(20,2) default 0;
alter table public.users add column if not exists deposit_address text;
alter table public.users add column if not exists deposit_network text;
alter table public.users add column if not exists is_verified boolean default false;
alter table public.users add column if not exists kyc_data jsonb default '{}'::jsonb;
alter table public.users add column if not exists kyc_level int default 0;
alter table public.users add column if not exists kyc_rejection_reason text;
alter table public.users add column if not exists kyc_reviewed_at timestamptz;
alter table public.users add column if not exists kyc_reviewed_by uuid;
alter table public.users add column if not exists kyc_reviewer_id uuid;
alter table public.users add column if not exists kyc_submitted_at timestamptz;
alter table public.users add column if not exists pnl numeric(20,2) default 0;
alter table public.users add column if not exists referral_count int default 0;
alter table public.users add column if not exists tier_activated_at timestamptz;
alter table public.users add column if not exists tier_active boolean default false;
alter table public.users add column if not exists tier_code text;
alter table public.users add column if not exists tier_level int default 0;
alter table public.users add column if not exists tier_purchase_network text;
alter table public.users add column if not exists tier_purchase_wallet text;
alter table public.users add column if not exists total_profit_loss numeric(20,2) default 0;
alter table public.users add column if not exists total_withdrawn numeric(20,2) default 0;
alter table public.users add column if not exists last_seen_at timestamptz;
alter table public.users add column if not exists ip_address text;

-- trades
alter table public.trades add column if not exists asset text;
alter table public.trades add column if not exists close_reason text;
alter table public.trades add column if not exists current_price numeric(30,12);
alter table public.trades add column if not exists direction_int int;
alter table public.trades add column if not exists duration_seconds int;
alter table public.trades add column if not exists fees numeric(20,4) default 0;
alter table public.trades add column if not exists floating_pnl numeric(20,2) default 0;
alter table public.trades add column if not exists idempotency_key text;
alter table public.trades add column if not exists investment numeric(20,2);
alter table public.trades add column if not exists lot_size numeric(20,4);
alter table public.trades add column if not exists margin_used numeric(20,2) default 0;
alter table public.trades add column if not exists meta jsonb default '{}'::jsonb;
alter table public.trades add column if not exists multiplier numeric(10,2) default 1;
alter table public.trades add column if not exists payout_percent numeric(10,4);
alter table public.trades add column if not exists pnl_pct numeric(10,4);
alter table public.trades add column if not exists pnl_percentage numeric(10,4);
alter table public.trades add column if not exists reason text;
alter table public.trades add column if not exists referrer_id uuid references public.users(id);
alter table public.trades add column if not exists repaired boolean default false;
alter table public.trades add column if not exists repaired_at timestamptz;
alter table public.trades add column if not exists repaired_by uuid references public.users(id);
alter table public.trades add column if not exists session_id uuid;
alter table public.trades add column if not exists source text default 'web';
alter table public.trades add column if not exists trade_type text;

-- deposits / withdrawals
alter table public.deposits add column if not exists address_shown text;
alter table public.deposits add column if not exists admin_note text;
alter table public.deposits add column if not exists order_id text;
alter table public.deposits add column if not exists payment_asset text;
alter table public.deposits add column if not exists processed_at timestamptz;
alter table public.deposits add column if not exists processed_by uuid references public.users(id);
alter table public.deposits add column if not exists rejection_reason text;
alter table public.withdrawals add column if not exists admin_note text;
alter table public.withdrawals add column if not exists rejection_reason text;

-- transactions
alter table public.transactions add column if not exists balance_before numeric(20,2);
alter table public.transactions add column if not exists balance_after numeric(20,2);
alter table public.transactions add column if not exists created_by uuid references public.users(id);
alter table public.transactions add column if not exists fee numeric(20,4) default 0;
alter table public.transactions add column if not exists reference_type text;
alter table public.transactions add column if not exists source text default 'system';

-- tier_purchases
alter table public.tier_purchases add column if not exists tier_active boolean default false;

-- email_otps
alter table public.email_otps add column if not exists otp_hash text;
alter table public.email_otps add column if not exists attempts int default 0;
alter table public.email_otps add column if not exists max_attempts int default 5;
alter table public.email_otps add column if not exists used_at timestamptz;

-- kyc_documents
alter table public.kyc_documents add column if not exists file_size bigint;
alter table public.kyc_documents add column if not exists mime_type text;
alter table public.kyc_documents add column if not exists doc_number text;
alter table public.kyc_documents add column if not exists country text;
alter table public.kyc_documents add column if not exists expiry_date date;

-- notifications
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists body text;

-- support_messages / support_tickets
alter table public.support_messages add column if not exists read_at timestamptz;
alter table public.support_messages add column if not exists sender_type text default 'user';
alter table public.support_tickets add column if not exists resolved_at timestamptz;
alter table public.support_tickets add column if not exists assigned_to uuid references public.users(id);

-- admin tables
alter table public.admin_alerts add column if not exists request_id uuid;
alter table public.admin_alerts add column if not exists user_id uuid references public.users(id);
alter table public.admin_alerts add column if not exists title text;
alter table public.admin_alerts add column if not exists body text;
alter table public.admin_alerts add column if not exists action_url text;
alter table public.admin_alerts add column if not exists priority text default 'normal';

alter table public.admin_audit_log add column if not exists chat_id text;
alter table public.admin_audit_log add column if not exists duration_minutes int;
alter table public.admin_audit_log add column if not exists entry_time timestamptz;
alter table public.admin_audit_log add column if not exists "from" text;
alter table public.admin_audit_log add column if not exists label text;
alter table public.admin_audit_log add column if not exists message_length int;
alter table public.admin_audit_log add column if not exists meta jsonb default '{}'::jsonb;
alter table public.admin_audit_log add column if not exists profit_percent numeric(10,4);
alter table public.admin_audit_log add column if not exists seq bigint;
alter table public.admin_audit_log add column if not exists session_id uuid;
alter table public.admin_audit_log add column if not exists target_user_id uuid references public.users(id);
alter table public.admin_audit_log add column if not exists telegram_sent boolean default false;
alter table public.admin_audit_log add column if not exists telegram_message_id text;
alter table public.admin_audit_log add column if not exists tick_ok boolean;
alter table public.admin_audit_log add column if not exists "to" text;
alter table public.admin_audit_log add column if not exists trades_closed int;
alter table public.admin_audit_log add column if not exists trades_repriced int;
alter table public.admin_audit_log add column if not exists updates int;
alter table public.admin_audit_log add column if not exists wallet_id uuid;
alter table public.admin_audit_log add column if not exists wallet_type text;

alter table public.admin_logs add column if not exists user_id uuid references public.users(id);
alter table public.admin_logs add column if not exists user_agent text;
alter table public.admin_logs add column if not exists action text;
alter table public.admin_logs add column if not exists action_category text;
alter table public.admin_logs add column if not exists details jsonb default '{}'::jsonb;
alter table public.admin_logs add column if not exists ip_address text;
alter table public.admin_logs add column if not exists old_values jsonb;
alter table public.admin_logs add column if not exists reason text;
alter table public.admin_logs add column if not exists target_id uuid;
alter table public.admin_logs add column if not exists target_type text;

alter table public.admin_sessions add column if not exists ip_address text;
alter table public.admin_sessions add column if not exists last_activity_at timestamptz;
alter table public.admin_sessions add column if not exists revoked_at timestamptz;
alter table public.admin_sessions add column if not exists token_hash text;
alter table public.admin_sessions add column if not exists user_id uuid references public.users(id);

-- crypto_positions / user_trading_data
alter table public.crypto_positions add column if not exists average_price numeric(30,12);
alter table public.crypto_positions add column if not exists shield_activated_at timestamptz;
alter table public.crypto_positions add column if not exists shield_enabled boolean default false;
alter table public.crypto_positions add column if not exists shield_snap_price numeric(30,12);
alter table public.crypto_positions add column if not exists shield_snap_value numeric(20,2);
alter table public.crypto_positions add column if not exists total_cost_basis numeric(20,2) default 0;
alter table public.user_trading_data add column if not exists spot_crypto_state jsonb default '{}'::jsonb;
alter table public.user_trading_data add column if not exists spot_stocks_state jsonb default '{}'::jsonb;

-- bridge_requests
alter table public.bridge_requests add column if not exists admin_id uuid references public.users(id);
alter table public.bridge_requests add column if not exists admin_notes text;
alter table public.bridge_requests add column if not exists admin_payment_details jsonb default '{}'::jsonb;
alter table public.bridge_requests add column if not exists admin_responded_at timestamptz;
alter table public.bridge_requests add column if not exists credited_amount numeric(30,12);
alter table public.bridge_requests add column if not exists credited_amount_usd numeric(20,2);
alter table public.bridge_requests add column if not exists credited_asset text;
alter table public.bridge_requests add column if not exists estimated_credit_usd numeric(20,2);

-- shield_events
alter table public.shield_events add column if not exists cost_basis numeric(20,2);
alter table public.shield_events add column if not exists duration_seconds int;
alter table public.shield_events add column if not exists event_type text;
alter table public.shield_events add column if not exists market_price numeric(30,12);
alter table public.shield_events add column if not exists market_value numeric(20,2);
alter table public.shield_events add column if not exists position_id uuid;
alter table public.shield_events add column if not exists quantity numeric(30,12);
alter table public.shield_events add column if not exists shield_impact numeric(20,2);
alter table public.shield_events add column if not exists snap_price numeric(30,12);
alter table public.shield_events add column if not exists snap_value numeric(20,2);
alter table public.shield_events add column if not exists symbol text;

-- referrals
alter table public.referrals add column if not exists reward_amount numeric(20,2) default 0;
alter table public.referrals add column if not exists reward_paid boolean default false;
alter table public.referrals add column if not exists reward_paid_at timestamptz;
alter table public.referrals add column if not exists reward_trigger text;
alter table public.referrals add column if not exists updated_at timestamptz default now();

-- platform / payment methods
alter table public.platform_wallets add column if not exists confirmations int default 6;
alter table public.platform_wallets add column if not exists min_amount numeric(20,2);
alter table public.platform_wallets add column if not exists wallet_type text default 'crypto';
alter table public.payment_methods add column if not exists enabled boolean default true;
alter table public.user_deposit_wallets add column if not exists label text;
alter table public.user_deposit_wallets add column if not exists wallet_type text default 'crypto';

-- custom_pairs / price_overrides
alter table public.custom_pairs add column if not exists ask_price numeric(30,12);
alter table public.custom_pairs add column if not exists bid_price numeric(30,12);
alter table public.custom_pairs add column if not exists current_price numeric(30,12);
alter table public.custom_pairs add column if not exists created_by uuid references public.users(id);
alter table public.custom_pairs add column if not exists is_enabled boolean default true;
alter table public.price_overrides add column if not exists updated_at timestamptz default now();
alter table public.price_overrides add column if not exists updated_by uuid references public.users(id);

-- platform settings
alter table public.platform_settings add column if not exists updated_by uuid references public.users(id);

-- demo_fx_*
alter table public.demo_fx_pairs add column if not exists active_scenario_id uuid;
alter table public.demo_fx_pairs add column if not exists active_session_id uuid;
alter table public.demo_fx_pairs add column if not exists base_currency text;
alter table public.demo_fx_pairs add column if not exists quote_currency text;
alter table public.demo_fx_pairs add column if not exists display_order int default 0;
alter table public.demo_fx_pairs add column if not exists mode text default 'normal';
alter table public.demo_fx_pairs add column if not exists price_updated_at timestamptz default now();
alter table public.demo_fx_pairs add column if not exists seq bigint default 0;
alter table public.demo_fx_pairs add column if not exists spread numeric(30,12) default 0.0002;

alter table public.demo_fx_sessions add column if not exists completed_at timestamptz;
alter table public.demo_fx_sessions add column if not exists created_by uuid references public.users(id);
alter table public.demo_fx_sessions add column if not exists duration_ms bigint default 0;
alter table public.demo_fx_sessions add column if not exists elapsed_ms bigint default 0;
alter table public.demo_fx_sessions add column if not exists lesson_description text;
alter table public.demo_fx_sessions add column if not exists lesson_title text;
alter table public.demo_fx_sessions add column if not exists pair_id uuid references public.demo_fx_pairs(id);
alter table public.demo_fx_sessions add column if not exists paused_at timestamptz;
alter table public.demo_fx_sessions add column if not exists session_type text default 'lesson';
alter table public.demo_fx_sessions add column if not exists start_ask numeric(30,12);
alter table public.demo_fx_sessions add column if not exists start_bid numeric(30,12);
alter table public.demo_fx_sessions add column if not exists student_instructions text;
alter table public.demo_fx_sessions add column if not exists target_ask numeric(30,12);
alter table public.demo_fx_sessions add column if not exists target_bid numeric(30,12);
alter table public.demo_fx_sessions add column if not exists tick_interval_ms int default 1000;
alter table public.demo_fx_sessions add column if not exists tick_seq bigint default 0;
alter table public.demo_fx_sessions add column if not exists volatility numeric(10,6) default 0.0001;

alter table public.demo_fx_ticks add column if not exists ask numeric(30,12);
alter table public.demo_fx_ticks add column if not exists mid numeric(30,12);
alter table public.demo_fx_ticks add column if not exists seq bigint default 0;
alter table public.demo_fx_ticks add column if not exists source text default 'engine';

alter table public.demo_fx_candles add column if not exists bucket_start timestamptz;
alter table public.demo_fx_candles add column if not exists close numeric(30,12);
alter table public.demo_fx_candles add column if not exists high numeric(30,12);
alter table public.demo_fx_candles add column if not exists low numeric(30,12);
alter table public.demo_fx_candles add column if not exists tick_count int default 0;

alter table public.demo_fx_price_log add column if not exists ask numeric(30,12);
alter table public.demo_fx_price_log add column if not exists logged_at timestamptz default now();
alter table public.demo_fx_price_log add column if not exists source text default 'engine';

alter table public.demo_fx_scenarios add column if not exists completed_at timestamptz;
alter table public.demo_fx_scenarios add column if not exists current_step_index int default 0;
alter table public.demo_fx_scenarios add column if not exists elapsed_ms bigint default 0;
alter table public.demo_fx_scenarios add column if not exists pair_id uuid references public.demo_fx_pairs(id);
alter table public.demo_fx_scenarios add column if not exists scheduled_at timestamptz;
alter table public.demo_fx_scenarios add column if not exists started_at timestamptz;

alter table public.demo_fx_scenario_steps add column if not exists step_index int default 0;
alter table public.demo_fx_scenario_steps add column if not exists target_ask numeric(30,12);
alter table public.demo_fx_scenario_steps add column if not exists target_bid numeric(30,12);

alter table public.demo_fx_trades add column if not exists close_reason text;
alter table public.demo_fx_trades add column if not exists current_price numeric(30,12);
alter table public.demo_fx_trades add column if not exists direction text;
alter table public.demo_fx_trades add column if not exists direction_label text;
alter table public.demo_fx_trades add column if not exists entry_ask numeric(30,12);
alter table public.demo_fx_trades add column if not exists entry_bid numeric(30,12);
alter table public.demo_fx_trades add column if not exists exit_price numeric(30,12);
alter table public.demo_fx_trades add column if not exists final_pnl numeric(20,2) default 0;
alter table public.demo_fx_trades add column if not exists floating_pnl numeric(20,2) default 0;
alter table public.demo_fx_trades add column if not exists investment numeric(20,2);
alter table public.demo_fx_trades add column if not exists liquidation_price numeric(30,12);
alter table public.demo_fx_trades add column if not exists multiplier numeric(10,2) default 1;
alter table public.demo_fx_trades add column if not exists spread_cost numeric(20,4) default 0;
alter table public.demo_fx_trades add column if not exists stop_loss numeric(30,12);
alter table public.demo_fx_trades add column if not exists symbol text;
alter table public.demo_fx_trades add column if not exists take_profit numeric(30,12);

-- educational_scenarios
alter table public.educational_scenarios add column if not exists created_by uuid references public.users(id);


-- =====================================================================
-- 20. INVESTING: ASSETS / ETF CLASSIFICATION + PIES (Phase 2-ready)
-- =====================================================================
create table if not exists public.assets (
    id uuid primary key default uuid_generate_v4(),
    symbol text unique not null,
    name text,
    asset_type text default 'stock' check (asset_type in ('stock','etf')),
    category text,                       -- sp500 | nasdaq_100 | dividend | ...
    exchange text,
    alpaca_asset_id text,
    tradable boolean default true,
    fractionable boolean default true,
    marginable boolean default false,
    shortable boolean default false,
    logo_url text,
    description text,
    expense_ratio numeric(8,4),
    dividend_yield numeric(8,4),
    tracks text,
    seed_price numeric(20,4),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index if not exists idx_assets_type on public.assets(asset_type);
create index if not exists idx_assets_category on public.assets(category);

create table if not exists public.user_watchlists (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    symbol text not null,
    created_at timestamptz default now(),
    unique (user_id, symbol)
);

create table if not exists public.orders (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    symbol text not null,
    asset_type text default 'stock',
    side text check (side in ('buy','sell')),
    order_type text default 'market',
    time_in_force text default 'day',
    amount_type text check (amount_type in ('notional','qty')),
    notional_amount numeric(20,2),
    quantity numeric(30,12),
    estimated_price numeric(20,4),
    status text default 'pending',
    broker_order_id text,
    raw_broker_response jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index if not exists idx_orders_user on public.orders(user_id);

create table if not exists public.positions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    symbol text not null,
    asset_type text default 'stock',
    quantity numeric(30,12) default 0,
    market_value numeric(20,2) default 0,
    avg_entry_price numeric(20,4),
    unrealized_pl numeric(20,2) default 0,
    unrealized_pl_percent numeric(10,4) default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (user_id, symbol)
);

create table if not exists public.pies (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    name text not null,
    description text,
    recurring_amount numeric(20,2),
    recurring_frequency text check (recurring_frequency in ('daily','weekly','monthly')),
    status text default 'active',
    created_at timestamptz default now()
);

create table if not exists public.pie_allocations (
    id uuid primary key default uuid_generate_v4(),
    pie_id uuid not null references public.pies(id) on delete cascade,
    symbol text not null,
    percentage numeric(6,2) not null,
    created_at timestamptz default now()
);

create table if not exists public.recurring_investments (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    target_type text check (target_type in ('asset','pie')),
    symbol text,
    pie_id uuid references public.pies(id) on delete cascade,
    amount numeric(20,2) not null,
    frequency text check (frequency in ('daily','weekly','monthly')),
    next_run_at timestamptz,
    status text default 'active',
    created_at timestamptz default now()
);
create index if not exists idx_recurring_user on public.recurring_investments(user_id);

-- updated_at triggers
do $$ declare t text; begin
  for t in select unnest(array['assets','orders','positions']) loop
    execute format('drop trigger if exists trg_%I_updated on public.%I', t, t);
    execute format('create trigger trg_%I_updated before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- RLS
alter table public.assets enable row level security;
alter table public.user_watchlists enable row level security;
alter table public.orders enable row level security;
alter table public.positions enable row level security;
alter table public.pies enable row level security;
alter table public.pie_allocations enable row level security;
alter table public.recurring_investments enable row level security;

drop policy if exists "assets read" on public.assets;
create policy "assets read" on public.assets for select using (true);
drop policy if exists "assets admin" on public.assets;
create policy "assets admin" on public.assets for all using (public.is_admin()) with check (public.is_admin());

do $$ declare t text; begin
  for t in select unnest(array['user_watchlists','orders','positions','pies','recurring_investments']) loop
    execute format('drop policy if exists "%s self" on public.%I', t, t);
    execute format('create policy "%s self" on public.%I for all
      using (auth.uid() = user_id or public.is_admin())
      with check (auth.uid() = user_id or public.is_admin())', t, t);
  end loop;
end $$;

drop policy if exists "pie_alloc self" on public.pie_allocations;
create policy "pie_alloc self" on public.pie_allocations for all
  using (exists (select 1 from public.pies p where p.id = pie_id and (p.user_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.pies p where p.id = pie_id and (p.user_id = auth.uid() or public.is_admin())));

-- Done.
