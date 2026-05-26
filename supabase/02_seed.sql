-- =====================================================================
-- SWIFT TRADE — SEED DATA
-- Run AFTER schema.sql in Supabase SQL Editor.
-- =====================================================================

-- SwiftBridge supported countries (ordered for HK-headquartered, Asia-first)
insert into public.bridge_countries (code, name, currency, currency_symbol, flag_emoji, min_local, max_local, display_order) values
  ('HK','Hong Kong',         'HKD','HK$','🇭🇰',    100,    1000000,  1),
  ('SG','Singapore',         'SGD','S$', '🇸🇬',    100,    1000000,  2),
  ('JP','Japan',             'JPY','¥',  '🇯🇵',  10000,  100000000,  3),
  ('KR','South Korea',       'KRW','₩',  '🇰🇷', 100000, 1000000000,  4),
  ('CN','China',             'CNY','¥',  '🇨🇳',    500,    5000000,  5),
  ('TW','Taiwan',            'TWD','NT$','🇹🇼',   1000,   10000000,  6),
  ('IN','India',             'INR','₹',  '🇮🇳',   1000,   10000000,  7),
  ('PH','Philippines',       'PHP','₱',  '🇵🇭',   1000,   10000000,  8),
  ('ID','Indonesia',         'IDR','Rp', '🇮🇩', 200000, 1000000000,  9),
  ('TH','Thailand',          'THB','฿',  '🇹🇭',   1000,   10000000, 10),
  ('VN','Vietnam',           'VND','₫',  '🇻🇳', 500000, 5000000000, 11),
  ('MY','Malaysia',          'MYR','RM', '🇲🇾',    300,    3000000, 12),
  ('PK','Pakistan',          'PKR','₨',  '🇵🇰',   5000,   50000000, 13),
  ('AE','United Arab Emirates','AED','د.إ','🇦🇪',  100,    1000000, 14),
  ('AU','Australia',         'AUD','A$', '🇦🇺',    100,    1000000, 15),
  ('NZ','New Zealand',       'NZD','NZ$','🇳🇿',    100,    1000000, 16),
  ('GB','United Kingdom',    'GBP','£',  '🇬🇧',     50,    1000000, 17),
  ('EU','Eurozone',          'EUR','€',  '🇪🇺',     50,    1000000, 18),
  ('CH','Switzerland',       'CHF','Fr', '🇨🇭',     50,    1000000, 19),
  ('US','United States',     'USD','$',  '🇺🇸',     50,    1000000, 20),
  ('CA','Canada',            'CAD','C$', '🇨🇦',     50,    1000000, 21),
  ('MX','Mexico',            'MXN','$',  '🇲🇽',    500,    5000000, 22),
  ('BR','Brazil',            'BRL','R$', '🇧🇷',    150,    2000000, 23),
  ('AR','Argentina',         'ARS','$',  '🇦🇷',  20000,  200000000, 24),
  ('CL','Chile',             'CLP','$',  '🇨🇱',  20000,  200000000, 25),
  ('TR','Turkey',            'TRY','₺',  '🇹🇷',    500,    5000000, 26),
  ('EG','Egypt',             'EGP','£',  '🇪🇬',    500,    5000000, 27),
  ('ZA','South Africa',      'ZAR','R',  '🇿🇦',    300,    5000000, 28),
  ('KE','Kenya',             'KES','KSh','🇰🇪',   2000,   20000000, 29),
  ('GH','Ghana',             'GHS','₵',  '🇬🇭',    200,    2000000, 30),
  ('NG','Nigeria',           'NGN','₦',  '🇳🇬',   5000,   50000000, 31)
on conflict (code) do nothing;

