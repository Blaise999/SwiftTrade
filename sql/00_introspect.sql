-- ============================================================================
-- 00_introspect.sql — run this FIRST in the Supabase SQL editor.
-- Paste the result back and I'll tailor anything that doesn't match.
-- It just lists the real columns of the tables the app depends on, so the seed
-- can't fail on a column-name mismatch.
-- ============================================================================
select table_name, string_agg(column_name || ' ' || data_type, ', ' order by ordinal_position) as columns
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'users','crypto_positions','positions','transactions',
    'deposits','withdrawals','bridge_requests','bridge_countries'
  )
group by table_name
order by table_name;

-- Does the equities `positions` table exist at all?
select exists (
  select 1 from information_schema.tables
  where table_schema='public' and table_name='positions'
) as positions_table_exists;
