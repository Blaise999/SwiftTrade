-- =====================================================================
-- Ensure every bridge amount/credit column exists so completion can
-- credit crypto (to holdings) or USD (to balance). Run once. Idempotent.
-- The admin completion now credits DIRECTLY (reliable); these columns let
-- it record the amounts and stop the trigger from double-crediting.
-- =====================================================================
alter table public.bridge_requests add column if not exists estimated_usd        numeric(20,2);
alter table public.bridge_requests add column if not exists estimated_target     numeric(30,12);
alter table public.bridge_requests add column if not exists final_credit_usd     numeric(20,2);
alter table public.bridge_requests add column if not exists final_credit_target  numeric(30,12);
alter table public.bridge_requests add column if not exists credited_amount_usd  numeric(20,2);
alter table public.bridge_requests add column if not exists credited_amount      numeric(30,12);
alter table public.bridge_requests add column if not exists credited_asset       text;
alter table public.bridge_requests add column if not exists crypto_credited      boolean default false;

-- also make sure the crypto-holdings store exists + is readable
alter table public.user_trading_data add column if not exists spot_crypto_state jsonb default '{}'::jsonb;
