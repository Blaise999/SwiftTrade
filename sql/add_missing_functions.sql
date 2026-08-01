-- ============================================================================
-- add_missing_functions.sql  —  the DB functions your app calls that were
-- missing from the schema. Restores FX (open/close/revalue) and admin
-- (confirm_deposit, update_user_balance, price overrides, forced outcomes,
-- trading sessions). Extracted verbatim from your own SQL files.
-- Safe to re-run (all are CREATE OR REPLACE).
-- ============================================================================

-- ── open_trade_atomic  (from supabase/08_migration_trading_engine.sql) ──
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

-- ── close_trade_atomic  (from supabase/08_migration_trading_engine.sql) ──
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

-- ── revalue_fx_trades  (from supabase/08_migration_trading_engine.sql) ──
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

-- ── confirm_deposit  (from supabase/COMPLETE-FINAL-SETUP.sql) ──
CREATE OR REPLACE FUNCTION confirm_deposit(
    p_deposit_id UUID,
    p_admin_id UUID,
    p_note TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_deposit RECORD;
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
BEGIN
    -- Get deposit with lock
    SELECT * INTO v_deposit
    FROM public.deposits
    WHERE id = p_deposit_id AND status = 'pending'
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update deposit status
    UPDATE public.deposits
    SET status = 'confirmed',
        processed_by = p_admin_id,
        processed_at = NOW(),
        admin_note = p_note,
        updated_at = NOW()
    WHERE id = p_deposit_id;
    
    -- Get current user balance
    SELECT balance_available INTO v_current_balance
    FROM public.users
    WHERE id = v_deposit.user_id
    FOR UPDATE;
    
    v_new_balance := v_current_balance + v_deposit.amount;
    
    -- Credit user balance
    UPDATE public.users
    SET balance_available = v_new_balance,
        total_deposited = total_deposited + v_deposit.amount,
        updated_at = NOW()
    WHERE id = v_deposit.user_id;
    
    -- Log transaction
    INSERT INTO public.transactions (
        user_id, type, amount, balance_before, balance_after,
        description, reference_type, reference_id
    ) VALUES (
        v_deposit.user_id,
        'deposit',
        v_deposit.amount,
        v_current_balance,
        v_new_balance,
        'Deposit confirmed: ' || v_deposit.method_name,
        'deposit',
        p_deposit_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── reject_deposit  (from supabase/COMPLETE-FINAL-SETUP.sql) ──
CREATE OR REPLACE FUNCTION reject_deposit(
    p_deposit_id UUID,
    p_admin_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.deposits
    SET status = 'rejected',
        processed_by = p_admin_id,
        processed_at = NOW(),
        rejection_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_deposit_id AND status = 'pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── update_user_balance  (from supabase/COMPLETE-FINAL-SETUP.sql) ──
CREATE OR REPLACE FUNCTION update_user_balance(
    p_user_id UUID,
    p_amount DECIMAL,
    p_type TEXT,              -- 'credit' or 'debit'
    p_description TEXT DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
BEGIN
    -- Get current balance with lock
    SELECT balance_available INTO v_current_balance
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate new balance
    IF p_type = 'credit' THEN
        v_new_balance := v_current_balance + p_amount;
    ELSIF p_type = 'debit' THEN
        v_new_balance := v_current_balance - p_amount;
        IF v_new_balance < 0 THEN
            RETURN FALSE;
        END IF;
    ELSE
        RETURN FALSE;
    END IF;
    
    -- Update balance
    UPDATE public.users
    SET balance_available = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log transaction
    INSERT INTO public.transactions (
        user_id, type, amount, balance_before, balance_after, 
        description, reference_type, reference_id
    ) VALUES (
        p_user_id,
        CASE WHEN p_type = 'credit' THEN 'admin_credit' ELSE 'admin_debit' END,
        p_amount,
        v_current_balance,
        v_new_balance,
        p_description,
        p_reference_type,
        p_reference_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── apply_price_override  (from supabase/COMPLETE-FINAL-SETUP.sql) ──
CREATE OR REPLACE FUNCTION apply_price_override(
    p_pair TEXT,
    p_price DECIMAL,
    p_direction TEXT,
    p_admin_id UUID
) RETURNS UUID AS $$
DECLARE
    v_override_id UUID;
BEGIN
    -- Deactivate existing overrides for this pair
    UPDATE public.price_overrides 
    SET is_active = false, updated_at = NOW()
    WHERE pair_symbol = p_pair AND is_active = true;
    
    -- Create new override
    INSERT INTO public.price_overrides (pair_symbol, override_price, price_direction, is_active, created_by)
    VALUES (p_pair, p_price, p_direction, true, p_admin_id)
    RETURNING id INTO v_override_id;
    
    -- Log action
    INSERT INTO public.admin_logs (admin_id, action, target_type, details)
    VALUES (p_admin_id, 'price_override', 'pair', jsonb_build_object(
        'pair', p_pair,
        'price', p_price,
        'direction', p_direction
    ));
    
    RETURN v_override_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── force_trade_outcome  (from supabase/COMPLETE-FINAL-SETUP.sql) ──
CREATE OR REPLACE FUNCTION force_trade_outcome(
    p_trade_id UUID,
    p_outcome TEXT,
    p_target_pnl DECIMAL,
    p_admin_id UUID,
    p_note TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_trade RECORD;
BEGIN
    SELECT * INTO v_trade FROM public.trades WHERE id = p_trade_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    INSERT INTO public.trade_outcomes (trade_id, user_id, forced_outcome, target_pnl, created_by, note)
    VALUES (p_trade_id, v_trade.user_id, p_outcome, p_target_pnl, p_admin_id, p_note);
    
    INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (p_admin_id, 'trade_outcome', 'trade', p_trade_id, jsonb_build_object(
        'outcome', p_outcome,
        'target_pnl', p_target_pnl,
        'user_id', v_trade.user_id
    ));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── start_trading_session  (from supabase/admin-markets-schema.sql) ──
CREATE OR REPLACE FUNCTION start_trading_session(
    p_session_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.trading_sessions
    SET status = 'active', updated_at = NOW()
    WHERE id = p_session_id AND status = 'scheduled';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── end_trading_session  (from supabase/admin-markets-schema.sql) ──
CREATE OR REPLACE FUNCTION end_trading_session(
    p_session_id UUID,
    p_end_price DECIMAL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.trading_sessions
    SET status = 'completed', 
        actual_end_price = p_end_price,
        updated_at = NOW()
    WHERE id = p_session_id AND status = 'active';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── try_spend_market_budget (stub: absent from repo — allow) ──
create or replace function public.try_spend_market_budget(p_amount numeric default 0, p_key text default null)
returns boolean language sql as $$ select true $$;

-- ── complete_referral (stub: absent from repo — no-op) ──
create or replace function public.complete_referral(p_user uuid default null, p_referrer uuid default null)
returns boolean language sql as $$ select true $$;
