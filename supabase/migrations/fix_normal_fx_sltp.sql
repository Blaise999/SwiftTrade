-- ============================================
-- RUN IN SUPABASE SQL EDITOR
-- Adds: revalue_fx_trades function (normal FX SL/TP auto-check)
--        fixes trades status constraint
--        ensures all needed columns exist
-- ============================================

-- 1) Fix trades status constraint to support all statuses the app uses
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_status_check;
ALTER TABLE public.trades ADD CONSTRAINT trades_status_check
  CHECK (status IN ('open','closed','won','lost','liquidated','stopped_out','take_profit','pending','active'));

-- 2) Ensure trades has all columns the FX route needs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='direction_int') THEN
    ALTER TABLE public.trades ADD COLUMN direction_int INT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='investment') THEN
    ALTER TABLE public.trades ADD COLUMN investment DECIMAL(15,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='multiplier') THEN
    ALTER TABLE public.trades ADD COLUMN multiplier INT DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='floating_pnl') THEN
    ALTER TABLE public.trades ADD COLUMN floating_pnl DECIMAL(15,4) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='direction') THEN
    ALTER TABLE public.trades ADD COLUMN direction TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='symbol') THEN
    ALTER TABLE public.trades ADD COLUMN symbol TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='volume') THEN
    ALTER TABLE public.trades ADD COLUMN volume DECIMAL(20,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='liquidation_price') THEN
    ALTER TABLE public.trades ADD COLUMN liquidation_price DECIMAL(20,8);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='spread_cost') THEN
    ALTER TABLE public.trades ADD COLUMN spread_cost DECIMAL(15,4) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='opened_at') THEN
    ALTER TABLE public.trades ADD COLUMN opened_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='updated_at') THEN
    ALTER TABLE public.trades ADD COLUMN updated_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='market_type') THEN
    ALTER TABLE public.trades ADD COLUMN market_type TEXT DEFAULT 'forex';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='trade_type') THEN
    ALTER TABLE public.trades ADD COLUMN trade_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='asset_type') THEN
    ALTER TABLE public.trades ADD COLUMN asset_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='is_simulated') THEN
    ALTER TABLE public.trades ADD COLUMN is_simulated BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='profit_loss') THEN
    ALTER TABLE public.trades ADD COLUMN profit_loss DECIMAL(15,2);
  END IF;
END $$;

-- Drop old market_type constraint if it exists (too restrictive)
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_market_type_check;

