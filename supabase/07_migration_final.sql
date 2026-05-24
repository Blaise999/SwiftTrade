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
