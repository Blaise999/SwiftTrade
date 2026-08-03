-- =====================================================================
-- Auto Shield: automatically shield a holding when its price falls to a
-- floor, and un-shield when it recovers to a ceiling. For stocks (positions)
-- and crypto (crypto_positions). Processed by /api/positions/auto-shield.
-- =====================================================================
alter table public.positions        add column if not exists shield_enabled boolean default false;
alter table public.positions        add column if not exists shield_activated_at timestamptz;
alter table public.positions        add column if not exists auto_shield_enabled boolean default false;
alter table public.positions        add column if not exists shield_on_below  numeric(30,10);
alter table public.positions        add column if not exists shield_off_above numeric(30,10);

alter table public.crypto_positions add column if not exists shield_enabled boolean default false;
alter table public.crypto_positions add column if not exists shield_activated_at timestamptz;
alter table public.crypto_positions add column if not exists auto_shield_enabled boolean default false;
alter table public.crypto_positions add column if not exists shield_on_below  numeric(30,10);
alter table public.crypto_positions add column if not exists shield_off_above numeric(30,10);
