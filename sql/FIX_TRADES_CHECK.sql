-- ═══════════════════════════════════════════════════════════════════
-- From the Supabase logs during a live buy:
--   POST /rest/v1/trades -> 400
--   23514: new row for relation "trades" violates check constraint
--          "trades_type_check"
--
-- The trades table has a CHECK on `type` that predates the values the
-- app now writes ('buy' / 'sell' / 'crypto' / 'stock'). Every trade row
-- was being rejected, which is why history looked empty.
-- ═══════════════════════════════════════════════════════════════════

-- inspect what it currently allows (run this first if you're curious)
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.trades'::regclass and contype = 'c';

alter table public.trades drop constraint if exists trades_type_check;

-- re-add a permissive version so bad data still can't get in
alter table public.trades
  add constraint trades_type_check
  check (type is null or type in (
    'buy','sell','long','short','call','put',
    'crypto','stock','etf','fx','spot','margin','bridge'
  ));

-- columns the app writes
alter table public.trades add column if not exists symbol text;
alter table public.trades add column if not exists quantity numeric(30,12);
alter table public.trades add column if not exists price numeric(30,12);
alter table public.trades add column if not exists total_value numeric(20,2);
alter table public.trades add column if not exists market_type text;

select 'trades_type_check' as constraint,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.trades'::regclass and conname = 'trades_type_check';
