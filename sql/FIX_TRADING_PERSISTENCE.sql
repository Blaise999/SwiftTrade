-- =====================================================================
-- FIX: trades deduct balance but positions never save.
--
-- Root cause: the app writes to tables/columns that don't exist in the
-- live database, so the inserts fail while the balance update succeeds.
--   * public.positions      — MISSING (every stock buy failed)
--   * public.orders         — MISSING (order audit rows failed)
--   * user_trading_data.spot_crypto_state — MISSING column (crypto state failed)
--
-- Safe to run more than once. Run this in the Supabase SQL editor.
-- =====================================================================

-- 1. STOCK POSITIONS -------------------------------------------------
create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  symbol text not null,
  asset_type text default 'stock',
  quantity numeric(30,12) default 0,
  avg_entry_price numeric(30,12),
  market_value numeric(20,2),
  shield_enabled boolean default false,
  shield_activated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, symbol)
);
create index if not exists idx_positions_user on public.positions(user_id);

-- columns for older installs that already had the table
alter table public.positions add column if not exists asset_type text default 'stock';
alter table public.positions add column if not exists market_value numeric(20,2);
alter table public.positions add column if not exists shield_enabled boolean default false;
alter table public.positions add column if not exists shield_activated_at timestamptz;
alter table public.positions add column if not exists updated_at timestamptz default now();

-- 2. ORDERS (audit trail) --------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  symbol text not null,
  asset_type text default 'stock',
  side text not null,
  amount_type text,
  amount numeric(20,2),
  quantity numeric(30,12),
  price numeric(30,12),
  status text default 'filled',
  created_at timestamptz default now()
);
create index if not exists idx_orders_user on public.orders(user_id);

-- 3. CRYPTO STATE COLUMN ---------------------------------------------
-- the app stores its spot crypto positions here
alter table public.user_trading_data
  add column if not exists spot_crypto_state jsonb default '{}'::jsonb;

-- crypto_positions shield columns (used by shield toggle)
alter table public.crypto_positions add column if not exists shield_enabled boolean default false;
alter table public.crypto_positions add column if not exists shield_activated_at timestamptz;

-- 4. TRANSACTIONS columns used by the activity feed -------------------
alter table public.transactions add column if not exists symbol text;
alter table public.transactions add column if not exists quantity numeric(30,12);
alter table public.transactions add column if not exists price numeric(30,12);
alter table public.transactions add column if not exists metadata jsonb default '{}'::jsonb;

-- 5. RLS — the API uses the service-role key (which bypasses RLS),
--    these policies are for any direct client reads.
alter table public.positions enable row level security;
drop policy if exists positions_owner on public.positions;
create policy positions_owner on public.positions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.orders enable row level security;
drop policy if exists orders_owner on public.orders;
create policy orders_owner on public.orders for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. Verify — should return all rows with exists = true
select 'positions' as object,
       to_regclass('public.positions') is not null as exists
union all
select 'orders', to_regclass('public.orders') is not null
union all
select 'user_trading_data.spot_crypto_state',
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'user_trading_data'
                 and column_name = 'spot_crypto_state');
