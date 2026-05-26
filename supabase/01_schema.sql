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
