-- ============================================
-- SEED: Insert all exotic/rare FX pairs into demo_fx_pairs
-- Run in Supabase SQL Editor
-- Safe to run multiple times — skips existing symbols
-- ============================================

-- Ensure the table exists (in case this runs before the main schema)
CREATE TABLE IF NOT EXISTS public.demo_fx_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  base_currency TEXT DEFAULT '',
  quote_currency TEXT DEFAULT '',
  pip_size DECIMAL(10,6) DEFAULT 0.0001,
  spread DECIMAL(10,6) DEFAULT 0.001,
  current_bid DECIMAL(20,8) DEFAULT 0,
  current_ask DECIMAL(20,8) DEFAULT 0,
  mode TEXT DEFAULT 'autopilot',
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 100,
  active_session_id UUID,
  active_scenario_id UUID,
  seq INT DEFAULT 0,
  price_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns (if table was created with an older schema)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_fx_pairs' AND column_name='mode') THEN
    ALTER TABLE public.demo_fx_pairs ADD COLUMN mode TEXT DEFAULT 'autopilot';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_fx_pairs' AND column_name='seq') THEN
    ALTER TABLE public.demo_fx_pairs ADD COLUMN seq INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_fx_pairs' AND column_name='price_updated_at') THEN
    ALTER TABLE public.demo_fx_pairs ADD COLUMN price_updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_fx_pairs' AND column_name='active_session_id') THEN
    ALTER TABLE public.demo_fx_pairs ADD COLUMN active_session_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demo_fx_pairs' AND column_name='active_scenario_id') THEN
    ALTER TABLE public.demo_fx_pairs ADD COLUMN active_scenario_id UUID;
  END IF;
END $$;

-- ============================================
-- INSERT PAIRS (skip if symbol exists)
-- ============================================

-- Original rare pairs (ensure they exist)
INSERT INTO public.demo_fx_pairs (symbol, name, base_currency, quote_currency, pip_size, spread, current_bid, current_ask, mode, is_active, display_order, seq)
VALUES
  ('USD/TRY', 'US Dollar / Turkish Lira',        'USD','TRY', 0.0001, 0.005,   32.1500, 32.1550, 'autopilot', true, 100, 0),
  ('USD/ZAR', 'US Dollar / South African Rand',   'USD','ZAR', 0.0001, 0.003,   18.2300, 18.2330, 'autopilot', true, 101, 0),
  ('EUR/HUF', 'Euro / Hungarian Forint',           'EUR','HUF', 0.01,   0.50,  395.5000,396.0000, 'autopilot', true, 102, 0)
ON CONFLICT (symbol) DO NOTHING;

-- New exotic pairs
INSERT INTO public.demo_fx_pairs (symbol, name, base_currency, quote_currency, pip_size, spread, current_bid, current_ask, mode, is_active, display_order, seq)
VALUES
  ('USD/MXN', 'US Dollar / Mexican Peso',          'USD','MXN', 0.0001, 0.003,   17.1200, 17.1230, 'autopilot', true, 103, 0),
  ('USD/SGD', 'US Dollar / Singapore Dollar',      'USD','SGD', 0.0001, 0.0003,   1.3420,  1.3423, 'autopilot', true, 104, 0),
  ('USD/HKD', 'US Dollar / Hong Kong Dollar',      'USD','HKD', 0.0001, 0.0002,   7.8120,  7.8122, 'autopilot', true, 105, 0),
  ('USD/NOK', 'US Dollar / Norwegian Krone',       'USD','NOK', 0.0001, 0.003,   10.8500, 10.8530, 'autopilot', true, 106, 0),
  ('USD/SEK', 'US Dollar / Swedish Krona',         'USD','SEK', 0.0001, 0.003,   10.4200, 10.4230, 'autopilot', true, 107, 0),
  ('USD/DKK', 'US Dollar / Danish Krone',          'USD','DKK', 0.0001, 0.001,    6.8900,  6.8910, 'autopilot', true, 108, 0),
  ('USD/PLN', 'US Dollar / Polish Zloty',          'USD','PLN', 0.0001, 0.002,    3.9800,  3.9820, 'autopilot', true, 109, 0),
  ('USD/CZK', 'US Dollar / Czech Koruna',          'USD','CZK', 0.01,   0.02,   22.5600, 22.5620, 'autopilot', true, 110, 0),
  ('EUR/TRY', 'Euro / Turkish Lira',              'EUR','TRY', 0.0001, 0.008,   34.8200, 34.8280, 'autopilot', true, 111, 0),
  ('EUR/ZAR', 'Euro / South African Rand',        'EUR','ZAR', 0.0001, 0.005,   19.7500, 19.7550, 'autopilot', true, 112, 0),
  ('EUR/PLN', 'Euro / Polish Zloty',              'EUR','PLN', 0.0001, 0.003,    4.3100,  4.3130, 'autopilot', true, 113, 0),
  ('EUR/NOK', 'Euro / Norwegian Krone',           'EUR','NOK', 0.0001, 0.004,   11.7600, 11.7640, 'autopilot', true, 114, 0),
  ('EUR/SEK', 'Euro / Swedish Krona',             'EUR','SEK', 0.0001, 0.004,   11.2900, 11.2940, 'autopilot', true, 115, 0),
  ('GBP/ZAR', 'British Pound / SA Rand',          'GBP','ZAR', 0.0001, 0.006,   23.1200, 23.1260, 'autopilot', true, 116, 0),
  ('AUD/SGD', 'Australian Dollar / Singapore $',   'AUD','SGD', 0.0001, 0.0004,   0.8760,  0.8764, 'autopilot', true, 117, 0),
  ('USD/THB', 'US Dollar / Thai Baht',             'USD','THB', 0.01,   0.02,   34.2500, 34.2520, 'autopilot', true, 118, 0),
  ('USD/INR', 'US Dollar / Indian Rupee',          'USD','INR', 0.01,   0.02,   83.4500, 83.4520, 'autopilot', true, 119, 0),
  ('USD/CNH', 'US Dollar / Chinese Yuan Offshore', 'USD','CNH', 0.0001, 0.001,    7.2450,  7.2460, 'autopilot', true, 120, 0)
ON CONFLICT (symbol) DO NOTHING;

-- Update any existing pairs stuck in 'manual' mode to 'autopilot' so cron ticks them
UPDATE public.demo_fx_pairs
SET mode = 'autopilot'
WHERE mode = 'manual' AND active_session_id IS NULL AND is_active = true;

-- Report
SELECT symbol, name, current_bid, current_ask, mode, is_active
FROM public.demo_fx_pairs
WHERE is_active = true
ORDER BY display_order;