-- 3) Create revalue_fx_trades function
-- This is called by the frontend every ~8s via PATCH /api/trades { action: 'mark_price' }
-- It updates all open FX trades for a user+pair with the current market price,
-- recalculates floating PnL, and auto-closes trades that hit SL/TP/liquidation.
CREATE OR REPLACE FUNCTION public.revalue_fx_trades(
  p_user_id UUID,
  p_pair TEXT,
  p_mid_price DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trade RECORD;
  v_direction INT;
  v_investment DECIMAL;
  v_multiplier DECIMAL;
  v_entry DECIMAL;
  v_mark DECIMAL;
  v_pnl DECIMAL;
  v_liq DECIMAL;
  v_sl DECIMAL;
  v_tp DECIMAL;
  v_should_close BOOLEAN;
  v_close_reason TEXT;
  v_exit_price DECIMAL;
  v_final_pnl DECIMAL;
  v_return_amount DECIMAL;
  v_balance DECIMAL;
  v_closed_count INT := 0;
  v_marked_count INT := 0;
  v_spread DECIMAL;
BEGIN
  -- Estimate spread as 0.01% of price
  v_spread := p_mid_price * 0.0001;

  FOR v_trade IN
    SELECT id, direction_int, investment, multiplier, entry_price,
           stop_loss, take_profit, liquidation_price, type, direction, leverage, amount
    FROM public.trades
    WHERE user_id = p_user_id
      AND (pair = p_pair OR symbol = p_pair)
      AND status IN ('open', 'active')
  LOOP
    -- Resolve direction
    v_direction := COALESCE(v_trade.direction_int,
      CASE WHEN v_trade.type = 'buy' OR v_trade.direction = 'buy' THEN 1 ELSE -1 END);

    v_investment := COALESCE(v_trade.investment, v_trade.amount, 0);
    v_multiplier := COALESCE(v_trade.multiplier, v_trade.leverage, 1);
    v_entry := COALESCE(v_trade.entry_price, 0);

    IF v_entry <= 0 OR v_investment <= 0 THEN
      CONTINUE;
    END IF;

    -- Mark price: BUY marks at bid (mid - spread/2), SELL marks at ask (mid + spread/2)
    IF v_direction = 1 THEN
      v_mark := p_mid_price - v_spread / 2;
    ELSE
      v_mark := p_mid_price + v_spread / 2;
    END IF;

    -- Calculate floating PnL
    v_pnl := v_direction * v_investment * v_multiplier * ((v_mark - v_entry) / v_entry);

    -- Cap loss at investment
    IF v_pnl < -v_investment THEN
      v_pnl := -v_investment;
    END IF;

    -- Check SL/TP/Liquidation
    v_should_close := FALSE;
    v_close_reason := NULL;
    v_exit_price := NULL;

    v_liq := COALESCE(v_trade.liquidation_price, 0);
    v_sl := COALESCE(v_trade.stop_loss, 0);
    v_tp := COALESCE(v_trade.take_profit, 0);

    -- Liquidation check
    IF v_liq > 0 THEN
      IF v_direction = 1 AND v_mark <= v_liq THEN
        v_should_close := TRUE;
        v_close_reason := 'liquidated';
        v_exit_price := v_liq;
      ELSIF v_direction = -1 AND v_mark >= v_liq THEN
        v_should_close := TRUE;
        v_close_reason := 'liquidated';
        v_exit_price := v_liq;
      END IF;
    END IF;

    -- Stop loss check
    IF NOT v_should_close AND v_sl > 0 THEN
      IF v_direction = 1 AND v_mark <= v_sl THEN
        v_should_close := TRUE;
        v_close_reason := 'stopped_out';
        v_exit_price := v_sl;
      ELSIF v_direction = -1 AND v_mark >= v_sl THEN
        v_should_close := TRUE;
        v_close_reason := 'stopped_out';
        v_exit_price := v_sl;
      END IF;
    END IF;

    -- Take profit check
    IF NOT v_should_close AND v_tp > 0 THEN
      IF v_direction = 1 AND v_mark >= v_tp THEN
        v_should_close := TRUE;
        v_close_reason := 'take_profit';
        v_exit_price := v_tp;
      ELSIF v_direction = -1 AND v_mark <= v_tp THEN
        v_should_close := TRUE;
        v_close_reason := 'take_profit';
        v_exit_price := v_tp;
      END IF;
    END IF;

    IF v_should_close THEN
      -- Calculate final PnL at exit price
      v_final_pnl := v_direction * v_investment * v_multiplier * ((v_exit_price - v_entry) / v_entry);
      IF v_final_pnl < -v_investment THEN
        v_final_pnl := -v_investment;
      END IF;

      v_return_amount := GREATEST(0, v_investment + v_final_pnl);

      -- Close the trade
      UPDATE public.trades SET
        status = v_close_reason,
        exit_price = v_exit_price,
        current_price = v_mark,
        pnl = v_final_pnl,
        profit_loss = v_final_pnl,
        floating_pnl = v_final_pnl,
        pnl_percentage = CASE WHEN v_investment > 0 THEN (v_final_pnl / v_investment) * 100 ELSE 0 END,
        closed_at = NOW(),
        updated_at = NOW()
      WHERE id = v_trade.id;

      -- Return balance
      IF v_return_amount > 0 THEN
        UPDATE public.users SET
          balance_available = COALESCE(balance_available, 0) + v_return_amount,
          updated_at = NOW()
        WHERE id = p_user_id;
      END IF;

      v_closed_count := v_closed_count + 1;
    ELSE
      -- Just update mark price and PnL
      UPDATE public.trades SET
        current_price = v_mark,
        floating_pnl = v_pnl,
        pnl = v_pnl,
        profit_loss = v_pnl,
        pnl_percentage = CASE WHEN v_investment > 0 THEN (v_pnl / v_investment) * 100 ELSE 0 END,
        updated_at = NOW()
      WHERE id = v_trade.id;

      v_marked_count := v_marked_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'marked', v_marked_count,
    'closed', v_closed_count,
    'price', p_mid_price
  );
END;
$$;

-- Done
SELECT 'revalue_fx_trades function created' AS status;

-- 4) Fix RLS on users table so login can read/insert/update profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own profile' AND tablename = 'users') THEN
    CREATE POLICY "Users read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users update own profile' AND tablename = 'users') THEN
    CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own profile' AND tablename = 'users') THEN
    CREATE POLICY "Users insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

SELECT 'RLS policies added' AS status;
