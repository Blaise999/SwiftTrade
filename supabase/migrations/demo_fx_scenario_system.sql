-- ============================================================================
-- NOVA TRADE - DEMO FX SCENARIO SYSTEM
-- ============================================================================
-- Run AFTER main COMPLETE-FINAL-SETUP.sql
-- This creates the full demo FX scenario engine schema.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) DEMO FX PAIRS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_fx_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT UNIQUE NOT NULL,           -- e.g. 'NOK/SEK'
    name TEXT NOT NULL,                     -- e.g. 'Norwegian Krone / Swedish Krona'
    base_currency TEXT NOT NULL,
    quote_currency TEXT NOT NULL,
    pip_size DECIMAL(20,10) DEFAULT 0.0001,
    spread DECIMAL(20,10) DEFAULT 0.0003,
    default_bid DECIMAL(20,8) NOT NULL,
    default_ask DECIMAL(20,8) NOT NULL,
    current_bid DECIMAL(20,8) NOT NULL,
    current_ask DECIMAL(20,8) NOT NULL,
    mode TEXT DEFAULT 'manual' CHECK (mode IN ('manual', 'scenario')),
    active_scenario_id UUID,               -- FK added below
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    price_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_fx_pairs_symbol ON public.demo_fx_pairs(symbol);
CREATE INDEX IF NOT EXISTS idx_demo_fx_pairs_active ON public.demo_fx_pairs(is_active);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) DEMO FX SCENARIOS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_fx_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair_id UUID NOT NULL REFERENCES public.demo_fx_pairs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'stopped')),
    scheduled_at TIMESTAMPTZ,              -- when to auto-start
    started_at TIMESTAMPTZ,                -- actual start time
    paused_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    current_step_index INT DEFAULT 0,
    elapsed_ms BIGINT DEFAULT 0,           -- accumulated elapsed time (handles pause/resume)
    loop_playback BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_fx_scenarios_pair ON public.demo_fx_scenarios(pair_id);
CREATE INDEX IF NOT EXISTS idx_demo_fx_scenarios_status ON public.demo_fx_scenarios(status);
CREATE INDEX IF NOT EXISTS idx_demo_fx_scenarios_scheduled ON public.demo_fx_scenarios(scheduled_at) WHERE status = 'scheduled';

-- Add FK from pairs to scenarios
ALTER TABLE public.demo_fx_pairs
    ADD CONSTRAINT fk_active_scenario
    FOREIGN KEY (active_scenario_id) REFERENCES public.demo_fx_scenarios(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) DEMO FX SCENARIO STEPS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_fx_scenario_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID NOT NULL REFERENCES public.demo_fx_scenarios(id) ON DELETE CASCADE,
    step_index INT NOT NULL,               -- ordering (0-based)
    offset_ms INT NOT NULL DEFAULT 0,      -- milliseconds from scenario start
    target_bid DECIMAL(20,8) NOT NULL,
    target_ask DECIMAL(20,8) NOT NULL,
    easing TEXT DEFAULT 'linear' CHECK (easing IN ('linear', 'ease-in', 'ease-out', 'ease-in-out')),
    label TEXT,                             -- optional label for admin reference
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(scenario_id, step_index)
);

CREATE INDEX IF NOT EXISTS idx_demo_fx_steps_scenario ON public.demo_fx_scenario_steps(scenario_id, step_index);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) DEMO FX TRADES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_fx_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    pair_id UUID NOT NULL REFERENCES public.demo_fx_pairs(id),
    symbol TEXT NOT NULL,

    -- Direction: 1 = buy/long, -1 = sell/short
    direction INT NOT NULL CHECK (direction IN (1, -1)),
    direction_label TEXT NOT NULL CHECK (direction_label IN ('buy', 'sell')),

    -- Financials (Olymp-style)
    investment DECIMAL(15,2) NOT NULL,      -- actual $ risked
    multiplier INT NOT NULL DEFAULT 1,      -- leverage
    volume DECIMAL(20,2),                   -- investment * multiplier

    -- Prices
    entry_bid DECIMAL(20,8) NOT NULL,       -- bid at time of open
    entry_ask DECIMAL(20,8) NOT NULL,       -- ask at time of open
    entry_price DECIMAL(20,8) NOT NULL,     -- effective entry (ask for buy, bid for sell)

    -- Risk management
    stop_loss DECIMAL(20,8),
    take_profit DECIMAL(20,8),
    liquidation_price DECIMAL(20,8),

    -- Current state (updated by scenario runner)
    current_price DECIMAL(20,8),
    floating_pnl DECIMAL(15,4) DEFAULT 0,

    -- Status
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'liquidated', 'stopped_out', 'take_profit')),
    close_reason TEXT CHECK (close_reason IN ('manual', 'stop_loss', 'take_profit', 'liquidation', 'admin')),

    -- Close data
    exit_price DECIMAL(20,8),
    final_pnl DECIMAL(15,4),
    closed_at TIMESTAMPTZ,

    -- Spread
    spread_cost DECIMAL(15,4) DEFAULT 0,

    -- Timestamps
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_fx_trades_user ON public.demo_fx_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_demo_fx_trades_pair ON public.demo_fx_trades(pair_id);
CREATE INDEX IF NOT EXISTS idx_demo_fx_trades_status ON public.demo_fx_trades(status);
CREATE INDEX IF NOT EXISTS idx_demo_fx_trades_open ON public.demo_fx_trades(pair_id, status) WHERE status = 'open';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) DEMO FX PRICE LOG (for chart rendering)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_fx_price_log (
    id BIGSERIAL PRIMARY KEY,
    pair_id UUID NOT NULL REFERENCES public.demo_fx_pairs(id) ON DELETE CASCADE,
    bid DECIMAL(20,8) NOT NULL,
    ask DECIMAL(20,8) NOT NULL,
    source TEXT DEFAULT 'scenario' CHECK (source IN ('scenario', 'manual', 'system')),
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_fx_price_log_pair_time ON public.demo_fx_price_log(pair_id, logged_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) PER-CURRENCY USER DEPOSIT WALLETS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_deposit_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    currency TEXT NOT NULL,                 -- 'BTC', 'ETH', 'USDT_TRC20', 'USDT_ERC20', etc.
    network TEXT NOT NULL,                  -- 'BTC', 'ERC20', 'TRC20', 'SOL', etc.
    address TEXT NOT NULL,
    label TEXT,                             -- admin note
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, currency, network)
);

