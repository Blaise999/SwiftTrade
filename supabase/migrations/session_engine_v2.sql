-- SESSION ENGINE V2 migration (additive)
-- Run AFTER demo_fx_scenario_system.sql

ALTER TABLE public.demo_fx_pairs ADD COLUMN IF NOT EXISTS seq BIGINT DEFAULT 0;
ALTER TABLE public.demo_fx_pairs ADD COLUMN IF NOT EXISTS active_session_id UUID;
ALTER TABLE public.demo_fx_pairs DROP CONSTRAINT IF EXISTS demo_fx_pairs_mode_check;
ALTER TABLE public.demo_fx_pairs ADD CONSTRAINT demo_fx_pairs_mode_check CHECK (mode IN ('manual','scenario','session'));

CREATE TABLE IF NOT EXISTS public.demo_fx_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID NOT NULL REFERENCES public.demo_fx_pairs(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL DEFAULT 'bullish' CHECK (session_type IN ('bullish','bearish','range','reversal','crash','spike','custom')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','paused','completed','stopped')),
  duration_ms BIGINT NOT NULL DEFAULT 300000,
  tick_interval_ms INT NOT NULL DEFAULT 1000,
  volatility DECIMAL(10,6) DEFAULT 0.0002,
  start_bid DECIMAL(20,8) NOT NULL,
  start_ask DECIMAL(20,8) NOT NULL,
  target_bid DECIMAL(20,8) NOT NULL,
  target_ask DECIMAL(20,8) NOT NULL,
  current_seq BIGINT DEFAULT 0,
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  elapsed_ms BIGINT DEFAULT 0,
  lesson_title TEXT,
  lesson_body TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dfx_sessions_pair ON public.demo_fx_sessions(pair_id);
CREATE INDEX IF NOT EXISTS idx_dfx_sessions_status ON public.demo_fx_sessions(status);

DO $$ BEGIN
  ALTER TABLE public.demo_fx_pairs ADD CONSTRAINT fk_active_session FOREIGN KEY (active_session_id) REFERENCES public.demo_fx_sessions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.demo_fx_ticks (
  id BIGSERIAL PRIMARY KEY,
  pair_id UUID NOT NULL REFERENCES public.demo_fx_pairs(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.demo_fx_sessions(id) ON DELETE SET NULL,
  seq BIGINT NOT NULL DEFAULT 0,
  bid DECIMAL(20,8) NOT NULL,
  ask DECIMAL(20,8) NOT NULL,
  mid DECIMAL(20,8) NOT NULL,
  source TEXT DEFAULT 'session' CHECK (source IN ('session','manual','system')),
  ts TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dfx_ticks_pair_ts ON public.demo_fx_ticks(pair_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_dfx_ticks_session ON public.demo_fx_ticks(session_id, seq);

CREATE TABLE IF NOT EXISTS public.demo_fx_candles (
  id BIGSERIAL PRIMARY KEY,
  pair_id UUID NOT NULL REFERENCES public.demo_fx_pairs(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.demo_fx_sessions(id) ON DELETE SET NULL,
  timeframe TEXT NOT NULL DEFAULT '1m' CHECK (timeframe IN ('1m','5m','15m','1h')),
  bucket_start TIMESTAMPTZ NOT NULL,
  o DECIMAL(20,8) NOT NULL,
  h DECIMAL(20,8) NOT NULL,
  l DECIMAL(20,8) NOT NULL,
  c DECIMAL(20,8) NOT NULL,
  tick_count INT DEFAULT 0,
  UNIQUE(pair_id, session_id, timeframe, bucket_start)
);
CREATE INDEX IF NOT EXISTS idx_dfx_candles_lookup ON public.demo_fx_candles(pair_id, session_id, timeframe, bucket_start);

ALTER TABLE public.demo_fx_trades ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.demo_fx_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.demo_fx_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_fx_ticks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_fx_candles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY dfx_sessions_read ON public.demo_fx_sessions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY dfx_ticks_read ON public.demo_fx_ticks FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY dfx_candles_read ON public.demo_fx_candles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'dfx_sessions_updated') THEN
    CREATE TRIGGER dfx_sessions_updated BEFORE UPDATE ON public.demo_fx_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
