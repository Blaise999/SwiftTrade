-- ============================================================================
-- NOVA TRADE - DEMO FX V2 SAFE MIGRATION
-- ============================================================================
-- NON-DESTRUCTIVE: additive only, safe to re-run
-- Fixes:
--   1) Dual FK ambiguity between demo_fx_pairs and demo_fx_scenarios
--   2) Adds missing rare pairs (USD/TRY, USD/ZAR, EUR/HUF)
--   3) Adds platform_wallets table for admin-managed checkout/deposit wallets
--   4) Adds admin_audit_log table if missing
--   5) Safe RLS and trigger additions
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) FIX: Drop the problematic active_scenario_id FK (causes ambiguous embed)
--    We keep the column but remove the FOREIGN KEY constraint.
--    The application code manages this reference safely.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Drop the FK constraint if it exists (the one causing ambiguous embed)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_active_scenario'
      AND table_name = 'demo_fx_pairs'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.demo_fx_pairs DROP CONSTRAINT fk_active_scenario;
    RAISE NOTICE 'Dropped fk_active_scenario constraint to fix ambiguous embed';
  END IF;

  -- Also check for auto-generated constraint name patterns
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'demo_fx_pairs_active_scenario_id_fkey'
      AND table_name = 'demo_fx_pairs'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.demo_fx_pairs DROP CONSTRAINT demo_fx_pairs_active_scenario_id_fkey;
    RAISE NOTICE 'Dropped demo_fx_pairs_active_scenario_id_fkey constraint';
  END IF;
END $$;

-- NOTE: We intentionally do NOT recreate the FK.
-- The active_scenario_id column remains as a soft reference.
-- This eliminates the dual-FK ambiguity that caused:
-- "Could not embed because more than one relationship was found"
-- The app code uses separate queries to join pairs ↔ scenarios.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) ENSURE demo_fx_pairs table has all needed columns
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demo_fx_pairs' AND column_name = 'active_scenario_id') THEN
    ALTER TABLE public.demo_fx_pairs ADD COLUMN active_scenario_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demo_fx_pairs' AND column_name = 'mode') THEN
    ALTER TABLE public.demo_fx_pairs ADD COLUMN mode TEXT DEFAULT 'manual' CHECK (mode IN ('manual', 'scenario'));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) ADD RARE PAIRS (USD/TRY, USD/ZAR, EUR/HUF) — the demo "rare pairs"
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.demo_fx_pairs (symbol, name, base_currency, quote_currency, pip_size, spread, default_bid, default_ask, current_bid, current_ask, display_order) VALUES
('USD/TRY', 'US Dollar / Turkish Lira',        'USD', 'TRY', 0.0001, 0.0050, 38.2500, 38.2550, 38.2500, 38.2550, 4),
('USD/ZAR', 'US Dollar / South African Rand',   'USD', 'ZAR', 0.0001, 0.0040, 18.4200, 18.4240, 18.4200, 18.4240, 5),
('EUR/HUF', 'Euro / Hungarian Forint',           'EUR', 'HUF', 0.01,   0.50,   395.50,  396.00,  395.50,  396.00,  6)
ON CONFLICT (symbol) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) PLATFORM WALLETS — admin-managed receiving addresses per crypto
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    currency TEXT NOT NULL,                 -- 'BTC', 'ETH', 'USDT', 'USDC', etc.
    network TEXT NOT NULL,                  -- 'BTC', 'ERC20', 'TRC20', 'SOL', 'BEP20', etc.
    address TEXT NOT NULL,
    label TEXT,                             -- admin note (e.g., "Main BTC cold wallet")
    wallet_type TEXT NOT NULL DEFAULT 'deposit'
      CHECK (wallet_type IN ('tier_checkout', 'deposit')),
    is_active BOOLEAN DEFAULT true,
    min_amount DECIMAL(20,8) DEFAULT 0,
    confirmations INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(currency, network, wallet_type)
);

CREATE INDEX IF NOT EXISTS idx_platform_wallets_type ON public.platform_wallets(wallet_type);
CREATE INDEX IF NOT EXISTS idx_platform_wallets_active ON public.platform_wallets(is_active) WHERE is_active = true;

-- RLS for platform_wallets
ALTER TABLE public.platform_wallets ENABLE ROW LEVEL SECURITY;

-- Users can read active platform wallets (needed for deposit/checkout UI)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'platform_wallets_read' AND tablename = 'platform_wallets') THEN
    CREATE POLICY "platform_wallets_read" ON public.platform_wallets FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- Trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'platform_wallets_updated') THEN
    CREATE TRIGGER platform_wallets_updated BEFORE UPDATE ON public.platform_wallets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Seed some default platform wallets (skip if already exist)
