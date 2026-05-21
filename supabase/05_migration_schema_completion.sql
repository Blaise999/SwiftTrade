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
