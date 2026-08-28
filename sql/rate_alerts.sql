-- ═══════════════════════════════════════════════════════════════
-- Bridge rate alerts + recurring transfers. Idempotent.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.rate_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  base text not null default 'USD',
  quote text not null,                       -- e.g. NGN, HKD, PHP
  direction text not null default 'above',   -- 'above' | 'below'
  target numeric(20,6) not null,
  active boolean default true,
  last_rate numeric(20,6),
  triggered_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_rate_alerts_user on public.rate_alerts(user_id);
create index if not exists idx_rate_alerts_active on public.rate_alerts(active) where active;

create table if not exists public.recurring_bridges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  country_code text,
  local_currency text not null,
  local_amount numeric(20,2) not null,
  target_asset text not null default 'USD',
  cadence text not null default 'monthly',   -- weekly | biweekly | monthly
  day_of_month int default 1,
  next_run date,
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_recurring_bridges_user on public.recurring_bridges(user_id);

alter table public.rate_alerts enable row level security;
drop policy if exists rate_alerts_owner on public.rate_alerts;
create policy rate_alerts_owner on public.rate_alerts for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.recurring_bridges enable row level security;
drop policy if exists recurring_bridges_owner on public.recurring_bridges;
create policy recurring_bridges_owner on public.recurring_bridges for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