INSERT INTO public.platform_wallets (currency, network, address, label, wallet_type) VALUES
('BTC',  'BTC',   '', 'Bitcoin deposit address',       'deposit'),
('ETH',  'ERC20', '', 'Ethereum deposit address',      'deposit'),
('USDT', 'TRC20', '', 'USDT TRC20 deposit address',    'deposit'),
('USDT', 'ERC20', '', 'USDT ERC20 deposit address',    'deposit'),
('USDC', 'ERC20', '', 'USDC ERC20 deposit address',    'deposit'),
('BTC',  'BTC',   '', 'Bitcoin checkout wallet',        'tier_checkout'),
('ETH',  'ERC20', '', 'Ethereum checkout wallet',       'tier_checkout'),
('USDT', 'TRC20', '', 'USDT TRC20 checkout wallet',    'tier_checkout'),
('USDT', 'ERC20', '', 'USDT ERC20 checkout wallet',    'tier_checkout')
ON CONFLICT (currency, network, wallet_type) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) ENSURE admin_audit_log EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id TEXT,
    target_user_id TEXT,
    action TEXT NOT NULL,
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log(action);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) ENSURE user_deposit_wallets EXISTS (was in v1 but just in case)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_deposit_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    currency TEXT NOT NULL,
    network TEXT NOT NULL,
    address TEXT NOT NULL,
    label TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, currency, network)
);

CREATE INDEX IF NOT EXISTS idx_user_deposit_wallets_user ON public.user_deposit_wallets(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) ADD seed scenarios for new rare pairs
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  p_id UUID;
  s_id UUID;
BEGIN
  -- USD/TRY scenario
  SELECT id INTO p_id FROM public.demo_fx_pairs WHERE symbol = 'USD/TRY' LIMIT 1;
  IF p_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.demo_fx_scenarios WHERE pair_id = p_id LIMIT 1) THEN
    INSERT INTO public.demo_fx_scenarios (id, pair_id, name, description, status)
    VALUES (uuid_generate_v4(), p_id, 'USD/TRY Volatile Session', 'Emerging market volatility demo. ~90 second run.', 'draft')
    RETURNING id INTO s_id;

    INSERT INTO public.demo_fx_scenario_steps (scenario_id, step_index, offset_ms, target_bid, target_ask, label) VALUES
    (s_id, 0,     0, 38.2500, 38.2550, 'Start'),
    (s_id, 1, 15000, 38.2800, 38.2850, 'Initial move up'),
    (s_id, 2, 30000, 38.3200, 38.3250, 'Acceleration'),
    (s_id, 3, 50000, 38.2900, 38.2950, 'Pullback'),
    (s_id, 4, 70000, 38.3500, 38.3550, 'Breakout'),
    (s_id, 5, 90000, 38.3800, 38.3850, 'Session end');
  END IF;

  -- USD/ZAR scenario
  SELECT id INTO p_id FROM public.demo_fx_pairs WHERE symbol = 'USD/ZAR' LIMIT 1;
  IF p_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.demo_fx_scenarios WHERE pair_id = p_id LIMIT 1) THEN
    INSERT INTO public.demo_fx_scenarios (id, pair_id, name, description, status)
    VALUES (uuid_generate_v4(), p_id, 'USD/ZAR Bearish Drift', 'Gentle bearish trend for short demo. ~60 second run.', 'draft')
    RETURNING id INTO s_id;

    INSERT INTO public.demo_fx_scenario_steps (scenario_id, step_index, offset_ms, target_bid, target_ask, label) VALUES
    (s_id, 0,     0, 18.4200, 18.4240, 'Start'),
    (s_id, 1, 15000, 18.4100, 18.4140, 'Gentle drop'),
    (s_id, 2, 30000, 18.3900, 18.3940, 'Continued down'),
    (s_id, 3, 45000, 18.3700, 18.3740, 'Accelerating'),
    (s_id, 4, 60000, 18.3500, 18.3540, 'Session end');
  END IF;

  -- EUR/HUF scenario
  SELECT id INTO p_id FROM public.demo_fx_pairs WHERE symbol = 'EUR/HUF' LIMIT 1;
  IF p_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.demo_fx_scenarios WHERE pair_id = p_id LIMIT 1) THEN
    INSERT INTO public.demo_fx_scenarios (id, pair_id, name, description, status)
    VALUES (uuid_generate_v4(), p_id, 'EUR/HUF Range Bound', 'Sideways range for range-trading demo. ~75 second run.', 'draft')
    RETURNING id INTO s_id;

    INSERT INTO public.demo_fx_scenario_steps (scenario_id, step_index, offset_ms, target_bid, target_ask, label) VALUES
    (s_id, 0,     0, 395.50, 396.00, 'Start'),
    (s_id, 1, 15000, 396.20, 396.70, 'Rise to range top'),
    (s_id, 2, 30000, 395.80, 396.30, 'Back to mid'),
    (s_id, 3, 45000, 395.20, 395.70, 'Drop to range bottom'),
    (s_id, 4, 60000, 395.90, 396.40, 'Bounce back'),
    (s_id, 5, 75000, 395.60, 396.10, 'Session end');
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 'demo_fx_pairs' as tbl, count(*) as cnt FROM public.demo_fx_pairs
UNION ALL SELECT 'demo_fx_scenarios', count(*) FROM public.demo_fx_scenarios
UNION ALL SELECT 'demo_fx_scenario_steps', count(*) FROM public.demo_fx_scenario_steps
UNION ALL SELECT 'platform_wallets', count(*) FROM public.platform_wallets
UNION ALL SELECT 'user_deposit_wallets', count(*) FROM public.user_deposit_wallets;
