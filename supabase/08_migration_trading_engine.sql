-- =====================================================================
-- SWIFT TRADE — MIGRATION 08 (TRADING ENGINE + CONCIERGE COMPLETION)
--
-- Apply on top of 01-07 or after RUN_THIS_TO_FIX_ALL_SCHEMA_ERRORS.sql
-- 100% idempotent — safe to run repeatedly.
--
-- Fixes:
--   ✅ column trades.final_pnl does not exist
--   ✅ Could not find the function public.open_trade_atomic
--   ✅ Could not find the function public.close_trade_atomic
--   ✅ Could not find the function public.revalue_fx_trades
--   ✅ Adds admin concierge (SwiftBridge) action endpoints support
-- =====================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1) Missing trades columns surfaced by the FX engine
-- ──────────────────────────────────────────────────────────────────────
alter table public.trades
  add column if not exists final_pnl numeric(20,2) default 0,
  add column if not exists profit_loss numeric(20,2) default 0,
  add column if not exists pnl numeric(20,2) default 0,
  add column if not exists last_revalued_at timestamptz,
  add column if not exists last_mid_price numeric(30,12);

-- Make sure positions table can hold "stocks" type
alter table public.positions
  add column if not exists day_change_pct numeric(10,4) default 0;

-- ──────────────────────────────────────────────────────────────────────
-- 2) RPC: open_trade_atomic
--    Locks balance, inserts a trade row, returns the trade id.
-- ──────────────────────────────────────────────────────────────────────
create or replace function public.open_trade_atomic(
  p_user_id uuid,
  p_trade_id uuid,
  p_asset text,
  p_direction text,
  p_entry_price numeric,
  p_investment numeric,
  p_liquidation_price numeric default null,
  p_multiplier numeric default 1,
  p_stop_loss numeric default null,
  p_take_profit numeric default null
)
returns table (id uuid, balance_after numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
begin
  -- Lock the user row to prevent double-spend
  select balance_available into v_balance
    from public.users
   where id = p_user_id
     for update;

  if v_balance is null then
    raise exception 'User % not found', p_user_id;
  end if;

  if v_balance < p_investment then
    raise exception 'Insufficient balance: have %, need %', v_balance, p_investment;
  end if;

  -- Deduct the investment from available balance
  update public.users
     set balance_available = balance_available - p_investment
   where id = p_user_id;

  -- Insert the trade
  insert into public.trades(
    id, user_id, market_type, asset, pair, symbol,
    direction, entry_price, investment, amount,
    liquidation_price, multiplier, leverage,
    stop_loss, take_profit,
    status, opened_at, created_at
  ) values (
    p_trade_id, p_user_id, 'fx', p_asset, p_asset, p_asset,
    p_direction, p_entry_price, p_investment, p_investment,
    p_liquidation_price, p_multiplier, p_multiplier,
    p_stop_loss, p_take_profit,
    'open', now(), now()
  );

  return query select p_trade_id, (v_balance - p_investment);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 3) RPC: close_trade_atomic
--    Closes a trade, credits balance (investment + final_pnl), updates row.
-- ──────────────────────────────────────────────────────────────────────
create or replace function public.close_trade_atomic(
  p_trade_id uuid,
  p_user_id uuid,
  p_exit_price numeric,
  p_final_pnl numeric,
  p_investment numeric,
  p_status text default 'closed'
)
returns table (id uuid, final_pnl numeric, balance_after numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_credit numeric;
begin
  -- Credit = investment + pnl (so a losing trade still returns < investment).
  v_credit := greatest(p_investment + p_final_pnl, 0);

  select balance_available into v_balance
    from public.users
   where id = p_user_id
     for update;

  if v_balance is null then
    raise exception 'User % not found', p_user_id;
  end if;

  update public.users
     set balance_available = balance_available + v_credit
   where id = p_user_id;

  update public.trades
     set status      = p_status,
         exit_price  = p_exit_price,
         final_pnl   = p_final_pnl,
         profit_loss = p_final_pnl,
         pnl         = p_final_pnl,
         closed_at   = now(),
         updated_at  = now()
   where id = p_trade_id
     and user_id = p_user_id
     and status = 'open';

  return query select p_trade_id, p_final_pnl, (v_balance + v_credit);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 4) RPC: revalue_fx_trades