-- =====================================================================
-- Payment methods (deposit options for the user wallet page)
-- =====================================================================
insert into public.payment_methods (type, name, symbol, network, address, icon, min_amount, confirmations, active, display_order)
values
  ('crypto','Bitcoin','BTC','Bitcoin','bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh','₿', 50, 3, true, 1),
  ('crypto','Ethereum','ETH','ERC-20','0x742d35Cc6634C0532925a3b844Bc454e4438f44E','Ξ', 50, 12, true, 2),
  ('crypto','Tether (TRC-20)','USDT','TRC-20','TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9','₮', 20, 20, true, 3),
  ('crypto','Tether (ERC-20)','USDT','ERC-20','0x742d35Cc6634C0532925a3b844Bc454e4438f44E','₮', 20, 12, true, 4),
  ('crypto','USD Coin','USDC','ERC-20','0x742d35Cc6634C0532925a3b844Bc454e4438f44E','◎', 20, 12, true, 5),
  ('crypto','BNB','BNB','BEP-20','bnb1qm5y2jq2vwz0e9sa30dq2s8q4zk5x9hcfu7w3y','B', 50, 15, true, 6),
  ('crypto','Solana','SOL','Solana','7VWDKmDPbHqHE3hVqzqV8q8xQzKZf7aXWNK4qPbHsA1','◎', 50, 32, true, 7)
on conflict (symbol, network) do nothing;

-- =====================================================================
-- Platform wallets (admin-managed deposit destinations)
-- =====================================================================
insert into public.platform_wallets (asset, network, address, label, is_active)
values
  ('BTC','Bitcoin','bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh','Primary BTC',true),
  ('ETH','ERC-20','0x742d35Cc6634C0532925a3b844Bc454e4438f44E','Primary ETH',true),
  ('USDT','TRC-20','TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9','Primary USDT TRC-20',true),
  ('USDT','ERC-20','0x742d35Cc6634C0532925a3b844Bc454e4438f44E','Primary USDT ERC-20',true),
  ('USDC','ERC-20','0x742d35Cc6634C0532925a3b844Bc454e4438f44E','Primary USDC',true)
on conflict (asset, network, address) do nothing;

-- =====================================================================
-- Demo FX pairs (educational module)
-- =====================================================================
insert into public.demo_fx_pairs (symbol, base, quote, current_bid, current_ask, pip_size, is_active) values
  ('EUR/USD','EUR','USD',1.08315,1.08325,0.0001,true),
  ('GBP/USD','GBP','USD',1.26405,1.26415,0.0001,true),
  ('USD/JPY','USD','JPY',154.205,154.215,0.01,true),
  ('USD/HKD','USD','HKD',7.81075,7.81085,0.0001,true),
  ('USD/CNY','USD','CNY',7.24175,7.24185,0.0001,true),
  ('AUD/USD','AUD','USD',0.65920,0.65930,0.0001,true),
  ('USD/CAD','USD','CAD',1.36285,1.36295,0.0001,true),
  ('NZD/USD','NZD','USD',0.59815,0.59825,0.0001,true),
  ('XAU/USD','XAU','USD',2328.05,2328.15,0.01,true)
on conflict (symbol) do nothing;

-- =====================================================================
-- Default platform settings
-- =====================================================================
insert into public.platform_settings (key, value, description) values
  ('signup_bonus_amount',  '10',                         'USD credited on signup'),
  ('referral_bonus',       '25',                         'USD credited on successful referral'),
  ('min_deposit_usd',      '50',                         'Minimum deposit'),
  ('min_withdrawal_usd',   '50',                         'Minimum withdrawal'),
  ('withdrawal_fee_pct',   '2',                          'Default withdrawal fee percentage'),
  ('bridge_fee_pct',       '1.5',                        'SwiftBridge service fee'),
  ('site_name',            '"Swift Trade"',              'Site brand'),
  ('hq_location',          '"Hong Kong"',                'HQ city'),
  ('support_email',        '"support@swifttrade.io"',    'Support inbox'),
  ('admin_notification_email','"ops@swifttrade.io"',     'Inbox for ops alerts')
on conflict (key) do update set value = excluded.value, updated_at = now();
