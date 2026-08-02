-- =====================================================================
-- FIX: orders table missing columns that /api/invest/order writes.
-- This was blocking stock buys (hence no notifications). Run once.
-- =====================================================================
alter table public.orders add column if not exists time_in_force  text default 'day';
alter table public.orders add column if not exists amount_type     text default 'notional';
alter table public.orders add column if not exists notional_amount numeric(20,2);
alter table public.orders add column if not exists estimated_price numeric(20,4);
alter table public.orders add column if not exists fill_price      numeric(20,4);
alter table public.orders add column if not exists filled_at       timestamptz;
alter table public.orders add column if not exists notes           text;
