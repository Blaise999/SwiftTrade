-- =====================================================================
-- SWIFT TRADE — SEED DATA
-- Run AFTER schema.sql in Supabase SQL Editor.
-- =====================================================================

insert into public.bridge_countries (code, name, currency, currency_symbol, flag_emoji, min_local, max_local, display_order) values
  ('NG','Nigeria',         'NGN','₦','🇳🇬',   5000,    50000000, 1),
  ('GH','Ghana',           'GHS','₵','🇬🇭',    200,     2000000, 2),
  ('KE','Kenya',           'KES','KSh','🇰🇪', 2000,    20000000, 3),
  ('ZA','South Africa',    'ZAR','R','🇿🇦',    300,     5000000, 4),
  ('UG','Uganda',          'UGX','USh','🇺🇬',10000,   100000000, 5),
  ('TZ','Tanzania',        'TZS','TSh','🇹🇿',10000,   100000000, 6),
  ('IN','India',           'INR','₹','🇮🇳',   1000,    10000000, 7),
  ('PH','Philippines',     'PHP','₱','🇵🇭',   1000,    10000000, 8),
  ('ID','Indonesia',       'IDR','Rp','🇮🇩',200000, 1000000000, 9),
  ('PK','Pakistan',        'PKR','₨','🇵🇰',   5000,    50000000,10),
  ('EG','Egypt',           'EGP','£','🇪🇬',    500,     5000000,11),
  ('MX','Mexico',          'MXN','$','🇲🇽',    500,     5000000,12),
  ('BR','Brazil',          'BRL','R$','🇧🇷',   150,     2000000,13),
  ('AR','Argentina',       'ARS','$','🇦🇷',  20000,   200000000,14),
  ('TR','Turkey',          'TRY','₺','🇹🇷',    500,     5000000,15),
  ('VN','Vietnam',         'VND','₫','🇻🇳', 500000, 5000000000,16),
  ('TH','Thailand',        'THB','฿','🇹🇭',   1000,    10000000,17),
  ('AE','United Arab Emirates','AED','د.إ','🇦🇪',100, 1000000,18),
  ('GB','United Kingdom',  'GBP','£','🇬🇧',     50,     1000000,19),
  ('EU','Eurozone',        'EUR','€','🇪🇺',     50,     1000000,20),
  ('US','United States',   'USD','$','🇺🇸',     50,     1000000,21),
  ('CA','Canada',          'CAD','$','🇨🇦',     50,     1000000,22)
on conflict (code) do nothing;