--    Marks all open FX trades for a pair to current mid price, updates
--    floating_pnl and pnl_percentage, auto-closes if SL/TP/liq hit.
-- ──────────────────────────────────────────────────────────────────────
create or replace function public.revalue_fx_trades(
  p_user_id uuid,
  p_pair text,
  p_mid_price numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int := 0;
  v_closed int := 0;
  v_total_pnl numeric := 0;
  r record;
  v_direction_sign int;
  v_floating numeric;
  v_pct numeric;
  v_should_close boolean;
  v_close_reason text;
  v_credit numeric;
begin
  for r in
    select id, direction, entry_price, investment, multiplier,
           stop_loss, take_profit, liquidation_price
      from public.trades
     where user_id = p_user_id
       and (pair = p_pair or asset = p_pair or symbol = p_pair)
       and status = 'open'
       for update
  loop
    v_direction_sign := case
      when lower(coalesce(r.direction, 'buy')) in ('sell', 'short', 'down') then -1
      else 1
    end;

    v_floating := v_direction_sign
                  * (p_mid_price - r.entry_price)
                  * (r.investment / nullif(r.entry_price, 0))
                  * coalesce(r.multiplier, 1);

    v_pct := case
      when r.investment > 0 then (v_floating / r.investment) * 100
      else 0
    end;

    v_should_close := false;
    v_close_reason := null;

    if r.liquidation_price is not null then
      if (v_direction_sign = 1  and p_mid_price <= r.liquidation_price)
         or (v_direction_sign = -1 and p_mid_price >= r.liquidation_price) then
        v_should_close := true; v_close_reason := 'liquidated';
      end if;
    end if;

    if not v_should_close and r.stop_loss is not null then
      if (v_direction_sign = 1  and p_mid_price <= r.stop_loss)
         or (v_direction_sign = -1 and p_mid_price >= r.stop_loss) then
        v_should_close := true; v_close_reason := 'stop_loss';
      end if;
    end if;

    if not v_should_close and r.take_profit is not null then
      if (v_direction_sign = 1  and p_mid_price >= r.take_profit)
         or (v_direction_sign = -1 and p_mid_price <= r.take_profit) then
        v_should_close := true; v_close_reason := 'take_profit';
      end if;
    end if;

    if v_should_close then
      v_credit := greatest(r.investment + v_floating, 0);
      update public.users
         set balance_available = balance_available + v_credit
       where id = p_user_id;
      update public.trades
         set status       = 'closed',
             exit_price   = p_mid_price,
             current_price = p_mid_price,
             final_pnl    = v_floating,
             profit_loss  = v_floating,
             pnl          = v_floating,
             floating_pnl = v_floating,
             pnl_percentage = v_pct,
             close_reason = v_close_reason,
             closed_at    = now(),
             updated_at   = now()
       where id = r.id;
      v_closed := v_closed + 1;
    else
      update public.trades
         set current_price  = p_mid_price,
             floating_pnl   = v_floating,
             pnl_percentage = v_pct,
             last_mid_price = p_mid_price,
             last_revalued_at = now(),
             updated_at     = now()
       where id = r.id;
      v_updated := v_updated + 1;
    end if;

    v_total_pnl := v_total_pnl + v_floating;
  end loop;

  return jsonb_build_object(
    'updated', v_updated,
    'closed', v_closed,
    'total_floating_pnl', v_total_pnl,
    'pair', p_pair,
    'mid', p_mid_price
  );
end;
$$;

-- Grant execute to authenticated + service_role (defensive)
do $$ begin grant execute on function public.open_trade_atomic(uuid,uuid,text,text,numeric,numeric,numeric,numeric,numeric,numeric) to authenticated;
exception when undefined_object then null; end $$;
do $$ begin grant execute on function public.open_trade_atomic(uuid,uuid,text,text,numeric,numeric,numeric,numeric,numeric,numeric) to service_role;
exception when undefined_object then null; end $$;
do $$ begin grant execute on function public.close_trade_atomic(uuid,uuid,numeric,numeric,numeric,text) to authenticated;
exception when undefined_object then null; end $$;
do $$ begin grant execute on function public.close_trade_atomic(uuid,uuid,numeric,numeric,numeric,text) to service_role;
exception when undefined_object then null; end $$;
do $$ begin grant execute on function public.revalue_fx_trades(uuid,text,numeric) to authenticated;
exception when undefined_object then null; end $$;
do $$ begin grant execute on function public.revalue_fx_trades(uuid,text,numeric) to service_role;
exception when undefined_object then null; end $$;

-- ──────────────────────────────────────────────────────────────────────
-- 5) Concierge (SwiftBridge) admin workflow columns
-- ──────────────────────────────────────────────────────────────────────
alter table public.bridge_requests
  add column if not exists admin_deposit_account text,
  add column if not exists admin_deposit_instructions text,
  add column if not exists user_receipt_url text,
  add column if not exists user_wallet_address text,
  add column if not exists user_wallet_network text,
  add column if not exists admin_payout_tx text,
  add column if not exists admin_payout_at timestamptz,
  add column if not exists workflow_step text default 'awaiting_admin_account';

create index if not exists idx_bridge_requests_status_created
  on public.bridge_requests(status, created_at desc);
create index if not exists idx_bridge_requests_workflow
  on public.bridge_requests(workflow_step);

-- Done.
