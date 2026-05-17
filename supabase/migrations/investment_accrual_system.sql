-- ============================================
-- MIGRATION: Investment Accrual System + Email Support
-- Run in Supabase SQL Editor
-- ============================================

-- 1) Ensure user_investment_accounts table exists with all needed columns
CREATE TABLE IF NOT EXISTS public.user_investment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_funding'
    CHECK (status IN ('pending_funding', 'active', 'paused', 'matured', 'cancelled')),
  amount_usd DECIMAL(15,2) NOT NULL,
  current_value_usd DECIMAL(15,2) NOT NULL,
  projected_return_pct DECIMAL(8,2) NOT NULL DEFAULT 0,
  profit_mode TEXT NOT NULL DEFAULT 'compound'
    CHECK (profit_mode IN ('compound', 'monthly_payout', 'hybrid')),
  shield_mode TEXT DEFAULT 'off',
  duration_days INT NOT NULL DEFAULT 30,
  payout_frequency_label TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  matures_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  last_accrual_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add last_accrual_at if table already existed
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_investment_accounts' AND column_name='last_accrual_at') THEN
    ALTER TABLE public.user_investment_accounts ADD COLUMN last_accrual_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_investment_accounts' AND column_name='completed_at') THEN
    ALTER TABLE public.user_investment_accounts ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2) Ensure investment_ledger_entries table exists
CREATE TABLE IF NOT EXISTS public.investment_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_account_id UUID NOT NULL REFERENCES public.user_investment_accounts(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  entry_type TEXT NOT NULL
    CHECK (entry_type IN ('deposit', 'withdrawal', 'profit_accrual', 'maturity_payout', 'admin_adjustment', 'fee')),
  amount_usd DECIMAL(15,2) NOT NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Add rejection_reason to withdrawals if not present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='withdrawals' AND column_name='rejection_reason') THEN
    ALTER TABLE public.withdrawals ADD COLUMN rejection_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='withdrawals' AND column_name='admin_note') THEN
    ALTER TABLE public.withdrawals ADD COLUMN admin_note TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='withdrawals' AND column_name='tx_hash') THEN
    ALTER TABLE public.withdrawals ADD COLUMN tx_hash TEXT;
  END IF;
END $$;

-- 4) Ensure demo_fx_pairs mode supports 'autopilot'
-- (mode is TEXT, no constraint needed - just document the values)

-- 5) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_investment_accounts_user_status ON public.user_investment_accounts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_investment_accounts_status ON public.user_investment_accounts(status);
CREATE INDEX IF NOT EXISTS idx_investment_ledger_account ON public.investment_ledger_entries(investment_account_id);
CREATE INDEX IF NOT EXISTS idx_investment_ledger_type ON public.investment_ledger_entries(entry_type);

-- 6) RLS policies for investment tables
ALTER TABLE public.user_investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_ledger_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own investments' AND tablename = 'user_investment_accounts') THEN
    CREATE POLICY "Users read own investments" ON public.user_investment_accounts FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own ledger' AND tablename = 'investment_ledger_entries') THEN
    CREATE POLICY "Users read own ledger" ON public.investment_ledger_entries FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access investments' AND tablename = 'user_investment_accounts') THEN
    CREATE POLICY "Service role full access investments" ON public.user_investment_accounts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access ledger' AND tablename = 'investment_ledger_entries') THEN
    CREATE POLICY "Service role full access ledger" ON public.investment_ledger_entries FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

SELECT 'Investment accrual migration complete' AS status;
