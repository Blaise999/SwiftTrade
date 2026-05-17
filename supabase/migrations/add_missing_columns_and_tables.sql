-- =============================================
-- MIGRATION: Add missing columns and tables
-- Run this in Supabase SQL Editor
-- =============================================

-- ─────────────────────────────────────────────
-- 1. Add deposit_address & deposit_network to users table
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'deposit_address'
  ) THEN
    ALTER TABLE public.users ADD COLUMN deposit_address TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'deposit_network'
  ) THEN
    ALTER TABLE public.users ADD COLUMN deposit_network TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'tier_purchase_wallet'
  ) THEN
    ALTER TABLE public.users ADD COLUMN tier_purchase_wallet TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'tier_purchase_network'
  ) THEN
    ALTER TABLE public.users ADD COLUMN tier_purchase_network TEXT;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 2. Add admin_note to deposits (used by admin deposits API)
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'deposits' AND column_name = 'admin_note'
  ) THEN
    ALTER TABLE public.deposits ADD COLUMN admin_note TEXT;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 3. Create admin_audit_log table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  target_user_id UUID,
  action TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit_log' AND policyname = 'admin_audit_log_service'
  ) THEN
    CREATE POLICY admin_audit_log_service ON public.admin_audit_log
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 4. Create demo_fx_pairs table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_fx_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  base_currency TEXT NOT NULL DEFAULT '',
  quote_currency TEXT NOT NULL DEFAULT '',
  pip_size NUMERIC NOT NULL DEFAULT 0.0001,
  spread NUMERIC NOT NULL DEFAULT 0.0003,
  default_bid NUMERIC NOT NULL DEFAULT 1.0,
  default_ask NUMERIC NOT NULL DEFAULT 1.0003,
  current_bid NUMERIC NOT NULL DEFAULT 1.0,
  current_ask NUMERIC NOT NULL DEFAULT 1.0003,
  mode TEXT NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual', 'scenario')),
  active_scenario_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  rare_pair_symbol TEXT,          -- maps to user-facing rare pair symbol
  rare_pair_name TEXT,            -- maps to user-facing rare pair name
  price_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_fx_pairs_active ON public.demo_fx_pairs(is_active);
CREATE INDEX IF NOT EXISTS idx_demo_fx_pairs_order ON public.demo_fx_pairs(display_order);

ALTER TABLE public.demo_fx_pairs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'demo_fx_pairs' AND policyname = 'demo_fx_pairs_service'
  ) THEN
    CREATE POLICY demo_fx_pairs_service ON public.demo_fx_pairs
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 5. Create demo_fx_scenarios table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_fx_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID NOT NULL REFERENCES public.demo_fx_pairs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'stopped')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  current_step_index INT NOT NULL DEFAULT 0,
  elapsed_ms BIGINT NOT NULL DEFAULT 0,
  loop_playback BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_fx_scenarios_pair ON public.demo_fx_scenarios(pair_id);
CREATE INDEX IF NOT EXISTS idx_demo_fx_scenarios_status ON public.demo_fx_scenarios(status);

ALTER TABLE public.demo_fx_scenarios ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'demo_fx_scenarios' AND policyname = 'demo_fx_scenarios_service'
  ) THEN
    CREATE POLICY demo_fx_scenarios_service ON public.demo_fx_scenarios
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 6. Create demo_fx_scenario_steps table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_fx_scenario_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.demo_fx_scenarios(id) ON DELETE CASCADE,
  step_index INT NOT NULL DEFAULT 0,
  offset_ms BIGINT NOT NULL DEFAULT 0,
  target_bid NUMERIC NOT NULL,
  target_ask NUMERIC NOT NULL,
  easing TEXT NOT NULL DEFAULT 'linear',
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_fx_steps_scenario ON public.demo_fx_scenario_steps(scenario_id, step_index);

ALTER TABLE public.demo_fx_scenario_steps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'demo_fx_scenario_steps' AND policyname = 'demo_fx_scenario_steps_service'
  ) THEN
    CREATE POLICY demo_fx_scenario_steps_service ON public.demo_fx_scenario_steps
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 7. Create demo_fx_price_log table (for chart data)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_fx_price_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID NOT NULL REFERENCES public.demo_fx_pairs(id) ON DELETE CASCADE,
  bid NUMERIC NOT NULL,
  ask NUMERIC NOT NULL,
  source TEXT DEFAULT 'admin',
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_fx_price_log_pair_time ON public.demo_fx_price_log(pair_id, logged_at DESC);

