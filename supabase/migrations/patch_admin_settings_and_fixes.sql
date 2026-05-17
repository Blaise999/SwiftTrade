-- ============================================================================
-- NOVATRADE PATCH MIGRATION
-- Run this in Supabase SQL Editor
-- Adds: admin_settings table, fixes missing indexes, ensures RLS
-- ============================================================================

-- 1) admin_settings key-value store (for telegram config, etc.)
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT,                  -- JSON string or plain text
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only service role (admin APIs) can read/write
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_settings_service_only' AND tablename = 'admin_settings') THEN
    CREATE POLICY "admin_settings_service_only" ON public.admin_settings
      FOR ALL USING (false) WITH CHECK (false);
  END IF;
END $$;

-- 2) Ensure demo_fx_candles unique constraint handles NULL session_id
-- The existing UNIQUE(pair_id, session_id, timeframe, bucket_start) won't match NULLs
-- Add a partial unique index for manual mode candles (session_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_demo_fx_candles_manual_unique
  ON public.demo_fx_candles (pair_id, timeframe, bucket_start)
  WHERE session_id IS NULL;

-- 3) Ensure demo_fx_ticks has index for pair_id + seq (manual mode queries)
CREATE INDEX IF NOT EXISTS idx_dfx_ticks_pair_seq
  ON public.demo_fx_ticks (pair_id, seq);

-- 4) Ensure platform_wallets table exists (in case migration was skipped)
CREATE TABLE IF NOT EXISTS public.platform_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency TEXT NOT NULL,
    network TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    label TEXT,
    wallet_type TEXT NOT NULL DEFAULT 'deposit'
      CHECK (wallet_type IN ('tier_checkout', 'deposit')),
    is_active BOOLEAN DEFAULT true,
    min_amount DECIMAL(20,8) DEFAULT 0,
    confirmations INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(currency, network, wallet_type)
);

ALTER TABLE public.platform_wallets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'platform_wallets_read' AND tablename = 'platform_wallets') THEN
    CREATE POLICY "platform_wallets_read" ON public.platform_wallets FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- 5) Ensure user_deposit_wallets table exists
CREATE TABLE IF NOT EXISTS public.user_deposit_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    currency TEXT NOT NULL,
    network TEXT NOT NULL,
    address TEXT NOT NULL,
    label TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, currency, network)
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user ON public.user_deposit_wallets(user_id);

ALTER TABLE public.user_deposit_wallets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own wallets' AND tablename = 'user_deposit_wallets') THEN
    CREATE POLICY "Users read own wallets" ON public.user_deposit_wallets
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- 6) Ensure balance columns exist on users table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='balance_available') THEN
    ALTER TABLE public.users ADD COLUMN balance_available DECIMAL(20,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='balance_bonus') THEN
    ALTER TABLE public.users ADD COLUMN balance_bonus DECIMAL(20,2) DEFAULT 0;
  END IF;
END $$;

-- 7) Ensure demo_fx_trades has user join capability
CREATE INDEX IF NOT EXISTS idx_dfx_trades_pair_status
  ON public.demo_fx_trades (pair_id, status);
CREATE INDEX IF NOT EXISTS idx_dfx_trades_user
  ON public.demo_fx_trades (user_id);

-- Done
SELECT 'Migration complete' AS status;