CREATE INDEX IF NOT EXISTS idx_user_deposit_wallets_user ON public.user_deposit_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_deposit_wallets_currency ON public.user_deposit_wallets(currency);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.demo_fx_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_fx_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_fx_scenario_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_fx_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_fx_price_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_deposit_wallets ENABLE ROW LEVEL SECURITY;

-- Users can see active pairs
CREATE POLICY "demo_fx_pairs_read" ON public.demo_fx_pairs FOR SELECT USING (is_active = true);

-- Users can see their own trades
CREATE POLICY "demo_fx_trades_own" ON public.demo_fx_trades FOR SELECT USING (user_id = auth.uid());

-- Users can see price log
CREATE POLICY "demo_fx_price_log_read" ON public.demo_fx_price_log FOR SELECT USING (true);

-- Users can see their own wallets
CREATE POLICY "user_deposit_wallets_own" ON public.user_deposit_wallets FOR SELECT USING (user_id = auth.uid());

-- Note: Admin operations use service_role key which bypasses RLS

-- ─────────────────────────────────────────────────────────────────────────────
-- 8) TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'demo_fx_pairs_updated') THEN
        CREATE TRIGGER demo_fx_pairs_updated BEFORE UPDATE ON public.demo_fx_pairs
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'demo_fx_scenarios_updated') THEN
        CREATE TRIGGER demo_fx_scenarios_updated BEFORE UPDATE ON public.demo_fx_scenarios
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'demo_fx_trades_updated') THEN
        CREATE TRIGGER demo_fx_trades_updated BEFORE UPDATE ON public.demo_fx_trades
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_deposit_wallets_updated') THEN
        CREATE TRIGGER user_deposit_wallets_updated BEFORE UPDATE ON public.user_deposit_wallets
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9) SEED 3 RARE FX PAIRS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.demo_fx_pairs (symbol, name, base_currency, quote_currency, pip_size, spread, default_bid, default_ask, current_bid, current_ask, display_order) VALUES
('NOK/SEK', 'Norwegian Krone / Swedish Krona', 'NOK', 'SEK', 0.0001, 0.0003, 1.0150, 1.0153, 1.0150, 1.0153, 1),
('SGD/HKD', 'Singapore Dollar / Hong Kong Dollar', 'SGD', 'HKD', 0.0001, 0.0004, 5.8200, 5.8204, 5.8200, 5.8204, 2),
('CZK/PLN', 'Czech Koruna / Polish Zloty', 'CZK', 'PLN', 0.0001, 0.0003, 0.1720, 0.1723, 0.1720, 0.1723, 3)
ON CONFLICT (symbol) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10) SEED EXAMPLE SCENARIO
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    pair_id UUID;
    scenario_id UUID;
BEGIN
    SELECT id INTO pair_id FROM public.demo_fx_pairs WHERE symbol = 'NOK/SEK' LIMIT 1;
    IF pair_id IS NOT NULL THEN
        INSERT INTO public.demo_fx_scenarios (id, pair_id, name, description, status)
        VALUES (uuid_generate_v4(), pair_id, 'NOK/SEK Buy Session', 'Gentle bullish move for demo buy training. ~60 second run.', 'draft')
        RETURNING id INTO scenario_id;

        INSERT INTO public.demo_fx_scenario_steps (scenario_id, step_index, offset_ms, target_bid, target_ask, label) VALUES
        (scenario_id, 0,     0, 1.0150, 1.0153, 'Start'),
        (scenario_id, 1, 10000, 1.0154, 1.0157, 'Gentle rise'),
        (scenario_id, 2, 20000, 1.0159, 1.0162, 'Continued up'),
        (scenario_id, 3, 30000, 1.0165, 1.0168, 'Breakout'),
        (scenario_id, 4, 45000, 1.0168, 1.0171, 'Slow climb'),
        (scenario_id, 5, 60000, 1.0172, 1.0175, 'Session end');
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'demo_fx_pairs' as tbl, count(*) as cnt FROM public.demo_fx_pairs
UNION ALL SELECT 'demo_fx_scenarios', count(*) FROM public.demo_fx_scenarios
UNION ALL SELECT 'demo_fx_scenario_steps', count(*) FROM public.demo_fx_scenario_steps
UNION ALL SELECT 'demo_fx_trades', count(*) FROM public.demo_fx_trades
UNION ALL SELECT 'user_deposit_wallets', count(*) FROM public.user_deposit_wallets;
