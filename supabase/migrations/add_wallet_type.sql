-- Add wallet_type to user_deposit_wallets
-- Values: 'deposit', 'tier_checkout', 'both'
-- Run in Supabase SQL Editor

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_deposit_wallets' AND column_name='wallet_type') THEN
    ALTER TABLE public.user_deposit_wallets ADD COLUMN wallet_type TEXT DEFAULT 'both'
      CHECK (wallet_type IN ('deposit', 'tier_checkout', 'both'));
  END IF;
END $$;

-- Backfill existing wallets to 'both'
UPDATE public.user_deposit_wallets SET wallet_type = 'both' WHERE wallet_type IS NULL;

SELECT 'wallet_type column added' AS status;