ALTER TABLE public.demo_fx_price_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'demo_fx_price_log' AND policyname = 'demo_fx_price_log_service'
  ) THEN
    CREATE POLICY demo_fx_price_log_service ON public.demo_fx_price_log
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 8. Seed default rare FX pairs (if table is empty)
-- ─────────────────────────────────────────────
INSERT INTO public.demo_fx_pairs (symbol, name, base_currency, quote_currency, pip_size, spread, default_bid, default_ask, current_bid, current_ask, display_order, rare_pair_symbol, rare_pair_name)
SELECT * FROM (VALUES
  ('DEMO_TRY', 'Demo TRY Pair', 'USD', 'TRY', 0.0001, 0.05, 34.50, 34.55, 34.50, 34.55, 0, 'USD/TRY', 'US Dollar / Turkish Lira'),
  ('DEMO_ZAR', 'Demo ZAR Pair', 'USD', 'ZAR', 0.0001, 0.03, 18.20, 18.23, 18.20, 18.23, 1, 'USD/ZAR', 'US Dollar / South African Rand'),
  ('DEMO_HUF', 'Demo HUF Pair', 'EUR', 'HUF', 0.01, 0.50, 395.00, 395.50, 395.00, 395.50, 2, 'EUR/HUF', 'Euro / Hungarian Forint')
) AS v(symbol, name, base_currency, quote_currency, pip_size, spread, default_bid, default_ask, current_bid, current_ask, display_order, rare_pair_symbol, rare_pair_name)
WHERE NOT EXISTS (SELECT 1 FROM public.demo_fx_pairs LIMIT 1);

-- ─────────────────────────────────────────────
-- 9. Add currency column to tier_purchases if missing
-- ─────────────────────────────────────────────
DO $$
BEGIN
  -- payment_currency tracks which crypto the user paid in
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tier_purchases' AND column_name = 'payment_currency'
  ) THEN
    ALTER TABLE public.tier_purchases ADD COLUMN payment_currency TEXT DEFAULT 'USDT';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- Done!
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- 10. Create user_deposit_wallets table (per-currency wallets)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_deposit_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,            -- e.g. 'BTC', 'USDT', 'ETH'
  network TEXT NOT NULL,             -- e.g. 'BTC', 'TRC20', 'ERC20'
  address TEXT NOT NULL,
  label TEXT,                        -- optional friendly label
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One wallet per user+currency+network combo
  UNIQUE(user_id, currency, network)
);

CREATE INDEX IF NOT EXISTS idx_user_deposit_wallets_user ON public.user_deposit_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_deposit_wallets_currency ON public.user_deposit_wallets(currency);

ALTER TABLE public.user_deposit_wallets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_deposit_wallets' AND policyname = 'user_deposit_wallets_service'
  ) THEN
    CREATE POLICY user_deposit_wallets_service ON public.user_deposit_wallets
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 11. Create demo_fx_trades table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_fx_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pair_id UUID NOT NULL REFERENCES public.demo_fx_pairs(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  lot_size NUMERIC NOT NULL DEFAULT 0.01,
  leverage INT NOT NULL DEFAULT 100,
  entry_price NUMERIC NOT NULL,
  current_price NUMERIC,
  exit_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  floating_pnl NUMERIC DEFAULT 0,
  final_pnl NUMERIC,
  margin_used NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'stopped_out', 'take_profit', 'liquidated')),
  close_reason TEXT,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_fx_trades_user ON public.demo_fx_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_demo_fx_trades_pair ON public.demo_fx_trades(pair_id);
CREATE INDEX IF NOT EXISTS idx_demo_fx_trades_status ON public.demo_fx_trades(status);

ALTER TABLE public.demo_fx_trades ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'demo_fx_trades' AND policyname = 'demo_fx_trades_service'
  ) THEN
    CREATE POLICY demo_fx_trades_service ON public.demo_fx_trades
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
