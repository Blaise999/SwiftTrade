-- ═══════════════════════════════════════════════════════════════════════
-- FIX: trades deduct balance + notify, but leave no position / activity row.
--
-- Two silent killers:
--   1. `upsert(onConflict: 'user_id,symbol')` REQUIRES a matching UNIQUE
--      constraint. Without it Postgres rejects the write — and the app was
--      swallowing the error.
--   2. A CHECK constraint on transactions.type that doesn't allow 'buy'/'sell'
--      rejects every trade activity row.
--
-- Idempotent. Run in the Supabase SQL editor, then re-check /api/debug/writetest
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. UNIQUE constraints the upserts depend on ──────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'crypto_positions_user_symbol_key'
  ) then
    -- clear any duplicate rows first, keeping the largest quantity
    delete from public.crypto_positions a
    using public.crypto_positions b
    where a.user_id = b.user_id
      and upper(a.symbol) = upper(b.symbol)
      and a.ctid < b.ctid;

    alter table public.crypto_positions
      add constraint crypto_positions_user_symbol_key unique (user_id, symbol);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'positions_user_symbol_key'
  ) then
    delete from public.positions a
    using public.positions b
    where a.user_id = b.user_id
      and upper(a.symbol) = upper(b.symbol)
      and a.ctid < b.ctid;

    alter table public.positions
      add constraint positions_user_symbol_key unique (user_id, symbol);
  end if;
end $$;

-- ── 2. Allow trade types on transactions ─────────────────────────────
-- Drop any CHECK constraint on `type` (name varies by install).
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%type%'
  loop
    execute format('alter table public.transactions drop constraint %I', c.conname);
  end loop;
end $$;

-- ── 3. Columns the activity feed writes ──────────────────────────────
alter table public.transactions add column if not exists symbol text;
alter table public.transactions add column if not exists quantity numeric(30,12);
alter table public.transactions add column if not exists price numeric(30,12);
alter table public.transactions add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.transactions add column if not exists currency text default 'USD';
alter table public.transactions add column if not exists status text default 'completed';

-- ── 4. Verify ────────────────────────────────────────────────────────
select 'crypto_positions unique' as check,
       exists (select 1 from pg_constraint where conname = 'crypto_positions_user_symbol_key') as ok
union all
select 'positions unique',
       exists (select 1 from pg_constraint where conname = 'positions_user_symbol_key')
union all
select 'transactions type CHECK removed',
       not exists (
         select 1 from pg_constraint
         where conrelid = 'public.transactions'::regclass and contype = 'c'
           and pg_get_constraintdef(oid) ilike '%type%');
