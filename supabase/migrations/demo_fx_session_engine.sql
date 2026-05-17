-- ============================================================================
-- DEMO FX SESSION ENGINE MIGRATION
-- ============================================================================
-- Run AFTER demo_fx_scenario_system.sql
-- Adds: sessions table, ticks table, candles table, seq on pairs, per-user wallets

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) ADD seq + active_session_id TO demo_fx_pairs, update mode constraint
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_fx_pairs' AND column_name='seq') THEN
    ALTER TABLE public.demo_fx_pairs ADD COLUMN seq BIGINT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_fx_pairs' AND column_name='active_session_id') THEN
    ALTER TABLE public.demo_fx_pairs ADD COLUMN active_session_id UUID;
  END IF;
END $$;

-- Update mode constraint to include 'session'
ALTER TABLE public.demo_fx_pairs DROP CONSTRAINT IF EXISTS demo_fx_pairs_mode_check;
ALTER TABLE public.demo_fx_pairs ADD CONSTRAINT demo_fx_pairs_mode_check
  CHECK (mode IN ('manual', 'scenario', 'session'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) DEMO FX SESSIONS (the core session-based engine)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_fx_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair_id UUID NOT NULL REFERENCES public.demo_fx_pairs(id) ON DELETE CASCADE,

    -- Session config
    session_type TEXT NOT NULL DEFAULT 'bullish'
      CHECK (session_type IN ('bullish','bearish','range','reversal','crash','spike','custom')),
    duration_ms BIGINT NOT NULL DEFAULT 300000,       -- e.g. 5 min = 300000
    tick_interval_ms INT NOT NULL DEFAULT 1000,       -- emit every 1s
    volatility DECIMAL(10,6) DEFAULT 0.0008,          -- noise magnitude

    -- Start/target prices
    start_bid DECIMAL(20,8) NOT NULL,
    start_ask DECIMAL(20,8) NOT NULL,
    target_bid DECIMAL(20,8) NOT NULL,
    target_ask DECIMAL(20,8) NOT NULL,

    -- Lifecycle
    status TEXT DEFAULT 'pending'
      CHECK (status IN ('pending','running','paused','completed','stopped')),
    started_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    elapsed_ms BIGINT DEFAULT 0,
    tick_seq BIGINT DEFAULT 0,                        -- monotonic tick counter

    -- Lesson / instruction fields
    lesson_title TEXT,
    lesson_description TEXT,
    student_instructions TEXT,                         -- what to tell students

    -- Admin
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dfx_sessions_pair ON public.demo_fx_sessions(pair_id);
CREATE INDEX IF NOT EXISTS idx_dfx_sessions_status ON public.demo_fx_sessions(status);

-- Add FK from pairs to sessions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pairs_active_session' AND table_name = 'demo_fx_pairs'
  ) THEN
    ALTER TABLE public.demo_fx_pairs
      ADD CONSTRAINT fk_pairs_active_session
      FOREIGN KEY (active_session_id) REFERENCES public.demo_fx_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) DEMO FX TICKS (every tick emitted by the session engine)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_fx_ticks (
    id BIGSERIAL PRIMARY KEY,
    pair_id UUID NOT NULL REFERENCES public.demo_fx_pairs(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.demo_fx_sessions(id) ON DELETE SET NULL,
    bid DECIMAL(20,8) NOT NULL,
    ask DECIMAL(20,8) NOT NULL,
    mid DECIMAL(20,8) NOT NULL,
    source TEXT DEFAULT 'session' CHECK (source IN ('session','manual','system')),
    seq BIGINT NOT NULL DEFAULT 0,
    ts TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dfx_ticks_pair_ts ON public.demo_fx_ticks(pair_id, ts);
CREATE INDEX IF NOT EXISTS idx_dfx_ticks_session ON public.demo_fx_ticks(session_id, seq);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) DEMO FX CANDLES (pre-aggregated, built from ticks)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_fx_candles (
    id BIGSERIAL PRIMARY KEY,
    pair_id UUID NOT NULL REFERENCES public.demo_fx_pairs(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.demo_fx_sessions(id) ON DELETE SET NULL,
    timeframe TEXT NOT NULL DEFAULT '1m' CHECK (timeframe IN ('1m','5m','15m','1h')),
    bucket_start TIMESTAMPTZ NOT NULL,
    open DECIMAL(20,8) NOT NULL,
    high DECIMAL(20,8) NOT NULL,
    low DECIMAL(20,8) NOT NULL,
    close DECIMAL(20,8) NOT NULL,
    tick_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(pair_id, session_id, timeframe, bucket_start)
);

CREATE INDEX IF NOT EXISTS idx_dfx_candles_lookup
  ON public.demo_fx_candles(pair_id, timeframe, bucket_start);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) ADD session_id TO demo_fx_trades
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_fx_trades' AND column_name='session_id') THEN
    ALTER TABLE public.demo_fx_trades ADD COLUMN session_id UUID REFERENCES public.demo_fx_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) PER-USER DEPOSIT WALLETS (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_deposit_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    currency TEXT NOT NULL,                -- BTC, ETH, USDT etc
    network TEXT NOT NULL,                 -- BTC, ERC20, TRC20, BEP20 etc
    address TEXT NOT NULL,
    label TEXT,                            -- admin notes
    is_active BOOLEAN DEFAULT true,
    wallet_type TEXT DEFAULT 'deposit' CHECK (wallet_type IN ('deposit','tier_checkout','both')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, currency, network, wallet_type)
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user ON public.user_deposit_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_active ON public.user_deposit_wallets(user_id, is_active);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) CLEANUP FUNCTION - purge old ticks (keep last 24h)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION purge_old_demo_ticks() RETURNS void AS $$
BEGIN
  DELETE FROM public.demo_fx_ticks WHERE ts < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8) RLS policies
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.demo_fx_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_fx_ticks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_fx_candles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_deposit_wallets ENABLE ROW LEVEL SECURITY;

-- Public read for active pairs, ticks, candles (user-facing)
CREATE POLICY IF NOT EXISTS "Anyone can read demo_fx_ticks" ON public.demo_fx_ticks FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can read demo_fx_candles" ON public.demo_fx_candles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can read demo_fx_sessions" ON public.demo_fx_sessions FOR SELECT USING (true);

-- Users can read their own wallets
CREATE POLICY IF NOT EXISTS "Users read own wallets" ON public.user_deposit_wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Service role has full access (admin APIs use service role key)
