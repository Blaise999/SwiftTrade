-- ============================================================================
-- FIX: crypto not saving.
-- Two bugs in user_trading_data:
--   1) the app uses column `spot_crypto_state`, table only had `portfolio_state`
--   2) RLS was ENABLED with NO policies → all client reads/writes denied
-- Run this once in the Supabase SQL editor (also folded into RESET_AND_REBUILD.sql).
-- ============================================================================
alter table public.user_trading_data add column if not exists spot_crypto_state jsonb default '{}'::jsonb;

drop policy if exists utd_owner on public.user_trading_data;
create policy utd_owner on public.user_trading_data
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
